#!/usr/bin/env python3
"""
One-off setup: enable R2 lifecycle auto-delete for old videos/slides.

Deletes objects older than 30 days under:
  - videos/*   (rendered MP4 files)
  - jobs/*     (slide PNGs, job metadata)

Run once:
    python3 scripts/setup_r2_lifecycle.py

Credentials read from .env.local (same keys as Vercel).
"""
import os
import sys
import pathlib

try:
    import boto3
    from botocore.config import Config
except ImportError:
    print("pip install boto3  # required")
    sys.exit(1)


def load_env(path: str = '.env.local') -> dict:
    env = {}
    p = pathlib.Path(path)
    if not p.exists():
        return env
    for line in p.read_text().splitlines():
        line = line.strip()
        if not line or line.startswith('#') or '=' not in line:
            continue
        k, v = line.split('=', 1)
        env[k.strip()] = v.strip()
    return env


def main():
    env = {**os.environ, **load_env()}

    required = ['R2_ACCOUNT_ID', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY', 'R2_BUCKET_NAME']
    missing = [k for k in required if not env.get(k)]
    if missing:
        print(f"Missing env vars: {missing}")
        sys.exit(1)

    s3 = boto3.client(
        's3',
        endpoint_url=f"https://{env['R2_ACCOUNT_ID']}.r2.cloudflarestorage.com",
        aws_access_key_id=env['R2_ACCESS_KEY_ID'],
        aws_secret_access_key=env['R2_SECRET_ACCESS_KEY'],
        config=Config(signature_version='s3v4'),
        region_name='auto',
    )

    bucket = env['R2_BUCKET_NAME']
    days = int(env.get('R2_RETENTION_DAYS', '30'))

    rules = [
        {
            'ID': 'delete-old-videos',
            'Filter': {'Prefix': 'videos/'},
            'Status': 'Enabled',
            'Expiration': {'Days': days},
        },
        {
            'ID': 'delete-old-jobs',
            'Filter': {'Prefix': 'jobs/'},
            'Status': 'Enabled',
            'Expiration': {'Days': days},
        },
    ]

    print(f"Applying lifecycle to bucket '{bucket}' ({days}-day TTL)...")
    s3.put_bucket_lifecycle_configuration(
        Bucket=bucket,
        LifecycleConfiguration={'Rules': rules},
    )
    print("✅ Applied. Verifying:")
    res = s3.get_bucket_lifecycle_configuration(Bucket=bucket)
    for r in res.get('Rules', []):
        pref = r.get('Filter', {}).get('Prefix', '?')
        exp = r.get('Expiration', {}).get('Days', '?')
        print(f"  — {r['ID']}: prefix={pref!r} days={exp}")


if __name__ == '__main__':
    main()
