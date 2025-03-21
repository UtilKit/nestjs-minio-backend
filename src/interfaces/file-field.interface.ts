export interface FileFieldConfig {
  name: string;
  bucketName?: string;
  required?: boolean;
  maxCount?: number;
  allowedMimeTypes?: string[];
  maxSize?: number; // in bytes
}
