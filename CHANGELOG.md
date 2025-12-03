# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.0.0] - 2025-12-02

### ⚠️ Breaking Changes

- **File Path Format**: All file paths now use `minio://bucket-name/file-path` format instead of `bucket-name/file-path`
  - `uploadFile()` now returns `minio://bucket/file` format
  - Only strings starting with `minio://` are automatically transformed to presigned URLs
  - Removed backward compatibility with `bucket/file` format
  - This prevents accidental transformation of other URLs (like `otpauth://`, `http://`, etc.)

### Added

- `parseMinioUrl()` method in `MinioService` to parse `minio://` URLs
- Enhanced `deleteFile()` method to accept both `minio://` URLs and separate `bucketName`/`objectName` parameters
- Explicit URL transformation based on `minio://` prefix for better safety and clarity

### Fixed

- **Critical**: Fixed issue where non-minio URLs (like `otpauth://totp/...`) were incorrectly transformed to MinIO URLs
- Improved URL transformation to be explicit and safe - only processes strings with `minio://` prefix
- Removed inference logic that could incorrectly identify any string with `/` as a MinIO path

### Changed

- `FileUrlTransformInterceptor` now only processes strings starting with `minio://` prefix
- `MinioFileInterceptor` updated to handle `minio://` format
- Removed all path inference logic - transformation is now explicit and safe

### Migration

See [README.md](./README.md#migration-guide-v1x--v200) for detailed migration guide from v1.x to v2.0.0.

**Quick Migration Steps:**
1. Update database: Migrate `bucket/file` paths to `minio://bucket/file`
2. Update code: Use `minio://` prefix when constructing file paths manually
3. Test: Verify all file operations work correctly

---

## [1.0.17] - Previous Version

### Features
- File upload and management with MinIO
- Automatic presigned URL generation
- Decorator-based file handling
- Support for TypeORM and Mongoose
- Query builder result transformation

---

[2.0.0]: https://github.com/UtilKit/nestjs-minio-backend/compare/v1.0.17...v2.0.0
[1.0.17]: https://github.com/UtilKit/nestjs-minio-backend/releases/tag/v1.0.17

