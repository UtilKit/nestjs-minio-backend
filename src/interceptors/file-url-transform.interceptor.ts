import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Logger } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { MinioService } from '../minio.service';
import { Socket } from 'net';
import { IncomingMessage, ServerResponse } from 'http';
import { MINIO_FILE_FIELD_METADATA } from '../constants';

@Injectable()
export class FileUrlTransformInterceptor implements NestInterceptor {
  private readonly logger = new Logger(FileUrlTransformInterceptor.name);

  constructor(private readonly minioService: MinioService) {}

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      map(async (data) => {
        if (!data) return data;

        // Handle array responses
        if (Array.isArray(data)) {
          return Promise.all(data.map((item) => this.transformUrls(item)));
        }

        // Handle single object responses
        return this.transformUrls(data);
      }),
    );
  }

  /**
   * Transforms URLs in the given data to presigned URLs using the Minio service.
   * @param data - The data to transform.
   * @returns The transformed data with URLs replaced by presigned URLs.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private async transformUrls(data: any, visited = new WeakSet<object>()): Promise<any> {
    if (!data) return data;

    // Skip processing for Node.js internal objects (HTTP, Socket, etc.)
    if (
      data instanceof Socket ||
      data instanceof IncomingMessage ||
      data instanceof ServerResponse ||
      data.constructor?.name === 'HTTPParser'
    ) {
      return data;
    }

    if (typeof data === 'object' && data !== null) {
      if (visited.has(data)) {
        return data;
      }
      visited.add(data);
    }

    // If it's a mongoose document, convert to plain object
    const obj = data.toJSON ? data.toJSON() : data;

    // Skip processing non-object data
    if (typeof obj !== 'object' || obj === null) {
      return obj;
    }

    // Get the schema if it's a Mongoose document
    const schema = data.schema || (data.constructor && data.constructor.schema);

    // Process each property recursively
    for (const [key, value] of Object.entries(obj)) {
      // Check if this field is decorated with FileSchemaField or FileColumn
      const isFileField =
        schema?.paths?.[key]?.options?.isFileField ||
        this.hasFileFieldMetadata(data, key) ||
        this.hasFileFieldMetadata(obj, key);

      const inferredPath = !isFileField ? this.extractMinioPath(value) : null;

      if ((isFileField || inferredPath) && typeof value === 'string') {
        const split = inferredPath ?? this.splitBucketAndObject(value);
        if (split) {
          try {
            obj[key] = await this.minioService.getPresignedUrl(split.bucketName, split.objectName);
          } catch (error) {
            this.logger.error(`Error generating presigned URL for ${key}:`, error);
          }
        }
      }
      // Handle nested objects recursively, but only if they're plain objects
      else if (
        value &&
        typeof value === 'object' &&
        !Array.isArray(value)
      ) {
        obj[key] = await this.transformUrls(value, visited);
      }
      // Handle arrays of objects recursively
      else if (Array.isArray(value)) {
        obj[key] = await Promise.all(
          value.map((item) =>
            typeof item === 'object' && item !== null ? this.transformUrls(item, visited) : item,
          ),
        );
      }
    }

    return obj;
  }

  private hasFileFieldMetadata(target: unknown, propertyKey: string): boolean {
    if (!target) return false;

    const directMetadata = Reflect.getMetadata(MINIO_FILE_FIELD_METADATA, target, propertyKey);
    if (directMetadata) {
      return true;
    }

    const prototype = typeof target === 'object' ? Object.getPrototypeOf(target) : undefined;
    if (!prototype) {
      return false;
    }

    return Boolean(Reflect.getMetadata(MINIO_FILE_FIELD_METADATA, prototype, propertyKey));
  }

  private extractMinioPath(value: unknown): { bucketName: string; objectName: string } | null {
    if (typeof value !== 'string') {
      return null;
    }

    const split = this.splitBucketAndObject(value);
    return split;
  }

  private splitBucketAndObject(value: string): { bucketName: string; objectName: string } | null {
    if (!value.includes('/')) {
      return null;
    }
    const [bucketName, ...pathParts] = value.split('/');
    if (!bucketName || pathParts.length === 0) {
      return null;
    }
    return {
      bucketName,
      objectName: pathParts.join('/'),
    };
  }
}
