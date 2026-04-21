// GET /api/cron/generate
// Called by Vercel cron 2x per day
// Generates 2-3 videos per run based on schedule
import { NextRequest, NextResponse } from 'next/server';
import { loadConfig } from '@/lib/config';
import { getJobsByDate } from '@/lib/db';
import { sendDailyReport } from '@/lib/publishers/telegram';
import { pickRandomTopic } from '@/lib/generators/script';

const VIDEOS_PER_DAY = 3;

export async function GET(req: NextRequest) {
  const config = loadConfig();

  // Verify Vercel cron secret
  const secret = req.headers.get('authorization');
  if (secret !== `Bearer ${config.cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const today = new Date().toISOString().split('T')[0];
  const existing = await getJobsByDate(config, today);
  const doneToday = existing.filter(j => ['done', 'rendering_video', 'generating_script', 'rendering_slides', 'generating_voice', 'uploading'].includes(j.status)).length;

  const toGenerate = Math.max(0, VIDEOS_PER_DAY - doneToday);

  if (toGenerate === 0) {
    return NextResponse.json({ message: `Already generated ${doneToday} videos today`, skipped: true });
  }

  const baseUrl = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : (process.env.NEXT_PUBLIC_BASE_URL || 'https://localhost:3000');

  const results: Array<{ jobId?: string; error?: string }> = [];

  for (let i = 0; i < toGenerate; i++) {
    try {
      const topic = pickRandomTopic();
      const res = await fetch(`${baseUrl}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-cron-secret': config.cronSecret,
        },
        body: JSON.stringify(topic),
      });

      const data = await res.json();
      results.push({ jobId: data.jobId, error: data.error });

      // Small delay between jobs
      if (i < toGenerate - 1) await new Promise(r => setTimeout(r, 2000));
    } catch (err) {
      results.push({ error: err instanceof Error ? err.message : String(err) });
    }
  }

  // Send daily report if it's the evening run (after 16:00 UTC)
  const hour = new Date().getUTCHours();
  if (hour >= 16) {
    const allJobs = await getJobsByDate(config, today);
    await sendDailyReport({
      generated: allJobs.filter(j => j.status === 'done').length,
      failed: allJobs.filter(j => j.status === 'failed').length,
      pending: allJobs.filter(j => ['rendering_video', 'uploading'].includes(j.status)).length,
    }, config);
  }

  return NextResponse.json({ date: today, triggered: toGenerate, results });
}
