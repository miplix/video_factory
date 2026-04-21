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

// Persistent reply keyboard — stays at bottom of chat forever.
// Tapping a button sends its literal text which we match in the command handler.
function persistentKeyboard(): Record<string, unknown> {
  return {
    reply_markup: {
      keyboard: [
        [{ text: '🎲 Новое видео' }, { text: '🔄 Серия 12 знаков' }],
        [{ text: '♈ По знаку' }, { text: '🎬 Рубрика' }],
        [{ text: '📊 Статус' }, { text: '🎞 Последнее' }],
        [{ text: '❓ Помощь' }],
      ],
      resize_keyboard: true,
      is_persistent: true,
    },
  };
}

function mainMenu(): InlineKeyboard {
  return [
    [{ text: '🎲 Случайное видео', callback_data: 'mode:random' }],
    [{ text: '🔄 Серия 12 знаков', callback_data: 'mode:series' }],
    [
      { text: '♈ По знаку', callback_data: 'menu:signs' },
      { text: '🎬 По рубрике', callback_data: 'menu:rubrics' },
    ],
    [{ text: '📊 Статус', callback_data: 'menu:status' }, { text: '🎞 Последнее', callback_data: 'menu:last' }],
  ];
}

// One-off registration of bot slash-menu (the "/" button in Telegram).
// Fire-and-forget — errors are non-fatal.
async function registerBotCommands(token: string) {
  await fetch(`${TG}${token}/setMyCommands`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      commands: [
        { command: 'start',    description: '🏠 Главное меню' },
        { command: 'generate', description: '🎲 Новое случайное видео' },
        { command: 'series',   description: '🔄 Серия: 12 знаков подряд' },
        { command: 'signs',    description: '♈ Выбрать знак зодиака' },
        { command: 'rubrics',  description: '🎬 Выбрать рубрику' },
        { command: 'status',   description: '📊 Статус последних задач' },
        { command: 'last',     description: '🎞 Последнее готовое видео' },
        { command: 'help',     description: '❓ Помощь' },
      ],
    }),
  }).catch(() => {});
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
    'brand_sounds',
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

// Fire a series of 12 videos — one per zodiac sign.
// Batched 4-at-a-time with 20s gaps so Gemini/GH Actions don't burst-limit.
async function triggerSeries(baseUrl: string, cronSecret: string) {
  for (let i = 0; i < ZODIAC_SIGNS.length; i += 4) {
    const batch = ZODIAC_SIGNS.slice(i, i + 4);
    await Promise.all(
      batch.map((sign) =>
        triggerGenerate(baseUrl, cronSecret, {
          zodiacSign: sign,
          rubric: 'zodiac_sound',
        }).catch(() => {}),
      ),
    );
    if (i + 4 < ZODIAC_SIGNS.length) {
      await new Promise((r) => setTimeout(r, 20_000));
    }
  }
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
    } else if (data === 'mode:series') {
      await answerCallback(token, cb.id, 'Серия запущена...');
      await sendTyping(token, chatId);
      await reply(
        token,
        chatId,
        '🔄 <b>Серия: 12 знаков</b>\n\nЗапускаю параллельно по 4 штуки с паузами.\nПервые ролики придут через ~5 минут, все 12 — в течение часа.',
      );
      if (baseUrl) after(() => triggerSeries(baseUrl, config.cronSecret));
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
      const noSigns = rubric === 'brand_sounds' || rubric === 'signs_as_genres';
      const needsPair = rubric === 'compatibility' || rubric === 'zodiac_battle';
      const sign1 = noSigns ? undefined : pickRandomSign();
      const sign2 = needsPair ? pickRandomSign(sign1) : undefined;
      const desc = noSigns
        ? '—'
        : needsPair
          ? `${ZODIAC_RU[sign1!]} × ${ZODIAC_RU[sign2!]}`
          : ZODIAC_RU[sign1!];
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
  const rawCommand = parts[0].split('@')[0].toLowerCase();

  // Map persistent-keyboard button labels → slash commands.
  const command =
    /^🎲/.test(text) ? '/generate' :
    /^🔄/.test(text) ? '/series' :
    /^♈/.test(text)  ? '/signs' :
    /^🎬/.test(text) ? '/rubrics' :
    /^📊/.test(text) ? '/status' :
    /^🎞/.test(text) ? '/last' :
    /^❓/.test(text) ? '/help' :
    rawCommand;

  if (command === '/start' || command === '/menu') {
    // Register slash-menu commands on first interaction (idempotent).
    after(() => registerBotCommands(token));

    // Send persistent keyboard first — stays visible in chat.
    await reply(
      token,
      chatId,
      [
        '🌌 <b>YupSoul Video Factory</b>',
        '',
        'Генерирую вертикальные TikTok-видео о знаках зодиака и персональной AI-музыке.',
        'Видео приходит сюда через ~5 минут.',
        '',
        'Кнопки снизу или «/» в Telegram — главное меню всегда под рукой.',
      ].join('\n'),
      persistentKeyboard(),
    );
    // Then inline menu for quick actions.
    await reply(token, chatId, 'Что создадим?', withKeyboard(mainMenu()));
  } else if (command === '/generate' || command === '/gen') {
    if (!baseUrl) {
      await reply(token, chatId, '⚠️ Не задан NEXT_PUBLIC_BASE_URL.');
      return NextResponse.json({ ok: true });
    }
    await sendTyping(token, chatId);
    await reply(token, chatId, '⚙️ Запускаю генерацию видео...\nВидео придёт сюда через ~5 минут.');
    after(() => triggerGenerate(baseUrl, config.cronSecret));
  } else if (command === '/series') {
    if (!baseUrl) {
      await reply(token, chatId, '⚠️ Не задан NEXT_PUBLIC_BASE_URL.');
      return NextResponse.json({ ok: true });
    }
    await sendTyping(token, chatId);
    await reply(
      token,
      chatId,
      '🔄 <b>Серия: 12 знаков</b>\n\nЗапускаю 12 роликов (по 4 параллельно, с паузами).\nПервые придут через ~5 минут, все 12 — в течение часа.',
    );
    after(() => triggerSeries(baseUrl, config.cronSecret));
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
        '🎲 /generate — одно случайное видео',
        '🔄 /series — серия 12 знаков подряд',
        '♈ /signs — выбрать знак зодиака (12 кнопок)',
        '🎬 /rubrics — выбрать рубрику (12 категорий)',
        '📊 /status — 5 последних задач',
        '🎞 /last — ссылка на последнее готовое видео',
        '🏠 /menu — главное меню',
        '',
        '<b>Как это работает:</b>',
        '1. Gemini пишет сценарий (6 сцен, 30с) + самопроверка',
        '2. Satori рендерит слайды 1080×1920',
        '3. edge-tts озвучивает (ru-RU Дмитрий)',
        '4. GitHub Actions собирает MP4 с Ken Burns / Pexels',
        '5. Whisper добавляет караоке-сабы',
        '6. Видео приходит сюда + ссылка на R2',
        '',
        '⏱ Среднее время: 4–7 минут на видео',
      ].join('\n'),
    );
  } else {
    // Quietly ignore non-command text (persistent-kb button labels already mapped above).
    return NextResponse.json({ ok: true });
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
