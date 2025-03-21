import { DynamicModule, Global, Module } from '@nestjs/common';
import { MINIO_CONFIG } from './constants';
import {
  IMinioModuleAsyncOptions,
  IMinioModuleOptions,
} from './interfaces/minio-options.interface';
import { MinioService } from './minio.service';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { FileUrlTransformInterceptor } from './interceptors/file-url-transform.interceptor';

@Global()
@Module({})
export class MinioModule {
  static forRoot(options: IMinioModuleOptions): DynamicModule {
    return {
      module: MinioModule,
      providers: [
        {
          provide: MINIO_CONFIG,
          useValue: options,
        },
        MinioService,
        {
          provide: APP_INTERCEPTOR,
          useClass: FileUrlTransformInterceptor,
        },
      ],
      exports: [MinioService, MINIO_CONFIG],
    };
  }

  static forRootAsync(options: IMinioModuleAsyncOptions): DynamicModule {
    return {
      module: MinioModule,
      providers: [
        {
          provide: MINIO_CONFIG,
          useFactory: options.useFactory,
          inject: options.inject || [],
        },
        MinioService,
        {
          provide: APP_INTERCEPTOR,
          useClass: FileUrlTransformInterceptor,
        },
      ],
      exports: [MinioService, MINIO_CONFIG],
    };
  }
}
