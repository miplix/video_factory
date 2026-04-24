// ============================================================
// GitHub Actions Trigger
// TTS (edge-tts) + ffmpeg assembly done on free GitHub Actions runner
// ============================================================
import type { AppConfig, VideoJob } from './types';

// TTS normalisation: English brand spelling breaks Russian edge-tts pronunciation.
// Apply ONLY to the voiceover string — captions/titles keep proper YupSoul.
function normalizeForTTS(text: string): string {
  return text
    .replace(/@\S+/g, '')                                 // kill @mentions (read as letters)
    .replace(/yupsoul\.ru/gi, 'юпсол точка ру')
    .replace(/yupsoul\.online/gi, 'юпсол')
    .replace(/yupsoul\.com/gi, 'юпсол')
    .replace(/@?Yup[_\s-]?Soul[_\s-]?bot/gi, 'юпсол')     // drop the English "bot" suffix
    .replace(/YupSoul/g, 'юпсол')
    .replace(/yupsoul/gi, 'юпсол')
    .replace(/\bbot\b/gi, '')                              // catch any lingering "bot"
    .replace(/\s+([,.!?…])/g, '$1')                       // fix floating punctuation
    .replace(/\s{2,}/g, ' ')
    .trim();
}

// Ensure every scene ends with proper punctuation so TTS pauses cleanly.
function sealSentence(text: string): string {
  const t = text.trim();
  if (!t) return t;
  return /[.!?…]$/.test(t) ? t : t + '.';
}

export async function triggerVideoRender(
  job: VideoJob,
  config: AppConfig,
  webhookBaseUrl: string,
  scenePrompts: string[] = [],
): Promise<{ runId?: string; error?: string }> {
  // Build full voiceover text (all scenes joined), normalized for Russian TTS
  const rawVoiceover = (job.script?.scenes || [])
    .map(s => sealSentence(s.voiceover))
    .join(' ');
  const voiceoverText = normalizeForTTS(rawVoiceover);

  // Single Telegram caption: intro + blank line + hashtags.
  // This is what GH Actions uses in sendVideo — Vercel no longer double-sends.
  const hashtagLine = (job.hashtags || []).join(' ').trim();
  const tgCaption = [
    (job.caption || '').trim(),
    hashtagLine,
  ].filter(Boolean).join('\n\n').slice(0, 900);

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
        caption: tgCaption,
        scene_prompts: JSON.stringify(scenePrompts),
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
