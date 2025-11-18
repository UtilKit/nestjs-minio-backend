import { applyDecorators } from '@nestjs/common';
import { MINIO_FILE_FIELD_METADATA } from '../constants';

export interface FileColumnOptions {
  bucketName?: string;
}

export function FileColumn(options: FileColumnOptions = {}): PropertyDecorator {
  return applyDecorators((target: object, propertyKey: string | symbol) => {
    Reflect.defineMetadata(
      MINIO_FILE_FIELD_METADATA,
      {
        bucketName: options.bucketName,
      },
      target,
      propertyKey,
    );
  });
}

