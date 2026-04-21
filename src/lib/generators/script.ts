// ============================================================
// Video Script Generator
// LLM → structured 30-second TikTok video script
// Priority: Gemini (free) → DeepSeek (free) → Anthropic
// ============================================================
import type { AppConfig, VideoScript, VideoScene, ZodiacSign, ContentRubric } from '../types';
import { ZODIAC_RU, ZODIAC_EMOJI, RUBRIC_RU } from '../types';
import { getActiveLLMProvider } from '../config';

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
  return `Ты — контент-менеджер бренда ${config.brand.name}, создающий вирусные TikTok-видео.
Тематика: астрология + персонализированная AI-музыка.
Тон: мистический, дружелюбный, современный.
Язык: русский.
Формат ответа: ТОЛЬКО валидный JSON, без объяснений и markdown-обёрток.`;
}

function buildPrompt(opts: ScriptGenOptions): string {
  const sign1 = opts.zodiacSign ? `${ZODIAC_RU[opts.zodiacSign]} ${ZODIAC_EMOJI[opts.zodiacSign]}` : '';
  const sign2 = opts.zodiacSign2 ? `${ZODIAC_RU[opts.zodiacSign2]} ${ZODIAC_EMOJI[opts.zodiacSign2]}` : '';
  const rubricName = RUBRIC_RU[opts.rubric];

  let topicDesc = '';
  switch (opts.rubric) {
    case 'zodiac_sound':
      topicDesc = `Видео о том, как звучит ${sign1}. Опиши характер звука, атмосферу, инструменты.`;
      break;
    case 'compatibility':
      topicDesc = `Видео о музыкальной совместимости ${sign1} и ${sign2}. Как звучит их дуэт?`;
      break;
    case 'zodiac_memes':
      topicDesc = `Смешное видео-мем о том, как ${sign1} ведёт себя в жизни. Юмор + самоирония.`;
      break;
    case 'zodiac_battle':
      topicDesc = `Батл: ${sign1} VS ${sign2}. Кто кого в музыкальном поединке?`;
      break;
    case 'celebrities':
      topicDesc = `Как бы звучала космическая мелодия известной личности (знак ${sign1}).`;
      break;
    case 'signs_as_genres':
      topicDesc = `Все 12 знаков зодиака как жанры музыки. Быстро и образно.`;
      break;
    case 'daily_energy':
      topicDesc = `Энергия дня для ${sign1 || 'всех знаков'} — музыкальный прогноз.`;
      break;
    case 'backstage_ai':
      topicDesc = `Закулисье: как AI за 60 секунд создаёт уникальную мелодию по дате рождения.`;
      break;
    case 'astro_facts':
      topicDesc = `Интересный астро-факт о ${sign1 || 'знаках зодиака'} и его связь с музыкой.`;
      break;
    case 'gift':
      topicDesc = `Персональный AI-трек как идеальный подарок для ${sign1 || 'любимого человека'}.`;
      break;
    case 'tutorial':
      topicDesc = `Объясни за 30 секунд, как создать персональную мелодию на YupSoul.`;
      break;
  }

  return `Создай сценарий 30-секундного TikTok-видео.

Тема: ${topicDesc}
Рубрика: ${rubricName}
${sign1 ? `Знак 1: ${sign1}` : ''}
${sign2 ? `Знак 2: ${sign2}` : ''}

ТРЕБОВАНИЯ:
- 6-7 сцен, каждая 3-5 секунд
- Первая сцена — сильный хук (вопрос или провокация)
- Последняя сцена — CTA на yupsoul.online или бот @Yup_Soul_bot
- heading: 1-7 слов (БОЛЬШОЙ текст на экране)
- body: 1-2 строки (подпись, необязательно)
- voiceover: текст для озвучки, 1-2 предложения
- Текст живой, разговорный, без официоза
- Итоговая длина: 28-38 секунд

Верни ТОЛЬКО JSON в формате:
{
  "title": "...",
  "music": "cosmic_ambient|energetic|mystical|upbeat",
  "scenes": [
    {
      "id": 1,
      "heading": "...",
      "body": "...",
      "voiceover": "...",
      "duration": 4,
      "isHook": true
    },
    ...
  ],
  "caption": "Текст подписи для TikTok (до 150 символов)",
  "hashtags": ["#астрология", "#гороскоп", "#знакизодиака", "#рек", "#yupsoul"],
  "totalDuration": 32
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

  const scenes: VideoScene[] = (parsed.scenes || []).map((s: Partial<VideoScene>, i: number) => ({
    id: i + 1,
    heading: s.heading || '',
    body: s.body || undefined,
    voiceover: s.voiceover || s.heading || '',
    duration: s.duration || 4,
    isHook: s.isHook || i === 0,
    isCTA: s.isCTA || i === (parsed.scenes?.length ?? 1) - 1,
  }));

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
