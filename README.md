# NestJS MinIO Backend

A powerful and flexible NestJS module for integrating MinIO object storage into your NestJS applications. This package provides a seamless way to interact with MinIO, an open-source object storage service compatible with Amazon S3.

## Features

- 🚀 Easy integration with NestJS applications
- 🎯 Powerful decorators for blazing-fast implementation
  - `@FileUpload()` - Handles multiple file uploads with built-in validation
  - `@FileField()` - Swagger-ready DTO field decorator
  - `@FileSchemaField()` - Mongoose schema integration for file fields
- 📁 Complete MinIO operations support (upload, download, delete, etc.)
- 🔧 Configurable module options
- 🎯 TypeScript support
- 📝 Swagger documentation support
- 🔄 RxJS integration

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
  endPoint: process.env.MINIO_ENDPOINT || 'localhost',
  externalEndPoint:
    process.env.MINIO_EXTERNAL_ENDPOINT ||
    process.env.MINIO_ENDPOINT ||
    'localhost',
  port: parseInt(process.env.MINIO_PORT || '9000', 10),
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
MINIO_ENDPOINT=your-minio-endpoint
MINIO_PORT=9000
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

4. (Optional) Add file fields to your Mongoose schema:

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
- 🎯 Type safety with TypeScript

## Configuration

The module accepts the following configuration options:

```typescript
interface IMinioModuleOptions {
  // Required options
  endPoint: string;          // MinIO server endpoint
  port: number;             // MinIO server port
  useSSL: boolean;          // Whether to use SSL for connection
  accessKey: string;        // MinIO access key
  secretKey: string;        // MinIO secret key
  urlExpiryHours: number;   // Expiry time for signed URLs in hours

  // Optional options
  region?: string;          // MinIO region
  externalEndPoint?: string; // External endpoint for public access
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
  endPoint: 'minio.example.com',
  port: 9000,
  useSSL: false,
  accessKey: 'your-access-key',
  secretKey: 'your-secret-key',
  urlExpiryHours: 2,
  
  // Optional settings
  region: 'us-east-1',
  externalEndPoint: 'public.minio.example.com',
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
MINIO_ENDPOINT=minio.example.com
MINIO_PORT=9000
MINIO_USE_HTTPS=false
MINIO_ACCESS_KEY=your-access-key
MINIO_SECRET_KEY=your-secret-key
MINIO_URL_EXPIRY_HOURS=2

# Optional settings
MINIO_REGION=us-east-1
MINIO_EXTERNAL_ENDPOINT=public.minio.example.com
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

### MinioService Methods

- `upload(bucketName: string, objectName: string, file: Buffer): Promise<void>`
- `download(bucketName: string, objectName: string): Promise<Buffer>`
- `delete(bucketName: string, objectName: string): Promise<void>`
- `getSignedUrl(bucketName: string, objectName: string, expiryInSeconds: number): Promise<string>`
- And more...

For detailed API documentation, please refer to the source code and included TypeScript definitions.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Author

Mishhub

## Support

If you encounter any issues or have questions, please file an issue on the GitHub repository. 