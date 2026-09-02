import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { config } from '../config/index.js';

export const s3Client = new S3Client({
  endpoint: config.storage.endpoint,
  region: config.storage.region,
  credentials: {
    accessKeyId: config.storage.accessKeyId,
    secretAccessKey: config.storage.secretAccessKey,
  },
  forcePathStyle: true, // Required for MinIO
});

export const storageService = {
  /**
   * Upload file buffer directly to MinIO
   */
  async uploadFile({ key, buffer, mimeType, metadata = {} }) {
    const command = new PutObjectCommand({
      Bucket: config.storage.bucket,
      Key: key,
      Body: buffer,
      ContentType: mimeType || 'application/octet-stream',
      Metadata: metadata,
    });
    return s3Client.send(command);
  },

  /**
   * Generate an authenticated, short-lived pre-signed download URL
   */
  async getPresignedUrl(key, expiresIn = config.storage.presignedUrlExpiry) {
    const command = new GetObjectCommand({
      Bucket: config.storage.bucket,
      Key: key,
    });
    return getSignedUrl(s3Client, command, { expiresIn });
  },

  /**
   * Delete object from MinIO
   */
  async deleteFile(key) {
    const command = new DeleteObjectCommand({
      Bucket: config.storage.bucket,
      Key: key,
    });
    return s3Client.send(command);
  },

  /**
   * Check if object exists
   */
  async fileExists(key) {
    try {
      const command = new HeadObjectCommand({
        Bucket: config.storage.bucket,
        Key: key,
      });
      await s3Client.send(command);
      return true;
    } catch {
      return false;
    }
  }
};
