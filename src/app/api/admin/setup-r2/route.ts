// POST /api/admin/setup-r2
// One-tap configuration: enable 30-day auto-delete on R2 bucket (videos/ + jobs/).
// Auth: x-cron-secret (same as /api/generate).
import { NextRequest, NextResponse } from 'next/server';
import {
  S3Client,
  PutBucketLifecycleConfigurationCommand,
  GetBucketLifecycleConfigurationCommand,
} from '@aws-sdk/client-s3';
import { loadConfig } from '@/lib/config';

export const maxDuration = 10;

export async function POST(req: NextRequest) {
  const config = loadConfig();

  const auth = req.headers.get('x-cron-secret') || req.headers.get('authorization');
  if (auth !== config.cronSecret && auth !== `Bearer ${config.cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { r2AccountId, r2AccessKeyId, r2SecretAccessKey, r2BucketName } = config.storage;
  if (!r2AccountId || !r2AccessKeyId || !r2SecretAccessKey) {
    return NextResponse.json({ error: 'R2 credentials missing' }, { status: 400 });
  }

  const client = new S3Client({
    region: 'auto',
    endpoint: `https://${r2AccountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId: r2AccessKeyId, secretAccessKey: r2SecretAccessKey },
  });

  const days = Number(process.env.R2_RETENTION_DAYS || '30');

  try {
    await client.send(
      new PutBucketLifecycleConfigurationCommand({
        Bucket: r2BucketName,
        LifecycleConfiguration: {
          Rules: [
            {
              ID: 'delete-old-videos',
              Filter: { Prefix: 'videos/' },
              Status: 'Enabled',
              Expiration: { Days: days },
            },
            {
              ID: 'delete-old-jobs',
              Filter: { Prefix: 'jobs/' },
              Status: 'Enabled',
              Expiration: { Days: days },
            },
          ],
        },
      }),
    );

    const verify = await client.send(
      new GetBucketLifecycleConfigurationCommand({ Bucket: r2BucketName }),
    );

    return NextResponse.json({
      ok: true,
      bucket: r2BucketName,
      days,
      rules: (verify.Rules || []).map((r) => ({
        id: r.ID,
        prefix: r.Filter?.Prefix,
        days: r.Expiration?.Days,
      })),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
