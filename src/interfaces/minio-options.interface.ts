export interface IMinioModuleOptions {
  endPoint: string;
  port: number;
  useSSL: boolean;
  accessKey: string;
  secretKey: string;
  region?: string;
  externalEndPoint?: string;
  externalUseSSL?: boolean;
  urlExpiryHours: number;
  buckets: {
    private: string[];
    public: string[];
  };
}

export interface IMinioModuleAsyncOptions {
  useFactory: (...args: any[]) => Promise<IMinioModuleOptions> | IMinioModuleOptions;
  inject?: any[];
}
