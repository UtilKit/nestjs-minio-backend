import { applyDecorators } from '@nestjs/common';
import { ApiProperty } from '@nestjs/swagger';
import { IsOptional } from 'class-validator';

export interface FileFieldOptions {
  bucketName: string;
  required?: boolean;
  description?: string;
}

export function FileField(options: FileFieldOptions): PropertyDecorator {
  const { bucketName, required = false, description = 'File upload field' } = options;

  // Store metadata on the property
  return applyDecorators(
    ApiProperty({
      type: 'string',
      format: 'binary',
      description,
      required,
    }),
    IsOptional(),
    Reflect.metadata('fileField', { bucketName, required }),
  );
}
