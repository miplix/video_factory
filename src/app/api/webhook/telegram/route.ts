// Telegram bot webhook handler
// Text commands: /start /generate /gen_sign /gen_rubric /status /last /rubrics /signs /help
// Inline callbacks: sign:<id> / rubric:<id> / mode:<random|sign|rubric>
// Register webhook: https://api.telegram.org/bot{TOKEN}/setWebhook?url={VERCEL_URL}/api/webhook/telegram
import { NextRequest, NextResponse, after } from 'next/server';
import { loadConfig } from '@/lib/config';
import { getJobs } from '@/lib/db';
import { ZODIAC_RU, ZODIAC_EMOJI, ZODIAC_SIGNS, RUBRIC_RU } from '@/lib/types';
import type { ZodiacSign, ContentRubric } from '@/lib/types';

const TG = 'https://api.telegram.org/bot';

type InlineButton = { text: string; callback_data: string };
type InlineKeyboard = InlineButton[][];

async function reply(
  token: string,
  chatId: number,
  text: string,
  extra: Record<string, unknown> = {},
) {
  await fetch(`${TG}${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: 'HTML',
      disable_web_page_preview: true,
      ...extra,
    }),
  });
}

async function sendTyping(token: string, chatId: number) {
  await fetch(`${TG}${token}/sendChatAction`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, action: 'upload_video' }),
  });
}

async function answerCallback(token: string, callbackId: string, text = '') {
  await fetch(`${TG}${token}/answerCallbackQuery`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ callback_query_id: callbackId, text }),
  });
}

function withKeyboard(kb: InlineKeyboard): Record<string, unknown> {
  return { reply_markup: { inline_keyboard: kb } };
}

function mainMenu(): InlineKeyboard {
  return [
    [{ text: '🎲 Случайное видео', callback_data: 'mode:random' }],
    [
      { text: '♈ По знаку', callback_data: 'menu:signs' },
      { text: '🎬 По рубрике', callback_data: 'menu:rubrics' },
    ],
    [{ text: '📊 Статус', callback_data: 'menu:status' }, { text: '🎞 Последнее', callback_data: 'menu:last' }],
  ];
}

function signsKeyboard(): InlineKeyboard {
  const rows: InlineKeyboard = [];
  for (let i = 0; i < ZODIAC_SIGNS.length; i += 3) {
    rows.push(
      ZODIAC_SIGNS.slice(i, i + 3).map((s) => ({
        text: `${ZODIAC_EMOJI[s]} ${ZODIAC_RU[s]}`,
        callback_data: `sign:${s}`,
      })),
    );
  }
  rows.push([{ text: '← Меню', callback_data: 'menu:main' }]);
  return rows;
}

function rubricsKeyboard(): InlineKeyboard {
  const rubrics: ContentRubric[] = [
    'zodiac_sound',
    'compatibility',
    'zodiac_memes',
    'zodiac_battle',
    'signs_as_genres',
    'celebrities',
    'daily_energy',
    'astro_facts',
    'backstage_ai',
    'gift',
    'tutorial',
  ];
  const rows: InlineKeyboard = [];
  for (let i = 0; i < rubrics.length; i += 2) {
    rows.push(
      rubrics.slice(i, i + 2).map((r) => ({
        text: RUBRIC_RU[r],
        callback_data: `rubric:${r}`,
      })),
    );
  }
  rows.push([{ text: '← Меню', callback_data: 'menu:main' }]);
  return rows;
}

async function triggerGenerate(
  baseUrl: string,
  cronSecret: string,
  body: { zodiacSign?: ZodiacSign; zodiacSign2?: ZodiacSign; rubric?: ContentRubric } = {},
) {
  await fetch(`${baseUrl}/api/generate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-cron-secret': cronSecret,
    },
    body: JSON.stringify(body),
  });
}

function pickRandomSign(exclude?: ZodiacSign): ZodiacSign {
  const pool = ZODIAC_SIGNS.filter((s) => s !== exclude);
  return pool[Math.floor(Math.random() * pool.length)];
}

export async function POST(req: NextRequest) {
  const config = loadConfig();
  const token = config.telegram.botToken;
  if (!token) return NextResponse.json({ ok: true });

  let update: TelegramUpdate;
  try {
    update = await req.json();
  } catch {
    return NextResponse.json({ ok: true });
  }

  const baseUrl =
    process.env.NEXT_PUBLIC_BASE_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '');

  // --- Callback query (inline button tap) ---
  if (update.callback_query) {
    const cb = update.callback_query;
    const chatId = cb.message?.chat.id;
    const data = cb.data || '';
    if (!chatId) {
      await answerCallback(token, cb.id);
      return NextResponse.json({ ok: true });
    }

    if (data === 'menu:main') {
      await answerCallback(token, cb.id);
      await reply(token, chatId, '🌌 <b>Главное меню</b>\n\nЧто создадим?', withKeyboard(mainMenu()));
    } else if (data === 'menu:signs') {
      await answerCallback(token, cb.id);
      await reply(token, chatId, '♈ <b>Выбери знак зодиака</b>', withKeyboard(signsKeyboard()));
    } else if (data === 'menu:rubrics') {
      await answerCallback(token, cb.id);
      await reply(token, chatId, '🎬 <b>Выбери рубрику</b>', withKeyboard(rubricsKeyboard()));
    } else if (data === 'menu:status') {
      await answerCallback(token, cb.id);
      await sendStatus(token, chatId, config);
    } else if (data === 'menu:last') {
      await answerCallback(token, cb.id);
      await sendLast(token, chatId, config);
    } else if (data === 'mode:random') {
      await answerCallback(token, cb.id, 'Запускаю...');
      await sendTyping(token, chatId);
      await reply(token, chatId, '🎲 Случайное видео запущено. Жди ~5 минут.');
      if (baseUrl) after(() => triggerGenerate(baseUrl, config.cronSecret));
    } else if (data.startsWith('sign:')) {
      const sign = data.slice(5) as ZodiacSign;
      await answerCallback(token, cb.id, `Знак: ${ZODIAC_RU[sign] || sign}`);
      await sendTyping(token, chatId);
      await reply(
        token,
        chatId,
        `${ZODIAC_EMOJI[sign] || '✨'} Генерирую видео про <b>${ZODIAC_RU[sign] || sign}</b>...\nЖди ~5 минут.`,
      );
      if (baseUrl) after(() => triggerGenerate(baseUrl, config.cronSecret, { zodiacSign: sign }));
    } else if (data.startsWith('rubric:')) {
      const rubric = data.slice(7) as ContentRubric;
      await answerCallback(token, cb.id, `Рубрика: ${RUBRIC_RU[rubric] || rubric}`);
      await sendTyping(token, chatId);
      const needsPair = rubric === 'compatibility' || rubric === 'zodiac_battle';
      const sign1 = pickRandomSign();
      const sign2 = needsPair ? pickRandomSign(sign1) : undefined;
      const desc = needsPair
        ? `${ZODIAC_RU[sign1]} × ${ZODIAC_RU[sign2!]}`
        : ZODIAC_RU[sign1];
      await reply(
        token,
        chatId,
        `🎬 <b>${RUBRIC_RU[rubric]}</b>\nЗнаки: ${desc}\nЖди ~5 минут.`,
      );
      if (baseUrl) {
        after(() =>
          triggerGenerate(baseUrl, config.cronSecret, {
            rubric,
            zodiacSign: sign1,
            zodiacSign2: sign2,
          }),
        );
      }
    } else {
      await answerCallback(token, cb.id);
    }

    return NextResponse.json({ ok: true });
  }

  // --- Text message ---
  const msg = update.message || update.edited_message;
  if (!msg?.text) return NextResponse.json({ ok: true });

  const chatId = msg.chat.id;
  const text = msg.text.trim();
  const parts = text.split(/\s+/);
  const command = parts[0].split('@')[0].toLowerCase();

  if (command === '/start' || command === '/menu') {
    await reply(
      token,
      chatId,
      [
        '🌌 <b>YupSoul Video Factory</b>',
        '',
        'Генерирую вертикальные TikTok-видео о знаках зодиака и персональной AI-музыке.',
        'Видео приходит сюда через ~5 минут.',
        '',
        '<b>Команды:</b>',
        '/generate — случайное видео',
        '/signs — выбрать знак',
        '/rubrics — выбрать рубрику',
        '/status — последние задачи',
        '/last — ссылка на последнее видео',
        '/help — подробная справка',
      ].join('\n'),
      withKeyboard(mainMenu()),
    );
  } else if (command === '/generate' || command === '/gen') {
    if (!baseUrl) {
      await reply(token, chatId, '⚠️ Не задан NEXT_PUBLIC_BASE_URL.');
      return NextResponse.json({ ok: true });
    }
    await sendTyping(token, chatId);
    await reply(token, chatId, '⚙️ Запускаю генерацию видео...\nВидео придёт сюда через ~5 минут.');
    after(() => triggerGenerate(baseUrl, config.cronSecret));
  } else if (command === '/signs') {
    await reply(token, chatId, '♈ <b>Выбери знак зодиака</b>', withKeyboard(signsKeyboard()));
  } else if (command === '/rubrics') {
    await reply(token, chatId, '🎬 <b>Выбери рубрику</b>', withKeyboard(rubricsKeyboard()));
  } else if (command === '/status') {
    await sendStatus(token, chatId, config);
  } else if (command === '/last') {
    await sendLast(token, chatId, config);
  } else if (command === '/help') {
    await reply(
      token,
      chatId,
      [
        '<b>YupSoul Video Factory — помощь</b>',
        '',
        '🎲 /generate — случайное видео',
        '♈ /signs — выбрать знак зодиака (12 кнопок)',
        '🎬 /rubrics — выбрать рубрику (звук знака, батл, совместимость и др.)',
        '📊 /status — 5 последних задач',
        '🎞 /last — ссылка на последнее готовое видео',
        '🏠 /menu — главное меню с кнопками',
        '',
        '<b>Как это работает:</b>',
        '1. Gemini пишет сценарий (6 сцен, 30с)',
        '2. Satori рендерит слайды 1080×1920',
        '3. edge-tts озвучивает (ru-RU Дмитрий)',
        '4. GitHub Actions собирает MP4 с Ken Burns',
        '5. Видео приходит сюда + ссылка на R2',
        '',
        '⏱ Среднее время: 4–7 минут',
      ].join('\n'),
    );
  } else {
    await reply(
      token,
      chatId,
      '❓ Неизвестная команда. Нажми /menu для главного меню или /help.',
    );
  }

  return NextResponse.json({ ok: true });
}

async function sendStatus(
  token: string,
  chatId: number,
  config: ReturnType<typeof loadConfig>,
) {
  const jobs = await getJobs(config, 5);
  if (jobs.length === 0) {
    await reply(token, chatId, 'Пока нет задач. /generate для создания видео.');
    return;
  }
  const STATUS_EMOJI: Record<string, string> = {
    pending: '⏳',
    generating_script: '✍️',
    rendering_slides: '🖼️',
    generating_voice: '🎙️',
    uploading: '☁️',
    rendering_video: '🎬',
    done: '✅',
    failed: '❌',
  };
  const lines = jobs.map((j) => {
    const sign = j.script?.zodiacSign
      ? `${ZODIAC_EMOJI[j.script.zodiacSign]} ${ZODIAC_RU[j.script.zodiacSign]}`
      : '';
    const emoji = STATUS_EMOJI[j.status] || '❓';
    const time = new Date(j.createdAt).toLocaleTimeString('ru', {
      hour: '2-digit',
      minute: '2-digit',
    });
    const title = j.script?.title ? ` — ${j.script.title}` : '';
    return `${emoji} ${sign || j.rubric}${title} <i>${time}</i>`;
  });
  await reply(token, chatId, `<b>Последние задачи:</b>\n\n${lines.join('\n')}`);
}

async function sendLast(
  token: string,
  chatId: number,
  config: ReturnType<typeof loadConfig>,
) {
  const jobs = await getJobs(config, 10);
  const done = jobs.find((j) => j.status === 'done' && (j.videoPublicUrl || j.videoUrl));
  if (!done) {
    await reply(token, chatId, 'Готовых видео ещё нет. /generate — запусти первое.');
    return;
  }
  const url = done.videoPublicUrl || done.videoUrl || '';
  const title = done.script?.title || 'Видео';
  const caption = done.caption ? `\n\n${done.caption}` : '';
  await reply(
    token,
    chatId,
    `🎞 <b>${title}</b>${caption}\n\n<a href="${url}">Скачать MP4</a>`,
    { disable_web_page_preview: false },
  );
}

// --- Types ---
interface TelegramUpdate {
  message?: TelegramMessage;
  edited_message?: TelegramMessage;
  callback_query?: TelegramCallbackQuery;
}

interface TelegramMessage {
  chat: { id: number };
  text?: string;
}

interface TelegramCallbackQuery {
  id: string;
  data?: string;
  message?: TelegramMessage;
}
