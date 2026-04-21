// Telegram bot webhook handler
// Commands: /start /generate /status /help
// Register webhook: https://api.telegram.org/bot{TOKEN}/setWebhook?url={VERCEL_URL}/api/webhook/telegram
import { NextRequest, NextResponse, after } from 'next/server';
import { loadConfig } from '@/lib/config';
import { getJobs } from '@/lib/db';
import { ZODIAC_RU, ZODIAC_EMOJI } from '@/lib/types';

const TG = 'https://api.telegram.org/bot';

async function reply(token: string, chatId: number, text: string, extra: Record<string, unknown> = {}) {
  await fetch(`${TG}${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML', ...extra }),
  });
}

async function sendTyping(token: string, chatId: number) {
  await fetch(`${TG}${token}/sendChatAction`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, action: 'upload_video' }),
  });
}

export async function POST(req: NextRequest) {
  const config = loadConfig();
  const token = config.telegram.botToken;
  if (!token) return NextResponse.json({ ok: true });

  let update: TelegramUpdate;
  try { update = await req.json(); } catch { return NextResponse.json({ ok: true }); }

  const msg = update.message || update.edited_message;
  if (!msg?.text) return NextResponse.json({ ok: true });

  const chatId = msg.chat.id;
  const text = msg.text.trim();
  const command = text.split(' ')[0].replace('@', '').toLowerCase();

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || `https://${process.env.VERCEL_URL}` || '';

  if (command === '/start') {
    await reply(token, chatId, [
      '🌌 <b>YupSoul Video Factory</b>',
      '',
      'Я генерирую TikTok-видео о знаках зодиака и музыке.',
      'Видео приходит прямо сюда через ~5 минут.',
      '',
      '<b>Команды:</b>',
      '/generate — создать случайное видео',
      '/status — последние задачи',
      '/help — помощь',
    ].join('\n'));

  } else if (command === '/generate' || command === '/gen') {
    if (!baseUrl) {
      await reply(token, chatId, '⚠️ Не задан NEXT_PUBLIC_BASE_URL. Настрой переменные Vercel.');
      return NextResponse.json({ ok: true });
    }

    await sendTyping(token, chatId);
    await reply(token, chatId, '⚙️ Запускаю генерацию видео...\n\nВидео придёт сюда через ~5 минут.');

    after(async () => {
      await fetch(`${baseUrl}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-cron-secret': config.cronSecret,
        },
        body: JSON.stringify({}),
      });
    });

  } else if (command === '/status') {
    const jobs = await getJobs(config, 5);
    if (jobs.length === 0) {
      await reply(token, chatId, 'Пока нет задач. Используй /generate для создания видео.');
      return NextResponse.json({ ok: true });
    }

    const STATUS_EMOJI: Record<string, string> = {
      pending: '⏳', generating_script: '✍️', rendering_slides: '🖼️',
      generating_voice: '🎙️', uploading: '☁️', rendering_video: '🎬',
      done: '✅', failed: '❌',
    };

    const lines = jobs.map(j => {
      const sign = j.script?.zodiacSign ? `${ZODIAC_EMOJI[j.script.zodiacSign]} ${ZODIAC_RU[j.script.zodiacSign]}` : '';
      const emoji = STATUS_EMOJI[j.status] || '❓';
      const time = new Date(j.createdAt).toLocaleTimeString('ru', { hour: '2-digit', minute: '2-digit' });
      return `${emoji} ${sign || j.rubric} <i>${time}</i>`;
    });

    await reply(token, chatId, `<b>Последние задачи:</b>\n\n${lines.join('\n')}`);

  } else if (command === '/help') {
    await reply(token, chatId, [
      '<b>YupSoul Video Factory — помощь</b>',
      '',
      '/generate — создать видео (случайный знак + тема)',
      '/status — статус последних 5 задач',
      '/start — главное меню',
      '',
      '<b>Как это работает:</b>',
      '1. Gemini генерирует сценарий',
      '2. Рендеринг слайдов 1080×1920',
      '3. Fish Audio озвучивает текст',
      '4. GitHub Actions собирает MP4',
      '5. Видео приходит сюда',
      '',
      '⏱ Среднее время: 4–7 минут',
    ].join('\n'));

  } else {
    await reply(token, chatId, '❓ Неизвестная команда. /help для помощи.');
  }

  return NextResponse.json({ ok: true });
}

// --- Types ---
interface TelegramUpdate {
  message?: TelegramMessage;
  edited_message?: TelegramMessage;
}

interface TelegramMessage {
  chat: { id: number };
  text?: string;
}
