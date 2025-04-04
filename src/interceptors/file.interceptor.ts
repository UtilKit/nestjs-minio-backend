import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  BadRequestException,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { MinioService } from '../minio.service';
import { map } from 'rxjs/operators';

@Injectable()
export class MinioFileInterceptor implements NestInterceptor {
  constructor(private readonly minioService: MinioService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const files = request.files || {};

    // Get the handler (controller method)
    const handler = context.getHandler();

    // Get file field config directly from the handler
    const fileFieldsConfig = Reflect.getMetadata('fileField', handler) || [];

    // Initialize a promise for processing files
    let fileProcessingPromise = Promise.resolve({});

    // Process each uploaded file
    for (const fieldConfig of fileFieldsConfig) {
      const fieldName = fieldConfig.name;
      const fieldFiles = files[fieldName];

      if (fieldFiles && fieldFiles.length > 0) {
        const file = fieldFiles[0];
        const bucketName = fieldConfig.bucketName;

        if (!bucketName) {
          throw new Error(`Bucket name is required for file field ${fieldName}`);
        }

        // Chain promises for sequential processing
        fileProcessingPromise = fileProcessingPromise.then(async (processedData) => {
          try {
            this.validateFile(file, fieldConfig);
            const fileUrl = await this.minioService.uploadFile(file, bucketName);
            return { ...processedData, [fieldName]: fileUrl };
          } catch (error) {
            if (error instanceof BadRequestException) {
              throw error;
            }
            if (fieldConfig.required) {
              throw new Error(`Failed to upload required file for ${fieldName}`);
            }
            return processedData;
          }
        });
      } else if (fieldConfig.required) {
        throw new Error(`Required file ${fieldName} is missing`);
      }
    }

    // Return an Observable that properly chains the file processing and controller execution
    return new Observable((subscriber) => {
      fileProcessingPromise
        .then((processedFiles) => {
          request.body = {
            ...request.body,
            ...processedFiles,
          };

          // Subscribe to the controller's response and transform URLs
          return next
            .handle()
            .pipe(
              map(async (data) => {
                // Handle array responses
                if (Array.isArray(data)) {
                  return Promise.all(data.map((item) => this.transformUrls(item)));
                }
                // Handle single object responses
                return this.transformUrls(data);
              }),
            )
            .subscribe(subscriber);
        })
        .catch((error) => {
          subscriber.error(error);
        });
    });
  }

  private async transformUrls(data: any): Promise<any> {
    if (!data) return data;

    // // If it's a plain object (not a mongoose document), process it directly
    const obj = data.toJSON ? await data.toJSON() : data;

    // Transform all fields that look like Minio paths (bucket-name/path)
    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'string' && value.includes('/')) {
        const [bucketName, ...pathParts] = value.split('/');
        if (pathParts.length > 0) {
          try {
            obj[key] = await this.minioService.getPresignedUrl(bucketName, pathParts.join('/'));
          } catch (error) {
            console.error(`Error generating presigned URL for ${key}:`, error);
          }
        }
      }
    }

    return obj;
  }

  private validateFile(file: any, config: any) {
    // Get validation metadata from both decorators
    const validationConfig = {
      allowedMimeTypes: config.allowedMimeTypes || [],
      maxSize: config.maxSize,
      required: config.required,
    };

    // Validate file size if maxSize is specified
    if (validationConfig.maxSize && file.size > validationConfig.maxSize) {
      throw new BadRequestException(
        `File ${file.originalname} exceeds maximum size of ${validationConfig.maxSize / 1024 / 1024}MB`,
      );
    }

    // Validate mime type if allowedMimeTypes is specified
    if (validationConfig.allowedMimeTypes.length > 0) {
      // Normalize the received mimetype to lowercase for comparison
      const normalizedMimetype = file.mimetype.toLowerCase();
      const normalizedAllowedTypes = validationConfig.allowedMimeTypes.map((type) =>
        type.toLowerCase(),
      );

      if (!normalizedAllowedTypes.includes(normalizedMimetype)) {
        throw new BadRequestException(
          `File ${file.originalname} has invalid type. Received: ${file.mimetype}, Allowed types: ${validationConfig.allowedMimeTypes.join(
            ', ',
          )}`,
        );
      }
    }
  }
}
