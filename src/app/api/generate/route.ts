// POST /api/generate
// Triggers full pipeline: script → slides → voiceover → R2 upload → GitHub Actions render
import { NextRequest, NextResponse } from 'next/server';
import { loadConfig } from '@/lib/config';
import { generateVideoScript, pickRandomTopic } from '@/lib/generators/script';
import { renderAllSlides } from '@/lib/generators/slides';
import { generateVoiceover } from '@/lib/generators/voiceover';
import { uploadBuffer } from '@/lib/storage/r2';
import { triggerVideoRender } from '@/lib/github';
import { saveJob, generateId } from '@/lib/db';
import { sendRenderStarted, sendErrorAlert } from '@/lib/publishers/telegram';
import type { VideoJob, ZodiacSign, ContentRubric } from '@/lib/types';

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const config = loadConfig();

  // Verify cron or admin auth
  const auth = req.headers.get('authorization') || req.headers.get('x-admin-key');
  const isCron = req.headers.get('x-cron-secret') === config.cronSecret;
  if (!isCron && auth !== `Bearer ${config.cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { zodiacSign?: string; zodiacSign2?: string; rubric?: string } = {};
  try { body = await req.json(); } catch { /* no body = use random */ }

  const topic = body.zodiacSign
    ? {
        zodiacSign: body.zodiacSign as ZodiacSign,
        zodiacSign2: body.zodiacSign2 as ZodiacSign | undefined,
        rubric: (body.rubric as ContentRubric) || 'zodiac_sound',
      }
    : pickRandomTopic();

  const jobId = generateId();
  const job: VideoJob = {
    id: jobId,
    status: 'generating_script',
    zodiacSign: topic.zodiacSign,
    zodiacSign2: topic.zodiacSign2,
    rubric: topic.rubric,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    scheduledAt: new Date().toISOString().split('T')[0],
  };

  await saveJob(config, job);
  await sendRenderStarted(job, config);

  try {
    // 1. Generate script
    job.status = 'generating_script';
    await saveJob(config, job);
    const script = await generateVideoScript({
      zodiacSign: topic.zodiacSign,
      zodiacSign2: topic.zodiacSign2,
      rubric: topic.rubric,
      config,
    });
    job.script = script;
    job.caption = script.caption;
    job.hashtags = script.hashtags;

    // 2. Render slides
    job.status = 'rendering_slides';
    await saveJob(config, job);
    const slideBuffers = await renderAllSlides(script.scenes, script.zodiacSign, script.zodiacSign2);

    // 3. Generate voiceover
    job.status = 'generating_voice';
    await saveJob(config, job);
    const audioBuffer = await generateVoiceover(script.scenes, config);

    // 4. Upload slides + audio to R2
    job.status = 'uploading';
    await saveJob(config, job);

    const slideUrls: string[] = [];
    for (let i = 0; i < slideBuffers.length; i++) {
      const key = `jobs/${jobId}/slides/slide_${String(i).padStart(2, '0')}.png`;
      const url = await uploadBuffer(config, key, slideBuffers[i], 'image/png');
      slideUrls.push(url);
    }

    const audioKey = `jobs/${jobId}/voiceover.mp3`;
    const audioUrl = await uploadBuffer(config, audioKey, audioBuffer, 'audio/mpeg');

    job.slideUrls = slideUrls;
    job.audioUrl = audioUrl;

    // 5. Trigger GitHub Actions render
    job.status = 'rendering_video';
    await saveJob(config, job);

    const baseUrl = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : (process.env.NEXT_PUBLIC_BASE_URL || 'https://localhost:3000');

    const { runId, error: ghError } = await triggerVideoRender(job, config, baseUrl);

    if (ghError) {
      job.status = 'failed';
      job.error = ghError;
      await saveJob(config, job);
      await sendErrorAlert(job, config);
      return NextResponse.json({ error: ghError, jobId }, { status: 500 });
    }

    if (runId) job.githubRunId = runId;
    await saveJob(config, job);

    return NextResponse.json({
      jobId,
      status: 'rendering_video',
      githubRunId: runId,
      script: {
        title: script.title,
        totalDuration: script.totalDuration,
        scenes: script.scenes.length,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    job.status = 'failed';
    job.error = message;
    await saveJob(config, job);
    await sendErrorAlert(job, config);
    return NextResponse.json({ error: message, jobId }, { status: 500 });
  }
}
