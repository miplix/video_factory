// ============================================================
// Video Script Generator
// LLM → structured 30-second TikTok video script
// Priority: Gemini (free) → DeepSeek (free) → Anthropic
// ============================================================
import type { AppConfig, VideoScript, VideoScene, ZodiacSign, ContentRubric } from '../types';
import { ZODIAC_RU, ZODIAC_EMOJI, RUBRIC_RU, ZODIAC_DATES } from '../types';
import { getActiveLLMProvider } from '../config';
import { pickCelebrities } from '../data/celebrities';

// Russian TTS (edge-tts, rate +5%) reads ~15 chars/sec incl. pauses
const CHARS_PER_SEC = 14;
const TAIL_BUFFER_SEC = 1.2;

function estimateVoiceSeconds(text: string): number {
  const clean = text.trim();
  if (!clean) return 0;
  return clean.length / CHARS_PER_SEC;
}

interface ScriptGenOptions {
  zodiacSign?: ZodiacSign;
  zodiacSign2?: ZodiacSign;
  rubric: ContentRubric;
  config: AppConfig;
}

export async function generateVideoScript(opts: ScriptGenOptions): Promise<VideoScript> {
  const provider = getActiveLLMProvider(opts.config);
  if (!provider) throw new Error('No LLM provider configured');

  const prompt = buildPrompt(opts);
  const systemPrompt = buildSystemPrompt(opts.config);

  let raw: string;
  switch (provider) {
    case 'gemini':
      raw = await callGemini(prompt, systemPrompt, opts.config);
      break;
    case 'deepseek':
      raw = await callDeepSeek(prompt, systemPrompt, opts.config);
      break;
    case 'anthropic':
      raw = await callAnthropic(prompt, systemPrompt, opts.config);
      break;
    default:
      throw new Error(`Unknown provider: ${provider}`);
  }

  return parseScript(raw, opts);
}

function buildSystemPrompt(config: AppConfig): string {
  const siteHost = (config.brand.siteUrl || 'yupsoul.ru').replace(/^https?:\/\//, '').replace(/\/$/, '');
  return `Ты — топовый продюсер вирусного русскоязычного TikTok-контента (2025–2026), специализация: астрология + AI-музыка.
Бренд: ${config.brand.name} (${siteHost}) — сервис, который по дате рождения генерирует персональную мелодию. Бот: @Yup_Soul_bot.

Твой стиль:
— Анализируешь тренды TikTok RU: короткие хуки, эмоциональный крючок в первые 1.5с, «payoff» в середине, CTA в финале.
— Пишешь как живой человек, с метафорами звука (инструменты, жанры, текстуры), а не как «академический гороскоп».
— Знаешь язык Gen Z и миллениалов: без канцелярита, но без кринжа.
— Знаешь, что алгоритм TikTok любит: personalization (обращение к конкретному знаку/месяцу/дате), identity content («ты — ...»), curiosity gap, контраст.

Голосовой закадр (voiceover) озвучивается Microsoft Neural TTS на русском, темп +5%.
⚠️ КРИТИЧНО: скорость речи ~15 символов в секунду. Сцена 4с → voiceover МАКСИМУМ 55 символов. Сцена 5с → 72 символа. НИКОГДА не превышай — иначе голос оборвётся.

Формат ответа: ТОЛЬКО валидный JSON, без markdown-обёрток, без объяснений.`;
}

function buildPrompt(opts: ScriptGenOptions): string {
  const sign1Ru = opts.zodiacSign ? ZODIAC_RU[opts.zodiacSign] : '';
  const sign1Em = opts.zodiacSign ? ZODIAC_EMOJI[opts.zodiacSign] : '';
  const sign1Dates = opts.zodiacSign ? ZODIAC_DATES[opts.zodiacSign] : '';
  const sign2Ru = opts.zodiacSign2 ? ZODIAC_RU[opts.zodiacSign2] : '';
  const sign2Em = opts.zodiacSign2 ? ZODIAC_EMOJI[opts.zodiacSign2] : '';
  const rubricName = RUBRIC_RU[opts.rubric];

  let topicDesc = '';
  let hookHint = '';
  switch (opts.rubric) {
    case 'zodiac_sound':
      topicDesc = `Озвучь звуковой портрет знака «${sign1Ru}» (${sign1Dates}). Раскрой: какие инструменты, темп, жанр, текстура, эмоция. Используй метафоры («бас, как рёв космического кита», «синтезатор, который плачет»). Это НЕ гороскоп — это звучание души знака.`;
      hookHint = `Примеры хука: «Если бы ${sign1Ru} был треком — он бы звучал так...», «${sign1Ru} в плейлисте — это всегда...»`;
      break;
    case 'compatibility':
      topicDesc = `Музыкальная совместимость ${sign1Ru} × ${sign2Ru}. Опиши их дуэт как коллаб артистов: кто ведёт мелодию, кто ритм, какой получается жанр. Финал — вердикт: совместимы ли в «плейлисте жизни».`;
      hookHint = `Хук: «Что будет, если ${sign1Ru} и ${sign2Ru} запишут совместный трек?»`;
      break;
    case 'zodiac_memes':
      topicDesc = `Мем-портрет: как ${sign1Ru} ведёт себя в быту. Самоирония, узнаваемость, неожиданный поворот. Привяжи к музыке в конце («...и врубает свой любимый трек — [описание]»).`;
      hookHint = `Хук: «${sign1Ru}, когда...», «Типичный ${sign1Ru} в [ситуация]...»`;
      break;
    case 'zodiac_battle':
      topicDesc = `Батл: ${sign1Ru} VS ${sign2Ru}. Формат: сравнение «звуков» 3-4 раундами (энергия / ритм / настроение / финал). Выбери победителя с подколом.`;
      hookHint = `Хук: «${sign1Ru} против ${sign2Ru}. Чей бит громче?»`;
      break;
    case 'celebrities': {
      const picks = opts.zodiacSign ? pickCelebrities(opts.zodiacSign, 3) : [];
      const list = picks.map((p) => `— ${p.ru} (${p.dob})`).join('\n');
      topicDesc = `Как звучала бы персональная мелодия знаменитости со знаком ${sign1Ru}. Опиши «звук души» этой звезды. Заверши идеей: «твоя персональная мелодия такая же уникальная».

КРИТИЧНО: используй ИМЯ ТОЛЬКО из этого списка (все реально ${sign1Ru}):
${list}
Если возьмёшь имя не из списка — это будет фактическая ошибка, такое недопустимо.`;
      hookHint = `Хук: «Знаешь, как звучал бы трек ${picks[0]?.ru || 'этой звезды'}?»`;
      break;
    }
    case 'signs_as_genres':
      topicDesc = `Все 12 знаков как музыкальные жанры. По 2-3 секунды на знак. Короткие, хлёсткие ассоциации: «Овен — панк-рок», «Рыбы — ambient»... Не перечисление, а стендап-подача.`;
      hookHint = `Хук: «12 знаков зодиака — и каждый это отдельный жанр»`;
      break;
    case 'daily_energy':
      topicDesc = `Музыкальный энерго-прогноз на сегодня для ${sign1Ru || 'знака'}. Не «вас ждёт успех», а «сегодня твой день звучит как [описание]». Конкретика: утро / день / вечер.`;
      hookHint = `Хук: «Сегодняшний день ${sign1Ru} звучит вот так...»`;
      break;
    case 'backstage_ai':
      topicDesc = `Закулисье: как нейросеть за 60 секунд создаёт уникальный трек по дате рождения. Шаги: 1) берём натальную карту, 2) переводим планеты в частоты, 3) AI миксует. Магия + технология.`;
      hookHint = `Хук: «Как нейросеть превращает твою дату рождения в трек за минуту»`;
      break;
    case 'astro_facts':
      topicDesc = `Редкий, удивительный факт про ${sign1Ru || 'знаки'} — такой, чтобы зрители писали «вау, не знал». Связь с музыкой или звуком обязательна.`;
      hookHint = `Хук: «Факт о ${sign1Ru || 'твоём знаке'}, который меняет всё...»`;
      break;
    case 'gift':
      topicDesc = `Персональный AI-трек как идеальный подарок для ${sign1Ru || 'любимого человека'}. Эмоция: «это личнее, чем цветы». Конкретика: как заказать через бот за 1 минуту.`;
      hookHint = `Хук: «Забудь про цветы. Вот что на самом деле тронет ${sign1Ru}...»`;
      break;
    case 'tutorial':
      topicDesc = `Пошаговая инструкция: как получить персональный трек на ${opts.config?.brand?.name || 'YupSoul'}. 3-4 шага максимум. Обещание результата в финале.`;
      hookHint = `Хук: «За 60 секунд у тебя будет трек, который звучит ТОЛЬКО как ты»`;
      break;
  }

  const sign1Text = sign1Ru ? `${sign1Ru} ${sign1Em}` : '';
  const sign2Text = sign2Ru ? `${sign2Ru} ${sign2Em}` : '';

  return `Напиши сценарий вертикального TikTok-видео (30-35 секунд).

Рубрика: ${rubricName}
${sign1Text ? `Знак: ${sign1Text} (${sign1Dates})` : ''}
${sign2Text ? `Второй знак: ${sign2Text}` : ''}

ЗАДАЧА:
${topicDesc}

${hookHint ? `Направление хука: ${hookHint}` : ''}

ЖЁСТКИЕ ТРЕБОВАНИЯ:

1. СЦЕНЫ (6 штук, по 4-6 секунд):
   — Сцена 1 (4с, isHook: true): КРЮЧОК. Провокация / вопрос / парадокс. Должна заставить НЕ листать.
   — Сцены 2-5: раскрытие темы, с градацией интереса. Payoff (главный инсайт) — в сцене 3 или 4.
   — Последняя сцена (5с, isCTA: true): CTA. Формат: «Твой трек — в боте @Yup_Soul_bot» или «Создай свою мелодию на yupsoul.ru».

2. heading (то, что видно на слайде, КРУПНО):
   — 2-6 слов максимум.
   — Без кавычек, без эмодзи.
   — Каждый heading самодостаточен (человек поймёт даже без звука).

3. body (мелкий подзаголовок, опционально):
   — 0-8 слов. Уточнение / deadpan-комментарий. Может отсутствовать.

4. voiceover (озвучка, КРИТИЧНО по длине):
   — Сцена 4с: до 55 символов. Сцена 5с: до 72 символов. Сцена 6с: до 88 символов.
   — Живой разговорный русский. Никакого «дорогой зритель», никакого официоза.
   — Текст ЧИТАЕТСЯ как от лица друга, а не диктора.
   — ОБЯЗАТЕЛЬНО уложиться в лимит символов — иначе голос оборвётся на середине фразы.

5. CAPTION (подпись TikTok):
   — До 140 символов.
   — Формула: хук + интрига + лёгкий CTA.
   — В конце — 1-2 эмодзи.
   — Пример: «${sign1Ru || 'Твой знак'} звучит громче, чем ты думаешь 🎧 Проверь в боте»

6. HASHTAGS (под капотом трендового анализа):
   — 8-12 штук.
   — Смесь: 2-3 широких (#рек #fyp #viral), 3-4 нишевых (#астрология #гороскоп #знакизодиака), 2-3 точечных (#${sign1Ru ? sign1Ru.toLowerCase() : 'зодиак'} #музыка #персональнаямелодия), 1-2 брендовых (#yupsoul #aiмузыка).
   — Без «#хэштег1», только реальные трендовые.

7. MUSIC: выбери один тип из: cosmic_ambient | energetic | mystical | upbeat — в зависимости от настроения сценария.

Верни ТОЛЬКО JSON:
{
  "title": "краткое название для архива (5-8 слов)",
  "music": "cosmic_ambient",
  "scenes": [
    { "id": 1, "heading": "...", "body": "...", "voiceover": "...", "duration": 4, "isHook": true },
    { "id": 2, "heading": "...", "body": "...", "voiceover": "...", "duration": 5 },
    { "id": 3, "heading": "...", "body": "...", "voiceover": "...", "duration": 5 },
    { "id": 4, "heading": "...", "body": "...", "voiceover": "...", "duration": 5 },
    { "id": 5, "heading": "...", "body": "...", "voiceover": "...", "duration": 5 },
    { "id": 6, "heading": "...", "body": "...", "voiceover": "...", "duration": 5, "isCTA": true }
  ],
  "caption": "...",
  "hashtags": ["#рек", "#астрология", "#yupsoul", ...],
  "totalDuration": 29
}`;
}

function parseScript(raw: string, opts: ScriptGenOptions): VideoScript {
  // Strip markdown code blocks if present
  let json = raw.trim();
  if (json.startsWith('```')) {
    json = json.replace(/^```[a-z]*\n?/, '').replace(/\n?```$/, '');
  }

  let parsed: Partial<VideoScript>;
  try {
    parsed = JSON.parse(json);
  } catch {
    throw new Error(`Failed to parse LLM response as JSON: ${json.slice(0, 200)}`);
  }

  const rawScenes = (parsed.scenes || []).map((s: Partial<VideoScene>, i: number) => ({
    id: i + 1,
    heading: s.heading || '',
    body: s.body || undefined,
    voiceover: (s.voiceover || s.heading || '').trim(),
    duration: s.duration || 4,
    isHook: s.isHook || i === 0,
    isCTA: s.isCTA || i === (parsed.scenes?.length ?? 1) - 1,
  }));

  // Safety net: guarantee each scene is long enough for its voiceover.
  // If LLM wrote too long a line, stretch scene duration to fit audio.
  const scenes: VideoScene[] = rawScenes.map((sc) => {
    const needed = estimateVoiceSeconds(sc.voiceover) + 0.4; // breath
    const duration = Math.max(sc.duration, Math.ceil(needed));
    return { ...sc, duration };
  });

  // Extra tail on the last scene so CTA finishes cleanly.
  if (scenes.length > 0) {
    scenes[scenes.length - 1].duration += Math.ceil(TAIL_BUFFER_SEC);
  }

  const totalDuration = scenes.reduce((s, sc) => s + sc.duration, 0);

  return {
    title: parsed.title || 'YupSoul Video',
    zodiacSign: opts.zodiacSign,
    zodiacSign2: opts.zodiacSign2,
    rubric: opts.rubric,
    scenes,
    caption: parsed.caption || '',
    hashtags: parsed.hashtags || ['#астрология', '#гороскоп', '#рек', '#yupsoul'],
    totalDuration,
    music: parsed.music || 'cosmic_ambient',
  };
}

// --- LLM Providers ---

async function callGemini(prompt: string, systemPrompt: string, config: AppConfig): Promise<string> {
  const model = config.llm.geminiModel || 'gemini-2.5-flash-lite';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${config.llm.geminiApiKey}`;

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: systemPrompt }] },
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.9,
        maxOutputTokens: 2048,
        responseMimeType: 'application/json',
      },
    }),
  });

  if (!res.ok) throw new Error(`Gemini ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

async function callDeepSeek(prompt: string, systemPrompt: string, config: AppConfig): Promise<string> {
  const res = await fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.llm.deepseekApiKey}`,
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt },
      ],
      temperature: 0.9,
      max_tokens: 2048,
    }),
  });

  if (!res.ok) throw new Error(`DeepSeek ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return data.choices?.[0]?.message?.content || '';
}

async function callAnthropic(prompt: string, systemPrompt: string, config: AppConfig): Promise<string> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': config.llm.anthropicApiKey!,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2048,
      system: systemPrompt,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!res.ok) throw new Error(`Anthropic ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return data.content?.[0]?.text || '';
}

// --- Pick random topic ---
export function pickRandomTopic(usedPairs?: Set<string>): {
  zodiacSign?: ZodiacSign;
  zodiacSign2?: ZodiacSign;
  rubric: ContentRubric;
} {
  const signs = ['aries', 'taurus', 'gemini', 'cancer', 'leo', 'virgo',
    'libra', 'scorpio', 'sagittarius', 'capricorn', 'aquarius', 'pisces'] as ZodiacSign[];

  // Rotate rubrics — prioritize high-engagement ones
  const rubrics: ContentRubric[] = [
    'zodiac_sound', 'compatibility', 'zodiac_memes', 'zodiac_battle',
    'signs_as_genres', 'celebrities', 'astro_facts', 'backstage_ai', 'gift', 'tutorial',
  ];

  const rubric = rubrics[Math.floor(Math.random() * rubrics.length)];
  const sign1 = signs[Math.floor(Math.random() * signs.length)];

  if (rubric === 'compatibility' || rubric === 'zodiac_battle') {
    let sign2 = signs[Math.floor(Math.random() * signs.length)];
    while (sign2 === sign1) sign2 = signs[Math.floor(Math.random() * signs.length)];
    return { zodiacSign: sign1, zodiacSign2: sign2, rubric };
  }

  if (rubric === 'signs_as_genres') {
    return { rubric };
  }

  return { zodiacSign: sign1, rubric };
}
