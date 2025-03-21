import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { MinioService } from '../minio.service';

@Injectable()
export class FileUrlTransformInterceptor implements NestInterceptor {
  constructor(private readonly minioService: MinioService) {}

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

  private async transformUrls(data: any): Promise<any> {
    if (!data) return data;

    // If it's a mongoose document, convert to plain object
    const obj = data.toJSON ? data.toJSON() : data;

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
            console.error(`Error generating presigned URL for ${key}:`, error);
          }
        }
      }
      // Handle nested objects recursively
      else if (value && typeof value === 'object' && !Array.isArray(value)) {
        obj[key] = await this.transformUrls(value);
      }
      // Handle arrays of objects recursively
      else if (Array.isArray(value)) {
        obj[key] = await Promise.all(
          value.map((item) => (typeof item === 'object' ? this.transformUrls(item) : item)),
        );
      }
    }

    return obj;
  }
}
