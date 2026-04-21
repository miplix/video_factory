// ============================================================
// GitHub Actions Trigger
// TTS (edge-tts) + ffmpeg assembly done on free GitHub Actions runner
// ============================================================
import type { AppConfig, VideoJob } from './types';

export async function triggerVideoRender(
  job: VideoJob,
  config: AppConfig,
  webhookBaseUrl: string
): Promise<{ runId?: string; error?: string }> {
  // Build full voiceover text (all scenes joined)
  const voiceoverText = job.script?.scenes
    .map(s => s.voiceover)
    .join(' ... ') || '';

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
        job_id: job.id,
        slide_urls: JSON.stringify(job.slideUrls || []),
        voiceover_text: voiceoverText.slice(0, 4000),
        scene_durations: JSON.stringify(job.script?.scenes.map(s => s.duration) || []),
        music_type: job.script?.music || 'cosmic_ambient',
        webhook_url: `${webhookBaseUrl}/api/render/complete`,
        webhook_secret: config.renderWebhookSecret,
        caption: (job.caption || '').slice(0, 500),
      },
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    return { error: `GitHub Actions dispatch failed: ${res.status} — ${err}` };
  }

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
  if (data.status === 'completed') return data.conclusion === 'success' ? 'completed' : 'failed';
  return data.status || 'queued';
}
