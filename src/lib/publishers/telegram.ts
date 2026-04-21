// ============================================================
// Telegram Publisher
// Sends video download link + caption to channel/chat
// Also supports sending the actual video file (up to 50MB)
// ============================================================
import type { AppConfig, VideoJob } from '../types';

const TG_API = 'https://api.telegram.org/bot';

export async function notifyVideoReady(job: VideoJob, config: AppConfig): Promise<void> {
  if (!config.telegram.botToken || !config.telegram.chatId) return;

  const caption = buildCaption(job);
  const videoUrl = job.videoPublicUrl || job.videoUrl;

  if (!videoUrl) {
    await sendMessage(config, `⚠️ Видео ${job.id} готово, но URL не получен.`);
    return;
  }

  // Try to send as video first, fall back to link
  try {
    await sendVideo(config, videoUrl, caption);
  } catch {
    await sendMessage(config, `🎬 *Видео готово!*\n\n${caption}\n\n[Скачать видео](${videoUrl})`);
  }
}

export async function sendRenderStarted(job: VideoJob, config: AppConfig): Promise<void> {
  if (!config.telegram.botToken || !config.telegram.chatId) return;
  const sign = job.script?.zodiacSign ? ` — ${job.script.zodiacSign}` : '';
  await sendMessage(config, `⚙️ Генерирую видео${sign}\n\`${job.id}\``);
}

export async function sendErrorAlert(job: VideoJob, config: AppConfig): Promise<void> {
  if (!config.telegram.botToken || !config.telegram.chatId) return;
  await sendMessage(config, `❌ Ошибка в задаче \`${job.id}\`:\n${job.error}`);
}

export async function sendDailyReport(
  stats: { generated: number; failed: number; pending: number },
  config: AppConfig
): Promise<void> {
  if (!config.telegram.botToken || !config.telegram.chatId) return;
  const msg = `📊 *Ежедневный отчёт*\n\n✅ Готово: ${stats.generated}\n❌ Ошибок: ${stats.failed}\n⏳ В обработке: ${stats.pending}`;
  await sendMessage(config, msg);
}

// --- Internal ---

function buildCaption(job: VideoJob): string {
  const script = job.script;
  if (!script) return `Видео ${job.id} готово.`;

  const lines = [
    script.caption || script.title,
    '',
    (script.hashtags || []).join(' '),
  ];
  return lines.join('\n').trim().slice(0, 1024);
}

async function sendMessage(config: AppConfig, text: string): Promise<void> {
  const url = `${TG_API}${config.telegram.botToken}/sendMessage`;
  await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: config.telegram.chatId,
      text,
      parse_mode: 'Markdown',
      disable_web_page_preview: false,
    }),
  });
}

async function sendVideo(config: AppConfig, videoUrl: string, caption: string): Promise<void> {
  const url = `${TG_API}${config.telegram.botToken}/sendVideo`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: config.telegram.chatId,
      video: videoUrl,
      caption: caption.slice(0, 1024),
      parse_mode: 'Markdown',
      supports_streaming: true,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Telegram sendVideo failed: ${err}`);
  }
}
