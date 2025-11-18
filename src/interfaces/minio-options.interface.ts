export interface IMinioModuleOptions {
  endPoint: string; // Format: "host" or "host:port" (e.g., "minio:9000")
  useSSL: boolean;
  accessKey: string;
  secretKey: string;
  region?: string;
  externalEndPoint?: string; // Format: "host" or "host:port" (e.g., "minio.example.com:9000")
  externalUseSSL?: boolean;
  urlExpiryHours: number;
  buckets: {
    private: string[];
    public: string[];
  };
}

export interface IMinioModuleAsyncOptions {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  useFactory: (...args: any[]) => Promise<IMinioModuleOptions> | IMinioModuleOptions;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  inject?: any[];
}
