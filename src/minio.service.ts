import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import * as crypto from 'crypto';
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

  // =======================================================================
  // Bucket Initialization
  // =======================================================================

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

  // =======================================================================
  // AWS Signature V4 Helper Methods
  // =======================================================================

  private sha256(data: string): string {
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  private hmacSha256(key: Buffer | string, data: string): Buffer {
    return crypto.createHmac('sha256', key).update(data).digest();
  }

  private getSigningKey(
    secretKey: string,
    dateStamp: string,
    region: string,
    serviceName: string = 's3',
  ): Buffer {
    const kSecret = 'AWS4' + secretKey;
    const kDate = this.hmacSha256(kSecret, dateStamp);
    const kRegion = this.hmacSha256(kDate, region);
    const kService = this.hmacSha256(kRegion, serviceName);
    const kSigning = this.hmacSha256(kService, 'aws4_request');
    return kSigning;
  }

  // Get date in YYYYMMDDTHHMMSSZ format
  private getAmzDate(date: Date): string {
    return date.toISOString().replace(/[:-]|\.\d{3}/g, '');
  }

  // Get date in YYYYMMDD format
  private getDateStamp(date: Date): string {
    return date.toISOString().slice(0, 10).replace(/-/g, '');
  }

  // =======================================================================
  // Manual Presigned URL Calculation
  // =======================================================================

  private async calculatePresignedGetUrl(
    endPoint: string,
    bucketName: string,
    objectName: string,
    expirySeconds: number,
  ): Promise<string> {
    const accessKey = this.config.accessKey;
    const secretKey = this.config.secretKey;
    const region = this.config.region || 'us-east-1';
    const externalHost = endPoint;
    const port = this.config.port;

    // Use host without port for signing
    const signingHost = port ? `${externalHost}:${port}` : externalHost;

    const currentDate = new Date();
    const amzDate = this.getAmzDate(currentDate);
    const dateStamp = this.getDateStamp(currentDate);
    const credentialScope = `${dateStamp}/${region}/s3/aws4_request`;

    // Create canonical URI - don't encode forward slashes in object name
    const canonicalURI =
      '/' +
      encodeURIComponent(bucketName) +
      '/' +
      objectName
        .split('/')
        .map((segment) => encodeURIComponent(segment))
        .join('/');

    // Create query parameters in specific order
    const params = {
      'X-Amz-Algorithm': 'AWS4-HMAC-SHA256',
      'X-Amz-Credential': `${accessKey}/${credentialScope}`,
      'X-Amz-Date': amzDate,
      'X-Amz-Expires': expirySeconds.toString(),
      'X-Amz-SignedHeaders': 'host',
    };

    // Build canonical query string maintaining strict ordering
    const canonicalQueryString = Object.keys(params)
      .sort()
      .map((key) => {
        return `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`;
      })
      .join('&');

    // Create canonical headers
    const canonicalHeaders = `host:${signingHost.toLowerCase()}\n`;

    // Create canonical request
    const canonicalRequest = [
      'GET',
      canonicalURI,
      canonicalQueryString,
      canonicalHeaders,
      'host', // signed headers
      'UNSIGNED-PAYLOAD', // Changed from empty string hash
    ].join('\n');

    // Create string to sign
    const stringToSign = [
      'AWS4-HMAC-SHA256',
      amzDate,
      credentialScope,
      this.sha256(canonicalRequest),
    ].join('\n');

    // Calculate signature
    const signingKey = this.getSigningKey(secretKey, dateStamp, region);
    const signature = this.hmacSha256(signingKey, stringToSign).toString('hex');

    // Construct final URL
    const protocol = (this.config.externalUseSSL ?? this.config.useSSL) ? 'https' : 'http';
    const finalUrl = `${protocol}://${signingHost}${canonicalURI}?${canonicalQueryString}&X-Amz-Signature=${signature}`;

    return finalUrl;
  }

  async uploadFile(file: IFileUpload, bucketName: string, objectName?: string): Promise<string> {
    if (!this.bucketInitialized) {
      await this.initializeBuckets();
    }

    const fileName = objectName || `${Date.now()}-${file.originalname.replace(/\s/g, '-')}`;
    await this.minioClient.putObject(bucketName, fileName, file.buffer, file.size, {
      'Content-Type': file.mimetype,
    });

    return `${bucketName}/${fileName}`;
  }

  async getPresignedUrl(bucketName: string, objectName: string): Promise<string> {
    if (!this.config.buckets.private.includes(bucketName)) {
      const endpoint = this.config.externalEndPoint || this.config.endPoint;
      const protocol = (this.config.externalUseSSL ?? this.config.useSSL) ? 'https' : 'http';
      return `${protocol}://${endpoint}${
        this.config.port ? `:${this.config.port}` : ''
      }/${bucketName}/${objectName}`;
    }

    return await this.calculatePresignedGetUrl(
      this.config.externalEndPoint || this.config.endPoint,
      bucketName,
      objectName,
      (this.config.urlExpiryHours || 1) * 60 * 60,
    );
  }

  async deleteFile(bucketName: string, objectName: string): Promise<void> {
    await this.minioClient.removeObject(bucketName, objectName);
  }

  getMinioClient(): Minio.Client {
    return this.minioClient;
  }
}
