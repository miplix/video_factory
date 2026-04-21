// Cloudflare R2 storage via S3-compatible API
// Free tier: 10GB storage, 1M reads/month, 10M writes/month
import { S3Client, PutObjectCommand, GetObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import type { AppConfig } from '../types';

function getClient(config: AppConfig) {
  return new S3Client({
    region: 'auto',
    endpoint: `https://${config.storage.r2AccountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: config.storage.r2AccessKeyId,
      secretAccessKey: config.storage.r2SecretAccessKey,
    },
  });
}

export async function uploadBuffer(
  config: AppConfig,
  key: string,
  buffer: Buffer,
  contentType: string
): Promise<string> {
  const client = getClient(config);
  await client.send(new PutObjectCommand({
    Bucket: config.storage.r2BucketName,
    Key: key,
    Body: buffer,
    ContentType: contentType,
  }));

  if (config.storage.r2PublicUrl) {
    return `${config.storage.r2PublicUrl}/${key}`;
  }
  // Return signed URL (valid 7 days) if no public URL configured
  return getSignedUrl(client, new GetObjectCommand({
    Bucket: config.storage.r2BucketName,
    Key: key,
  }), { expiresIn: 604800 });
}

export async function uploadJson(config: AppConfig, key: string, data: unknown): Promise<void> {
  const client = getClient(config);
  await client.send(new PutObjectCommand({
    Bucket: config.storage.r2BucketName,
    Key: key,
    Body: JSON.stringify(data, null, 2),
    ContentType: 'application/json',
  }));
}

export async function downloadJson<T>(config: AppConfig, key: string): Promise<T | null> {
  const client = getClient(config);
  try {
    const res = await client.send(new GetObjectCommand({
      Bucket: config.storage.r2BucketName,
      Key: key,
    }));
    const text = await res.Body?.transformToString();
    return text ? JSON.parse(text) as T : null;
  } catch {
    return null;
  }
}

export async function listKeys(config: AppConfig, prefix: string): Promise<string[]> {
  const client = getClient(config);
  const res = await client.send(new ListObjectsV2Command({
    Bucket: config.storage.r2BucketName,
    Prefix: prefix,
  }));
  return (res.Contents || []).map(o => o.Key!).filter(Boolean);
}

export async function getPublicUrl(config: AppConfig, key: string): Promise<string> {
  if (config.storage.r2PublicUrl) {
    return `${config.storage.r2PublicUrl}/${key}`;
  }
  const client = getClient(config);
  return getSignedUrl(client, new GetObjectCommand({
    Bucket: config.storage.r2BucketName,
    Key: key,
  }), { expiresIn: 604800 });
}
