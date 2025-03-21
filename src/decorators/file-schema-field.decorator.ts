import { Prop, PropOptions } from '@nestjs/mongoose';

export type FileSchemaFieldOptions = PropOptions & {
  bucketName?: string;
};

export function FileSchemaField(options: FileSchemaFieldOptions = {}) {
  // Add a metadata marker to identify this as a file field
  const fileOptions = {
    ...(options as object),
    isFileField: true,
    bucketName: options.bucketName || 'media-files-bucket',
  };

  // Use the standard Prop decorator with our custom metadata
  return Prop(fileOptions);
}
