import { applyDecorators, UseInterceptors } from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { ApiConsumes } from '@nestjs/swagger';
import { MinioFileInterceptor } from '../interceptors/file.interceptor';

export interface FileFieldConfig {
  name: string;
  bucketName?: string;
  required?: boolean;
  maxCount?: number;
}

export function FileUpload(fileFields: FileFieldConfig[]) {
  // Store configurations in a custom property for later use
  const multerFields = fileFields.map((field) => ({
    name: field.name,
    maxCount: field.maxCount || 1,
  }));

  // Create decorator that applies both interceptors and stores metadata
  return applyDecorators(
    // Apply Multer interceptor
    UseInterceptors(FileFieldsInterceptor(multerFields), MinioFileInterceptor),
    // Set metadata on the method
    (target: any, key: string, descriptor: PropertyDescriptor) => {
      // Store the file field configurations directly on the method
      Reflect.defineMetadata('fileField', fileFields, descriptor.value);
      return descriptor;
    },
    // Swagger decorators for documentation
    ApiConsumes('multipart/form-data'),
  );
}
