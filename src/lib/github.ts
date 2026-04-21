// ============================================================
// GitHub Actions Trigger
// Dispatches render-video.yml workflow with job parameters
// Free: 2000 min/month (private), unlimited (public)
// ffmpeg is pre-installed on ubuntu-latest runners
// ============================================================
import type { AppConfig, VideoJob, VideoScene } from './types';

export interface RenderPayload {
  job_id: string;
  slide_urls: string[];       // PNG slides on R2
  audio_url: string;          // MP3 voiceover on R2
  scene_durations: number[];  // seconds per scene
  music_type: string;         // cosmic_ambient | energetic | mystical | upbeat
  webhook_url: string;        // POST back when done
  webhook_secret: string;
}

export async function triggerVideoRender(
  job: VideoJob,
  config: AppConfig,
  webhookBaseUrl: string
): Promise<{ runId?: string; error?: string }> {
  const payload: RenderPayload = {
    job_id: job.id,
    slide_urls: job.slideUrls || [],
    audio_url: job.audioUrl || '',
    scene_durations: job.script?.scenes.map(s => s.duration) || [],
    music_type: job.script?.music || 'cosmic_ambient',
    webhook_url: `${webhookBaseUrl}/api/render/complete`,
    webhook_secret: config.renderWebhookSecret,
  };

  const url = `https://api.github.com/repos/${config.github.owner}/${config.github.repo}/actions/workflows/${config.github.workflow}/dispatches`;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${config.github.token}`,
      'Accept': 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      ref: 'main',
      inputs: {
        job_id: payload.job_id,
        slide_urls: JSON.stringify(payload.slide_urls),
        audio_url: payload.audio_url,
        scene_durations: JSON.stringify(payload.scene_durations),
        music_type: payload.music_type,
        webhook_url: payload.webhook_url,
        webhook_secret: payload.webhook_secret,
        caption: job.caption || '',
      },
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    return { error: `GitHub Actions dispatch failed: ${res.status} — ${err}` };
  }

  // Get the run ID by querying recent runs
  await new Promise(r => setTimeout(r, 2000));
  const runId = await getLatestRunId(config);

  return { runId };
}

async function getLatestRunId(config: AppConfig): Promise<string | undefined> {
  const url = `https://api.github.com/repos/${config.github.owner}/${config.github.repo}/actions/workflows/${config.github.workflow}/runs?per_page=1`;
  const res = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${config.github.token}`,
      'Accept': 'application/vnd.github+json',
    },
  });

  if (!res.ok) return undefined;
  const data = await res.json();
  return data.workflow_runs?.[0]?.id?.toString();
}

export async function getRunStatus(
  config: AppConfig,
  runId: string
): Promise<'queued' | 'in_progress' | 'completed' | 'failed'> {
  const url = `https://api.github.com/repos/${config.github.owner}/${config.github.repo}/actions/runs/${runId}`;
  const res = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${config.github.token}`,
      'Accept': 'application/vnd.github+json',
    },
  });

  if (!res.ok) return 'failed';
  const data = await res.json();
  const status = data.status;
  const conclusion = data.conclusion;

  if (status === 'completed') {
    return conclusion === 'success' ? 'completed' : 'failed';
  }
  return status || 'queued';
}
