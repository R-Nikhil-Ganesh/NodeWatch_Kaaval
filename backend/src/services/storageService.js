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

// MinIO is only published to the host on a loopback-only address (127.0.0.5),
// which the desktop web app can reach but a phone on the LAN cannot. This
// second client presigns against the machine's LAN address instead, so a
// SigV4 signature is issued for the host the phone will actually connect to
// (docker-compose also publishes MinIO on that same LAN address/port).
const publicS3Client = config.storage.publicEndpoint
  ? new S3Client({
      endpoint: config.storage.publicEndpoint,
      region: config.storage.region,
      credentials: {
        accessKeyId: config.storage.accessKeyId,
        secretAccessKey: config.storage.secretAccessKey,
      },
      forcePathStyle: true,
    })
  : null;

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
   * Same as getPresignedUrl, but signed for the LAN-reachable MinIO endpoint
   * so mobile devices (not just this machine) can load the file.
   * Falls back to the regular presigned URL if no public endpoint is configured.
   */
  async getPublicPresignedUrl(key, expiresIn = config.storage.presignedUrlExpiry) {
    if (!publicS3Client) return this.getPresignedUrl(key, expiresIn);
    const command = new GetObjectCommand({
      Bucket: config.storage.bucket,
      Key: key,
    });
    return getSignedUrl(publicS3Client, command, { expiresIn });
  },

  /**
   * Download an object's full contents into memory (used for server-side
   * thumbnail generation — decoding a video frame / PDF page needs the raw
   * bytes, not a URL).
   */
  async getFileBuffer(key) {
    const command = new GetObjectCommand({
      Bucket: config.storage.bucket,
      Key: key,
    });
    const { Body } = await s3Client.send(command);
    const chunks = [];
    for await (const chunk of Body) chunks.push(chunk);
    return Buffer.concat(chunks);
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
