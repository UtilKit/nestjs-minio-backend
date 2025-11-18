import { applyDecorators } from '@nestjs/common';
import { Prop, PropOptions } from '@nestjs/mongoose';
import { FileColumn, FileColumnOptions } from './file-column.decorator';

export type FileSchemaFieldOptions = PropOptions & FileColumnOptions;

export function FileSchemaField(options: FileSchemaFieldOptions = {}): PropertyDecorator {
  const fileOptions = {
    ...(options as object),
    isFileField: true,
    bucketName: options.bucketName || 'media-files-bucket',
  };

  return applyDecorators(FileColumn(options), Prop(fileOptions));
}
