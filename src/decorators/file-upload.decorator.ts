import { applyDecorators, UseInterceptors } from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { ApiConsumes } from '@nestjs/swagger';
import { FileFieldConfig } from '../interfaces/file-field.interface';
import { MinioFileInterceptor } from '../interceptors/file.interceptor';

export function FileUpload(fileFields: FileFieldConfig[]): PropertyDecorator {
  // Store configurations in a custom property for later use
  const multerFields = fileFields.map((field) => ({
    name: field.name,
    maxCount: field.maxCount || 1,
    bucketName: field.bucketName,
  }));

  // Create decorator that applies both interceptors and stores metadata
  return applyDecorators(
    // Set metadata on the method
    (target: object, key: string, descriptor: PropertyDescriptor) => {
      // Store the file field configurations directly on the method
      Reflect.defineMetadata('fileField', fileFields, descriptor.value);
      return descriptor;
    },
    // Apply Multer interceptor
    UseInterceptors(FileFieldsInterceptor(multerFields), MinioFileInterceptor),
    // Swagger decorators for documentation
    ApiConsumes('multipart/form-data'),
  );
}
