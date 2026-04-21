// POST /api/render/complete
// Webhook called by GitHub Actions when video render finishes.
// On "failed" status: auto-retry up to MAX_RETRIES by redispatching the same job
// (slides + script are already in R2, we just re-trigger the workflow).
import { NextRequest, NextResponse, after } from 'next/server';
import { loadConfig } from '@/lib/config';
import { getJob, saveJob } from '@/lib/db';
import { notifyVideoReady, sendErrorAlert } from '@/lib/publishers/telegram';
import { triggerVideoRender } from '@/lib/github';

const MAX_RETRIES = 1;

export async function POST(req: NextRequest) {
  const config = loadConfig();

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
    job.updatedAt = new Date().toISOString();
    await saveJob(config, job);
    await notifyVideoReady(job, config);
    return NextResponse.json({ ok: true, jobId: job_id, videoUrl: video_url });
  }

  // --- Failed path -------------------------------------------------------
  const tries = job.retryCount ?? 0;
  if (tries < MAX_RETRIES && job.slideUrls?.length && job.script) {
    // We have assets — just redispatch the workflow. No re-gen needed.
    job.retryCount = tries + 1;
    job.status = 'rendering_video';
    job.error = `Retry ${job.retryCount}/${MAX_RETRIES} after failed render`;
    job.updatedAt = new Date().toISOString();
    await saveJob(config, job);

    const baseUrl =
      process.env.NEXT_PUBLIC_BASE_URL ||
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://localhost:3000');

    after(async () => {
      try {
        const { runId, error } = await triggerVideoRender(job, config, baseUrl);
        if (error) {
          job.status = 'failed';
          job.error = `Retry dispatch failed: ${error}`;
          await saveJob(config, job);
          await sendErrorAlert(job, config);
          return;
        }
        if (runId) job.githubRunId = runId;
        await saveJob(config, job);
      } catch (e) {
        job.status = 'failed';
        job.error = `Retry exception: ${e instanceof Error ? e.message : String(e)}`;
        await saveJob(config, job);
        await sendErrorAlert(job, config);
      }
    });

    return NextResponse.json({ ok: true, jobId: job_id, retrying: true, attempt: job.retryCount });
  }

  // No retries left — mark failed for good.
  job.status = 'failed';
  job.error = `Render failed after ${tries} retries. Status: ${status}`;
  job.updatedAt = new Date().toISOString();
  await saveJob(config, job);
  await sendErrorAlert(job, config);
  return NextResponse.json({ ok: false, jobId: job_id, error: job.error });
}
