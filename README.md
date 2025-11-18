# NestJS MinIO Backend

[![NPM Version][npm-image]][npm-url]
[![Downloads Stats][npm-downloads]][npm-url]
[![License][license-image]][license-url]
[![TypeScript][typescript-image]][typescript-url]
[![NestJS][nestjs-image]][nestjs-url]
[![MinIO][minio-image]][minio-url]

A powerful and flexible NestJS module for integrating MinIO object storage into your NestJS applications. This package provides a seamless way to interact with MinIO, an open-source object storage service compatible with Amazon S3.

## Table of Contents
- [Features](#features)
- [Installation](#installation)
- [Requirements](#requirements)
- [Quick Start](#quick-start-using-decorators)
- [Configuration](#configuration)
- [API Reference](#api-reference)
- [Contributing](#contributing)
- [License](#license)
- [Support](#support)

## Features

- 🚀 Easy integration with NestJS applications
- 🎯 Powerful decorators for blazing-fast implementation
  - `@FileUpload()` - Handles multiple file uploads with built-in validation
  - `@FileField()` - Swagger-ready DTO field decorator
  - `@FileSchemaField()` - Mongoose schema integration for file fields
- 🗃️ `@FileColumn()` decorator for TypeORM or any class-based model
- 📁 Complete MinIO operations support (upload, download, delete, etc.)
- 🔧 Configurable module options
- 🎯 TypeScript support
- 📝 Swagger documentation support
- 🔄 RxJS integration
- 🧩 Optional `@nestjs/mongoose` integration (only required if you use `@FileSchemaField`)
- 🤖 Automatic presigned URL detection even for raw QueryBuilder results

## Installation

```bash
npm install nestjs-minio-backend
```

## Requirements

- Node.js >= 20.15.0
- NestJS >= 11.0.0
- MinIO Server (running instance)

## Peer Dependencies

This module requires the following peer dependencies:

```json
{
  "@nestjs/common": "^11.0.12",
  "@nestjs/core": "^11.0.12",
  "minio": "^8.0.5",
  "rxjs": "^7.8.2",
  "@nestjs/mongoose": "^11.0.2",
  "@nestjs/platform-express": "^11.0.12",
  "@nestjs/swagger": "^11.0.7",
  "class-validator": "^0.14.1"
}
```

## Quick Start (Using Decorators)

1. First, set up your MinIO configuration:

Create a `config/minio.config.ts` file:
```typescript
import { registerAs } from '@nestjs/config';

export default registerAs('minio', () => ({
  endPoint: process.env.MINIO_ENDPOINT || 'localhost:9000', // Format: "host" or "host:port"
  externalEndPoint:
    process.env.MINIO_EXTERNAL_ENDPOINT ||
    process.env.MINIO_ENDPOINT ||
    'localhost:9000', // Format: "host" or "host:port"
  useSSL: process.env.MINIO_USE_HTTPS === 'true',
  externalUseSSL: process.env.MINIO_EXTERNAL_ENDPOINT_USE_HTTPS === 'true',
  accessKey: process.env.MINIO_ACCESS_KEY || 'minioadmin',
  secretKey: process.env.MINIO_SECRET_KEY || 'minioadmin',
  urlExpiryHours: parseInt(process.env.MINIO_URL_EXPIRY_HOURS || '2', 10),
  buckets: {
    private: [
      process.env.MINIO_MEDIA_FILES_BUCKET || 'media-files-bucket',
      process.env.MINIO_CHAIN_ICONS_BUCKET || 'chain-icons',
    ],
    public: [process.env.MINIO_STATIC_FILES_BUCKET || 'static-files-bucket'],
  },
  region: process.env.MINIO_REGION,
}));
```

Create a `.env` file in your project root:
```env
MINIO_ENDPOINT=minio:9000
MINIO_EXTERNAL_ENDPOINT=minio.example.com:9000
MINIO_USE_HTTPS=false
MINIO_ACCESS_KEY=your-access-key
MINIO_SECRET_KEY=your-secret-key
MINIO_MEDIA_FILES_BUCKET=media-files-bucket
MINIO_STATIC_FILES_BUCKET=static-files-bucket
MINIO_URL_EXPIRY_HOURS=2
```

Then, in your `app.module.ts`:
```typescript
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MinioModule } from 'nestjs-minio-backend';
import minioConfig from './config/minio.config';

@Module({
  imports: [
    ConfigModule.forRoot({
      load: [minioConfig],
    }),
    MinioModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => configService.get('minio'),
    }),
  ],
})
export class AppModule {}
```

This configuration approach provides:
- 🔐 Environment-based configuration
- 🎯 Type-safe configuration using TypeScript
- 🔄 Default values for local development
- 📁 Organized bucket management
- 🌐 Support for different endpoints (internal/external)

2. Create your DTO with file field:

```typescript
import { FileField } from 'nestjs-minio-backend';

export class CreateUserDto {
  @FileField({
    bucketName: 'profiles',
    required: true,
    description: 'User profile picture'
  })
  profilePicture: Express.Multer.File;
}
```

3. Use the FileUpload decorator in your controller:

```typescript
import { FileUpload } from 'nestjs-minio-backend';
import { CreateUserDto } from './dto/create-user.dto';

@Controller('users')
export class UserController {
  @Post()
  @FileUpload([
    { name: 'profilePicture', bucketName: 'profiles', required: true }
  ])
  async createUser(@Body() createUserDto: CreateUserDto) {
    // The file is automatically uploaded to MinIO
    // You can access the file URL from the DTO
    return createUserDto;
  }

  @Post('multiple')
  @FileUpload([
    { name: 'documents', bucketName: 'docs', maxCount: 3 }
  ])
  async uploadMultiple(@UploadedFiles() files: Array<Express.Multer.File>) {
    return files; // Files are automatically uploaded to MinIO
  }
}
```

4. (Optional) Add file fields to your persistence models:

### TypeORM example

```typescript
import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';
import { FileColumn } from 'nestjs-minio-backend';

@Entity()
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @FileColumn({ bucketName: 'profiles' })
  @Column({ nullable: true })
  avatar?: string; // Stores the MinIO object path (bucket/objectName)
}
```

### Mongoose example

```typescript
import { FileSchemaField } from 'nestjs-minio-backend';

@Schema()
export class User {
  @FileSchemaField({
    bucketName: 'profiles',
    required: true
  })
  avatar: string; // Automatically stores the MinIO object URL
}
```

These decorators provide:
- 🚀 Zero-configuration file uploads
- 📝 Automatic Swagger documentation
- ✅ Built-in validation
- 🔄 Seamless MongoDB integration
- 🤖 Automatic presigned URL generation even for raw QueryBuilder objects (bucket names are auto-detected from your MinIO config)
- 🎯 Type safety with TypeScript
- 🧩 Optional Mongoose dependency (install `@nestjs/mongoose` only if you plan to use `@FileSchemaField`)

## Configuration

The module accepts the following configuration options:

```typescript
interface IMinioModuleOptions {
  // Required options
  endPoint: string;          // MinIO server endpoint (format: "host" or "host:port", e.g., "minio:9000")
  useSSL: boolean;          // Whether to use SSL for connection
  accessKey: string;        // MinIO access key
  secretKey: string;        // MinIO secret key
  urlExpiryHours: number;   // Expiry time for signed URLs in hours

  // Optional options
  region?: string;          // MinIO region
  externalEndPoint?: string; // External endpoint for public access (format: "host" or "host:port")
  externalUseSSL?: boolean; // Whether to use SSL for external endpoint

  // Bucket configuration
  buckets: {
    private: string[];      // Array of private bucket names
    public: string[];       // Array of public bucket names
  };
}
```

### Configuration Example

```typescript
const minioConfig: IMinioModuleOptions = {
  endPoint: 'minio.example.com:9000', // Port included in endpoint
  useSSL: false,
  accessKey: 'your-access-key',
  secretKey: 'your-secret-key',
  urlExpiryHours: 2,
  
  // Optional settings
  region: 'us-east-1',
  externalEndPoint: 'public.minio.example.com:9000', // Port included in endpoint
  externalUseSSL: true,
  
  // Bucket configuration
  buckets: {
    private: [
      'media-files-bucket',
      'user-uploads'
    ],
    public: [
      'static-files-bucket',
      'public-assets'
    ]
  }
};
```

### Environment Variables Example

```env
# Required settings
MINIO_ENDPOINT=minio:9000
MINIO_USE_HTTPS=false
MINIO_ACCESS_KEY=your-access-key
MINIO_SECRET_KEY=your-secret-key
MINIO_URL_EXPIRY_HOURS=2

# Optional settings
MINIO_REGION=us-east-1
MINIO_EXTERNAL_ENDPOINT=minio.example.com:9000
MINIO_EXTERNAL_ENDPOINT_USE_HTTPS=true

# Bucket configuration
MINIO_MEDIA_FILES_BUCKET=media-files-bucket
MINIO_STATIC_FILES_BUCKET=static-files-bucket
```

### Key Features of the Configuration

- 🔐 **Dual Endpoint Support**: Configure both internal and external endpoints for flexible access
- 🌐 **SSL Configuration**: Separate SSL settings for internal and external endpoints
- ⏱️ **URL Expiry**: Configure signed URL expiration time
- 📁 **Bucket Organization**: Separate configuration for private and public buckets
- 🔄 **Default Values**: Sensible defaults for local development
- 🛡️ **Type Safety**: Full TypeScript support with interface definitions

## Manual Implementation (Without Decorators)

If you prefer more control over the file handling process, you can use the MinioService directly:

```typescript
import { MinioService } from 'nestjs-minio-backend';

@Injectable()
export class YourService {
  constructor(private readonly minioService: MinioService) {}

  async uploadFile(file: Express.Multer.File) {
    const bucketName = 'your-bucket';
    const objectName = `${Date.now()}-${file.originalname}`;
    
    await this.minioService.upload(bucketName, objectName, file.buffer);
    return { objectName };
  }
}
```

### Manual File Upload Example

```typescript
@Post('upload')
@UseInterceptors(FileInterceptor('file'))
async uploadFile(@UploadedFile() file: Express.Multer.File) {
  const bucketName = 'my-bucket';
  const objectName = `${Date.now()}-${file.originalname}`;
  
  await this.minioService.upload(bucketName, objectName, file.buffer);
  
  return {
    message: 'File uploaded successfully',
    objectName,
  };
}
```

### Manual File Download Example

```typescript
@Get('download/:objectName')
async downloadFile(@Param('objectName') objectName: string, @Res() res: Response) {
  const bucketName = 'my-bucket';
  const fileBuffer = await this.minioService.download(bucketName, objectName);
  
  res.send(fileBuffer);
}
```

## API Reference

### Decorators

#### @FileUpload()
Handles file uploads with automatic MinIO integration.

```typescript
@FileUpload([
  { 
    name: string,           // Field name in the request
    bucketName: string,     // MinIO bucket name
    required?: boolean,     // Whether the file is required
    maxCount?: number,      // Maximum number of files
    maxSize?: number,       // Maximum file size in bytes
    mimeTypes?: string[]    // Allowed MIME types
  }
])
```

#### @FileField()
Swagger-ready DTO field decorator for file uploads.

```typescript
@FileField({
  bucketName: string,       // MinIO bucket name
  required?: boolean,       // Whether the field is required
  description?: string      // Swagger description
})
```

#### @FileSchemaField()
Mongoose schema integration for file fields (wraps `@Prop` plus `@FileColumn` metadata).

```typescript
@FileSchemaField({
  bucketName: string,       // MinIO bucket name
  required?: boolean        // Whether the field is required
})
```

#### @FileColumn()
Database-agnostic decorator for marking entity properties that store MinIO object references. Works with TypeORM, Mongoose, or any class-based model.

```typescript
@FileColumn({
  bucketName?: string        // Optionally enforce a specific bucket
})
```

## Contributing

1. Fork it ([https://github.com/UtilKit/nestjs-minio-backend/fork](https://github.com/UtilKit/nestjs-minio-backend/fork))
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -am 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Create a new Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Author

Mishhub

## Support

- 📫 [GitHub Issues](https://github.com/UtilKit/nestjs-minio-backend/issues)
- 💬 [Discord Community](https://discord.gg/your-community)
- 📧 Email: support@example.com

[npm-image]: https://img.shields.io/npm/v/nestjs-minio-backend.svg?style=flat-square
[npm-url]: https://npmjs.org/package/nestjs-minio-backend
[npm-downloads]: https://img.shields.io/npm/dm/nestjs-minio-backend.svg?style=flat-square
[license-image]: https://img.shields.io/npm/l/nestjs-minio-backend.svg?style=flat-square
[license-url]: LICENSE
[typescript-image]: https://img.shields.io/badge/TypeScript-Ready-blue.svg?style=flat-square
[typescript-url]: https://www.typescriptlang.org/
[nestjs-image]: https://img.shields.io/badge/NestJS-Compatible-red.svg?style=flat-square
[nestjs-url]: https://nestjs.com/
[minio-image]: https://img.shields.io/badge/MinIO-Compatible-green.svg?style=flat-square
[minio-url]: https://min.io/ 