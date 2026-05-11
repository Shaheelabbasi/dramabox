import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as Minio from 'minio';
import * as fs from 'fs';

type UploadFile = {
  originalname: string;
  mimetype: string;
  size: number;
  buffer?: Buffer;
  path?: string;
};

@Injectable()
export class MinioService {
  private readonly minioClient: Minio.Client;
  private readonly logger = new Logger(MinioService.name);
  private readonly defaultSignedUrlExpirySeconds: number;

  constructor(private configService: ConfigService) {
    this.minioClient = new Minio.Client({
      endPoint: this.configService.get<string>('MINIO_ENDPOINT', 'localhost'),
      port: Number.parseInt(
        this.configService.get<string>('MINIO_PORT', '9000'),
        10,
      ),
      useSSL:
        this.configService.get<string>('MINIO_USE_SSL', 'false') === 'true',
      accessKey: this.configService.get<string>('MINIO_ACCESS_KEY') ?? '',
      secretKey: this.configService.get<string>('MINIO_SECRET_KEY') ?? '',
    });
    this.defaultSignedUrlExpirySeconds = this.resolveDefaultSignedUrlExpiry();
  }

  async uploadDramaThumbnail(file: UploadFile) {
    return this.uploadFileToBucket(
      file,
      this.configService.get<string>(
        'MINIO_DRAMA_THUMBNAILS_BUCKET',
        'dramabox-drama-thumbnails',
      ),
      'thumbnail',
    );
  }

  async uploadDramaVideo(file: UploadFile) {
    return this.uploadFileToBucket(
      file,
      this.configService.get<string>(
        'MINIO_DRAMA_VIDEOS_BUCKET',
        'dramabox-drama-videos',
      ),
      'video',
    );
  }

  async uploadEpisodeThumbnail(file: UploadFile) {
    return this.uploadFileToBucket(
      file,
      this.configService.get<string>(
        'MINIO_EPISODE_THUMBNAILS_BUCKET',
        'dramabox-episode-thumbnails',
      ),
      'thumbnail',
    );
  }

  async generateSignedGetUrl(
    bucketName: string,
    objectName: string,
    expiresInSeconds = this.defaultSignedUrlExpirySeconds,
  ): Promise<string> {
    if (!bucketName?.trim()) {
      throw new BadRequestException('Bucket name is required');
    }

    if (!objectName?.trim()) {
      throw new BadRequestException('Object name is required');
    }

    const validatedExpiry = this.validateSignedUrlExpiry(expiresInSeconds);
    try {
      return await this.minioClient.presignedGetObject(
        bucketName.trim(),
        objectName.trim(),
        validatedExpiry,
      );
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Unknown Minio presigned URL error';
      throw new BadRequestException(message);
    }
  }

  async generateSignedGetUrlFromAssetUrl(
    assetUrl: string,
    expiresInSeconds = this.defaultSignedUrlExpirySeconds,
  ): Promise<string> {
    const parsed = this.parseAssetUrl(assetUrl);

    if (!parsed) {
      throw new BadRequestException('Invalid Minio asset URL');
    }

    return this.generateSignedGetUrl(
      parsed.bucketName,
      parsed.objectName,
      expiresInSeconds,
    );
  }

  async deleteFileByUrl(assetUrl: string): Promise<void> {
    const parsed = this.parseAssetUrl(assetUrl);

    if (!parsed) {
      this.logger.warn(`Could not parse asset URL for deletion: ${assetUrl}`);
      return;
    }

    try {
      await this.minioClient.removeObject(parsed.bucketName, parsed.objectName);
      this.logger.log(
        `Deleted file ${parsed.objectName} from bucket ${parsed.bucketName}`,
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unknown Minio delete error';
      this.logger.warn(
        `Failed to delete Minio file for URL ${assetUrl}: ${message}`,
      );
    }
  }

  private async uploadFileToBucket(
    file: UploadFile,
    bucketName: string,
    prefix: string,
  ): Promise<string> {
    if (!file) {
      throw new BadRequestException('File is required');
    }

    await this.ensureBucketExists(bucketName);

    const extension = this.extractExtension(file.originalname);
    const objectName = `${prefix}/${Date.now()}-${this.sanitizeFilename(file.originalname)}${extension}`;
    const fileBody = this.getFileBody(file);

    await this.minioClient.putObject(
      bucketName,
      objectName,
      fileBody,
      file.size,
      { 'Content-Type': file.mimetype },
    );

    if (file.path) {
      await this.deleteLocalFileAfterUpload(file.path);
    }

    const publicBaseUrl = this.getPublicBaseUrl();
    const assetUrl = `${publicBaseUrl}/${bucketName}/${objectName}`;

    this.logger.log(`Uploaded file ${objectName} to bucket ${bucketName}`);

    return assetUrl;
  }

  private getFileBody(file: UploadFile): Buffer | fs.ReadStream {
    if (file.buffer?.length) {
      return file.buffer;
    }

    if (file.path) {
      return fs.createReadStream(file.path);
    }

    throw new BadRequestException('Uploaded file is missing buffer/path');
  }

  private async deleteLocalFileAfterUpload(filePath: string) {
    try {
      await fs.promises.unlink(filePath);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unknown file deletion error';
      this.logger.warn(
        `Uploaded to Minio but failed to delete local file ${filePath}: ${message}`,
      );
    }
  }

  private async ensureBucketExists(bucketName: string) {
    const bucketExists = await this.minioClient.bucketExists(bucketName);

    if (!bucketExists) {
      await this.minioClient.makeBucket(bucketName, 'us-east-1');
      this.logger.log(`Created bucket ${bucketName}`);
    }
  }

  private resolveDefaultSignedUrlExpiry(): number {
    const value = Number.parseInt(
      this.configService.get<string>('MINIO_PRESIGNED_URL_EXPIRY_SECONDS', '300'),
      10,
    );

    return this.validateSignedUrlExpiry(value);
  }

  private validateSignedUrlExpiry(value: number): number {
    if (!Number.isFinite(value) || value <= 0) {
      throw new BadRequestException(
        'Signed URL expiry must be a positive number of seconds',
      );
    }

    const maxExpirySeconds = 7 * 24 * 60 * 60;
    if (value > maxExpirySeconds) {
      throw new BadRequestException(
        `Signed URL expiry cannot exceed ${maxExpirySeconds} seconds`,
      );
    }

    return Math.floor(value);
  }

  private getPublicBaseUrl() {
    return (
      this.configService.get<string>('MINIO_PUBLIC_ENDPOINT') ??
      this.configService.get<string>('CREATIVES_BUCKET_ENDPOINT') ??
      'http://localhost:9000'
    );
  }

  private sanitizeFilename(filename: string) {
    const baseName = filename.replace(/\.[^/.]+$/, '');

    return (
      baseName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '') || 'file'
    );
  }

  private extractExtension(filename: string) {
    const match = filename.match(/\.[^/.]+$/);
    return match ? match[0].toLowerCase() : '';
  }

  private parseAssetUrl(
    assetUrl: string,
  ): { bucketName: string; objectName: string } | null {
    try {
      const url = new URL(assetUrl);
      const normalizedPath = this.stripPublicBasePath(url.pathname);
      const pathParts = normalizedPath.split('/').filter(Boolean);

      const parsed = this.resolveBucketAndObject(pathParts);

      if (parsed) {
        return parsed;
      }

      // Fallback for URLs where one extra prefix segment exists
      return this.resolveBucketAndObject(pathParts.slice(1));
    } catch {
      return null;
    }
  }

  private stripPublicBasePath(pathname: string): string {
    try {
      const publicBase = new URL(this.getPublicBaseUrl());
      const basePath = publicBase.pathname.replace(/\/+$/, '');

      if (!basePath || basePath === '/') {
        return pathname;
      }

      if (pathname === basePath) {
        return '/';
      }

      if (pathname.startsWith(`${basePath}/`)) {
        return pathname.slice(basePath.length);
      }

      return pathname;
    } catch {
      return pathname;
    }
  }

  private resolveBucketAndObject(pathParts: string[]) {
    if (pathParts.length < 2) {
      return null;
    }

    const [bucketName, ...objectParts] = pathParts;
    const objectName = decodeURIComponent(objectParts.join('/'));

    if (!bucketName || !objectName) {
      return null;
    }

    return { bucketName, objectName };
  }
}
