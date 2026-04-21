// POST /api/render/complete
// Webhook called by GitHub Actions when video render finishes
import { NextRequest, NextResponse } from 'next/server';
import { loadConfig } from '@/lib/config';
import { getJob, saveJob } from '@/lib/db';
import { notifyVideoReady, sendErrorAlert } from '@/lib/publishers/telegram';

export async function POST(req: NextRequest) {
  const config = loadConfig();

  // Verify webhook secret
  const secret = req.headers.get('x-render-secret');
  if (secret !== config.renderWebhookSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { job_id?: string; status?: string; video_url?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { job_id, status, video_url } = body;
  if (!job_id) return NextResponse.json({ error: 'Missing job_id' }, { status: 400 });

  const job = await getJob(config, job_id);
  if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 });

  if (status === 'done' && video_url) {
    job.status = 'done';
    job.videoUrl = video_url;
    job.videoPublicUrl = video_url;
    await saveJob(config, job);
    await notifyVideoReady(job, config);
    return NextResponse.json({ ok: true, jobId: job_id, videoUrl: video_url });
  } else {
    job.status = 'failed';
    job.error = `Render failed. Status: ${status}`;
    await saveJob(config, job);
    await sendErrorAlert(job, config);
    return NextResponse.json({ ok: false, jobId: job_id, error: job.error });
  }
}
