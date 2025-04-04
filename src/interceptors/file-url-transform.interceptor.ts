import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Logger } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { MinioService } from '../minio.service';
import { Socket } from 'net';
import { IncomingMessage, ServerResponse } from 'http';

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
  private async transformUrls(data: any): Promise<any> {
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
      // Check if this field is decorated with FileSchemaField
      const isFileField = schema?.paths?.[key]?.options?.isFileField;

      if (isFileField && typeof value === 'string' && value.includes('/')) {
        const [bucketName, ...pathParts] = value.split('/');
        if (pathParts.length > 0) {
          try {
            obj[key] = await this.minioService.getPresignedUrl(bucketName, pathParts.join('/'));
          } catch (error) {
            this.logger.error(`Error generating presigned URL for ${key}:`, error);
          }
        }
      }
      // Handle nested objects recursively, but only if they're plain objects
      else if (
        value &&
        typeof value === 'object' &&
        !Array.isArray(value) &&
        Object.getPrototypeOf(value) === Object.prototype
      ) {
        obj[key] = await this.transformUrls(value);
      }
      // Handle arrays of objects recursively
      else if (Array.isArray(value)) {
        obj[key] = await Promise.all(
          value.map((item) =>
            typeof item === 'object' && item !== null ? this.transformUrls(item) : item,
          ),
        );
      }
    }

    return obj;
  }
}
