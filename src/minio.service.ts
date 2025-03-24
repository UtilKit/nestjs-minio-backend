import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import * as Minio from 'minio';
import { MINIO_CONFIG } from './constants';
import { IFileUpload } from './interfaces/file.interface';
import { IMinioModuleOptions } from './interfaces/minio-options.interface';

@Injectable()
export class MinioService implements OnModuleInit {
  private minioClient: Minio.Client;
  private bucketInitialized = false;

  constructor(@Inject(MINIO_CONFIG) private readonly config: IMinioModuleOptions) {}

  async onModuleInit() {
    this.minioClient = new Minio.Client({
      endPoint: this.config.endPoint,
      port: this.config.port,
      useSSL: this.config.useSSL,
      accessKey: this.config.accessKey,
      secretKey: this.config.secretKey,
      region: this.config.region,
    });

    await this.initializeBuckets();
  }

  private async initializeBuckets() {
    if (this.bucketInitialized) return;

    // Initialize private buckets
    for (const bucket of this.config.buckets.private) {
      const exists = await this.minioClient.bucketExists(bucket);
      if (!exists) {
        await this.minioClient.makeBucket(bucket, this.config.region || 'us-east-1');
        // Set private policy
        await this.minioClient.setBucketPolicy(
          bucket,
          JSON.stringify({
            Version: '2012-10-17',
            Statement: [
              {
                Effect: 'Deny',
                Principal: { AWS: ['*'] },
                Action: ['s3:GetObject'],
                Resource: [`arn:aws:s3:::${bucket}/*`],
              },
            ],
          }),
        );
      }
    }

    // Initialize public buckets
    for (const bucket of this.config.buckets.public) {
      const exists = await this.minioClient.bucketExists(bucket);
      if (!exists) {
        await this.minioClient.makeBucket(bucket, this.config.region || 'us-east-1');
        // Set public read policy
        await this.minioClient.setBucketPolicy(
          bucket,
          JSON.stringify({
            Version: '2012-10-17',
            Statement: [
              {
                Effect: 'Allow',
                Principal: { AWS: ['*'] },
                Action: ['s3:GetObject'],
                Resource: [`arn:aws:s3:::${bucket}/*`],
              },
            ],
          }),
        );
      }
    }

    this.bucketInitialized = true;
  }

  async uploadFile(file: IFileUpload, bucketName: string, objectName?: string): Promise<string> {
    if (!this.bucketInitialized) {
      await this.initializeBuckets();
    }

    const fileName = objectName || `${Date.now()}-${file.originalname.replace(/\s/g, '-')}`;
    await this.minioClient.putObject(bucketName, fileName, file.buffer, file.size, {
      'Content-Type': file.mimetype,
    });

    // If public bucket, return direct URL
    if (this.config.buckets.public.includes(bucketName)) {
      const endpoint = this.config.externalEndPoint || this.config.endPoint;
      const protocol = (this.config.externalUseSSL ?? this.config.useSSL) ? 'https' : 'http';
      return `${protocol}://${endpoint}${
        this.config.port ? `:${this.config.port}` : ''
      }/${bucketName}/${fileName}`;
    } else {
      // For private buckets, return the path only
      return `${bucketName}/${fileName}`;
    }
  }

  async getPresignedUrl(bucketName: string, objectName: string): Promise<string> {
    if (!this.config.buckets.private.includes(bucketName)) {
      const endpoint = this.config.externalEndPoint || this.config.endPoint;
      const protocol = (this.config.externalUseSSL ?? this.config.useSSL) ? 'https' : 'http';
      return `${protocol}://${endpoint}${
        this.config.port ? `:${this.config.port}` : ''
      }/${bucketName}/${objectName}`;
    }

    // For private buckets, if external endpoint is configured, create a new client with it
    if (this.config.externalEndPoint) {
      const externalClient = new Minio.Client({
        endPoint: this.config.externalEndPoint,
        port: this.config.port,
        useSSL: this.config.externalUseSSL ?? this.config.useSSL,
        accessKey: this.config.accessKey,
        secretKey: this.config.secretKey,
        region: this.config.region,
      });

      return await externalClient.presignedGetObject(
        bucketName,
        objectName,
        this.config.urlExpiryHours * 60 * 60,
      );
    }

    // If no external endpoint, use the default client
    return await this.minioClient.presignedGetObject(
      bucketName,
      objectName,
      this.config.urlExpiryHours * 60 * 60,
    );
  }

  async deleteFile(bucketName: string, objectName: string): Promise<void> {
    await this.minioClient.removeObject(bucketName, objectName);
  }

  getMinioClient(): Minio.Client {
    return this.minioClient;
  }
}
