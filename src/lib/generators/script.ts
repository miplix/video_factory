// ============================================================
// Video Script Generator
// LLM → structured 30-second TikTok video script
// Priority: Gemini (free) → DeepSeek (free) → Anthropic
// ============================================================
import type { AppConfig, VideoScript, VideoScene, ZodiacSign, ContentRubric } from '../types';
import { ZODIAC_RU, ZODIAC_EMOJI, RUBRIC_RU, ZODIAC_DATES } from '../types';
import { getActiveLLMProvider } from '../config';
import { pickCelebrities } from '../data/celebrities';
import { pickBrands } from '../data/brands';

// Russian TTS (edge-tts, rate +5%) reads ~15 chars/sec incl. pauses
const CHARS_PER_SEC = 14;
const TAIL_BUFFER_SEC = 1.2;

// --- Viral hook templates -------------------------------------------------
// Rotated per generation; picked randomly (weighted) so every video opens
// differently. Mapped from patterns that actually moved metrics on RU TikTok
// in 2025–2026 (curiosity gap, pattern interrupt, identity call, POV, lists,
// "guess the X", shock-numbers).
type HookStyle =
  | 'guess_sign'       // describe traits of the sign; reveal ONLY at end (NO sign/emoji/dates allowed until reveal)
  | 'pattern_interrupt'// "СТОП. Если ты [знак] — смотри до конца"
  | 'reveal'           // "99% [знаков] НЕ знают свой истинный звук"
  | 'pov'              // "POV: ты [знак] и слышишь это впервые"
  | 'numbered'         // "3 знака которые ломают AI"
  | 'warning'          // "Не включай если ты [знак]"
  | 'shock_number'     // "528 Гц — это ТВОЙ знак"
  | 'vs'               // "[Знак1] vs [Знак2] — чей трек громче"
  | 'secret';          // "Скрытая нота [знака], которую слышишь только ты"

const HOOK_HINTS: Record<HookStyle, string> = {
  guess_sign:
    'Формат ЗАГАДКА: СЦЕНЫ 1–5 описывают поведение / музыкальные привычки / вайб знака БЕЗ ЛЮБЫХ подсказок. ' +
    'ЗАПРЕЩЕНО в сценах 1–5: название знака, эмодзи знака, даты, слова «зодиак/созвездие/знак», имена стихий (огонь/вода/земля/воздух). ' +
    'Только нейтральные черты и метафоры. Сцена 6 (CTA) — РАСКРЫТИЕ: «Это — [знак]. А твой звучит как?». Хук сцены 1: «Угадай знак по звуку».',
  pattern_interrupt:
    'Хук = pattern interrupt. Шаблон: «СТОП. Если ты [знак] — не пролистывай.» Сразу за ним — неожиданный факт, ломающий стереотип.',
  reveal:
    'Хук = разоблачение. Шаблон: «99% [знаков] НЕ знают, как звучит их душа». Дальше раскрываешь ПОЧЕМУ.',
  pov:
    'Хук = POV. Шаблон: «POV: ты [знак] и впервые слышишь СВОЙ AI-трек. Вот что происходит...». Далее сцены — реакция.',
  numbered:
    'Хук = список с числом в первом слове. Шаблон: «3 знака, которые ломают все AI-алгоритмы». Раскрываешь по одному в сценах 2–4.',
  warning:
    'Хук = предупреждение. Шаблон: «Не включай если ты [знак] — затянет на час». Дальше раскрываешь звук, от которого не оторваться.',
  shock_number:
    'Хук = шок-число. Шаблон: «528 Гц — это частота [знака]. Проверь на себе.». Объясняешь что это за частота и что чувствует слушатель.',
  vs:
    'Хук = батл. Шаблон: «[Знак1] против [Знак2]. Чей трек громче?». Серия раундов: энергия / ритм / настроение / финал.',
  secret:
    'Хук = секрет. Шаблон: «Скрытая нота [знака], которую слышишь только ТЫ». Объясняешь уникальность и зовёшь проверить.',
};

// Rubrics where "guess the sign" format actually makes sense (need a sign context).
const GUESS_OK_RUBRICS = new Set(['zodiac_sound', 'zodiac_memes', 'astro_facts', 'daily_energy']);

function pickHookStyle(rubric: ContentRubric, hasSign: boolean, hasTwoSigns: boolean): HookStyle {
  if (rubric === 'compatibility' || rubric === 'zodiac_battle' || hasTwoSigns) return 'vs';
  if (rubric === 'brand_sounds' || rubric === 'signs_as_genres') return 'numbered';
  if (rubric === 'tutorial' || rubric === 'backstage_ai') return 'reveal';
  if (rubric === 'gift') return 'pov';
  if (rubric === 'celebrities') return Math.random() < 0.5 ? 'reveal' : 'secret';

  // Sign-centric rubrics: rotate across the shock styles, with ~30% chance of guess_sign.
  if (hasSign && GUESS_OK_RUBRICS.has(rubric)) {
    const r = Math.random();
    if (r < 0.3) return 'guess_sign';
    const pool: HookStyle[] = ['pattern_interrupt', 'reveal', 'pov', 'warning', 'shock_number', 'secret'];
    return pool[Math.floor(Math.random() * pool.length)];
  }
  const fallback: HookStyle[] = ['pattern_interrupt', 'reveal', 'numbered', 'secret'];
  return fallback[Math.floor(Math.random() * fallback.length)];
}

// --- CTA bank — proven TikTok RU closers ----------------------------------
// Prompt will pick one randomly; voiceover MUST avoid "бот" and @mentions
// (TTS pronounces them poorly), so these are TTS-safe.
const CTA_BANK = [
  'Переходи по ссылке — свой трек за минуту',
  'Создай свой звук — ссылка в шапке',
  'Залетай сейчас — первый трек бесплатно',
  'Жми ссылку в описании — твоя мелодия ждёт',
  'Твой персональный трек — по ссылке',
  'Включай свой звук — ссылка ниже',
  'Получи свой трек — ссылка в профиле',
  'Только сегодня — твой трек по ссылке',
];

function pickCTA(): string {
  return CTA_BANK[Math.floor(Math.random() * CTA_BANK.length)];
}

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

  // Up to 2 tries: generate → LLM self-review → regenerate once if score < 7.
  let best: VideoScript | null = null;
  let bestScore = 0;
  for (let attempt = 1; attempt <= 2; attempt++) {
    const prompt = buildPrompt(opts);
    const systemPrompt = buildSystemPrompt(opts.config);

    let raw: string;
    switch (provider) {
      case 'gemini': raw = await callGemini(prompt, systemPrompt, opts.config); break;
      case 'deepseek': raw = await callDeepSeek(prompt, systemPrompt, opts.config); break;
      case 'anthropic': raw = await callAnthropic(prompt, systemPrompt, opts.config); break;
      default: throw new Error(`Unknown provider: ${provider}`);
    }
    const script = parseScript(raw, opts);

    // Quality gate: only spend a second LLM call on attempt 1.
    if (attempt === 1) {
      try {
        const review = await reviewScript(script, opts);
        console.log(`[script-review] attempt ${attempt} score=${review.score}/10 issues=${review.issues.join('; ') || 'none'}`);
        if (!best || review.score > bestScore) {
          best = script;
          bestScore = review.score;
        }
        if (review.score >= 7) return script; // good enough
        // otherwise regenerate
      } catch (e) {
        console.log(`[script-review] failed, accepting attempt 1: ${e}`);
        return script;
      }
    } else {
      // second attempt: accept whichever is better
      try {
        const review = await reviewScript(script, opts);
        console.log(`[script-review] attempt ${attempt} score=${review.score}/10`);
        if (review.score > bestScore) return script;
      } catch { /* ignore */ }
      return best || script;
    }
  }
  return best!;
}

interface ScriptReview {
  score: number;   // 0-10
  issues: string[];
}

async function reviewScript(script: VideoScript, opts: ScriptGenOptions): Promise<ScriptReview> {
  const provider = getActiveLLMProvider(opts.config);
  if (!provider) return { score: 10, issues: [] };

  const reviewSystem = `Ты — строгий редактор вирусного TikTok-контента. Проверяешь сценарии по критериям:
1. Первая сцена — сильный хук (есть ли крючок в первые 1.5с?)
2. Нет канцелярита, живой разговорный русский
3. Voiceover укладывается в длительность сцены (~14 симв/сек)
4. Нет повторов, нет дженерик-фраз («дорогой друг», «в этом видео»)
5. Финал даёт чёткий CTA
6. Caption цепляющий, не сухой
7. Hashtags: смесь трендов + нишевых

Возвращай ТОЛЬКО JSON: {"score": 0-10, "issues": ["..."]}`;

  const reviewPrompt = `Оцени этот сценарий:

Рубрика: ${RUBRIC_RU[script.rubric]}
${script.zodiacSign ? `Знак: ${ZODIAC_RU[script.zodiacSign]}` : ''}

${script.scenes.map((s, i) =>
  `Сцена ${i + 1} (${s.duration}с)${s.isHook ? ' [ХУК]' : ''}${s.isCTA ? ' [CTA]' : ''}:
  heading: ${s.heading}
  body: ${s.body || '—'}
  voiceover: ${s.voiceover} (${s.voiceover.length} симв)`
).join('\n')}

Caption: ${script.caption}
Hashtags: ${script.hashtags.join(' ')}

Верни JSON со score и list of issues.`;

  let raw: string;
  try {
    switch (provider) {
      case 'gemini': raw = await callGemini(reviewPrompt, reviewSystem, opts.config); break;
      case 'deepseek': raw = await callDeepSeek(reviewPrompt, reviewSystem, opts.config); break;
      case 'anthropic': raw = await callAnthropic(reviewPrompt, reviewSystem, opts.config); break;
      default: return { score: 10, issues: [] };
    }
  } catch {
    return { score: 10, issues: [] };
  }

  let json = raw.trim().replace(/^```[a-z]*\n?/, '').replace(/\n?```$/, '');
  try {
    const parsed = JSON.parse(json);
    return {
      score: Math.max(0, Math.min(10, Number(parsed.score) || 0)),
      issues: Array.isArray(parsed.issues) ? parsed.issues.slice(0, 5).map(String) : [],
    };
  } catch {
    return { score: 10, issues: [] };
  }
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

  const hookStyle = pickHookStyle(opts.rubric, !!opts.zodiacSign, !!opts.zodiacSign2);
  const hookTemplate = HOOK_HINTS[hookStyle];
  const ctaSeed = pickCTA();

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
    case 'brand_sounds': {
      const brands = pickBrands(4);
      const list = brands.map((b) => `— ${b.ru}: ${b.vibe}`).join('\n');
      topicDesc = `Если бы мировые бренды были треками — как бы они звучали?
Возьми 3-4 бренда ТОЛЬКО из списка ниже и опиши их звук (каждому — 4-6 секунд в сцене).
Финал: «У тебя тоже есть свой звук — создай его в юпсол».

ДОСТУПНЫЕ БРЕНДЫ:
${list}

НЕ связывай это со знаками зодиака — тут только стиль брендов.`;
      hookHint = `Хук: «Если бы ${brands[0]?.ru || 'бренды'} был треком — он звучал бы вот так...»`;
      break;
    }
  }

  const sign1Text = sign1Ru ? `${sign1Ru} ${sign1Em}` : '';
  const sign2Text = sign2Ru ? `${sign2Ru} ${sign2Em}` : '';

  // Guess-sign mode requires masking the sign name in the topic description
  // and the hook hint, so LLM has no reason to leak it before the reveal.
  const isGuess = hookStyle === 'guess_sign';
  const maskedTopic = isGuess
    ? `Опиши человека (поведение, привычки, вайб, что слушает, как ведёт себя в быту) БЕЗ упоминания знака зодиака. ` +
      `Сцены 1–5 — чистые описания без подсказок. Сцена 6 (CTA) — раскрытие: «Это — ${sign1Ru}. А твой звучит как?».`
    : topicDesc;

  return `Напиши сценарий вертикального TikTok-видео (30-35 секунд).

Рубрика: ${rubricName}
${sign1Text && !isGuess ? `Знак: ${sign1Text} (${sign1Dates})` : ''}
${sign1Text && isGuess ? `Знак (скрытый, раскрыть ТОЛЬКО в финальной сцене): ${sign1Text}` : ''}
${sign2Text ? `Второй знак: ${sign2Text}` : ''}

ЗАДАЧА:
${maskedTopic}

ВИРУСНЫЙ ХУК (обязательный шаблон сцены 1):
${hookTemplate}
${hookHint && !isGuess ? `Доп. направление: ${hookHint}` : ''}

ПЕРВЫЕ 3 СЕКУНДЫ — ШОК:
— Сцена 1 должна УДАРИТЬ. Провокация / вызов / секрет / число / POV.
— НЕЛЬЗЯ: мягкое вступление, «привет, сегодня расскажу», описательный зачин.
— МОЖНО: резкая фраза, неожиданное число, прямое обращение к зрителю, вопрос-разрыв шаблона.

ЖЁСТКИЕ ТРЕБОВАНИЯ:

1. СЦЕНЫ (6 штук, по 4-6 секунд):
   — Сцена 1 (4с, isHook: true): КРЮЧОК по шаблону выше. Без «добро пожаловать», без мягких заходов.
   — Сцены 2-5: раскрытие темы, с градацией интереса. Payoff (главный инсайт) — в сцене 3 или 4.
   — Последняя сцена (5с, isCTA: true): CTA. В voiceover НЕ употребляй слова «бот» и @mentions (TTS путается).
     Возьми за основу: «${ctaSeed}». Можешь слегка перефразировать, но сохрани смысл и длину (до 72 симв).

2. heading (то, что видно на слайде, КРУПНО):
   — 2-6 слов максимум.
   — Без кавычек, без эмодзи.
   — Каждый heading самодостаточен (человек поймёт даже без звука).
   ${isGuess ? '— В heading сцен 1–5 НЕЛЬЗЯ писать название знака, эмодзи знака, даты, стихию. Только нейтральные слова.' : ''}

3. body (мелкий подзаголовок, опционально):
   — 0-8 слов. Уточнение / deadpan-комментарий. Может отсутствовать.
   ${isGuess ? '— В body сцен 1–5 ТАКЖЕ запрещены знак/эмодзи/даты/стихия.' : ''}

4. voiceover (озвучка, КРИТИЧНО по длине):
   — Сцена 4с: до 55 символов. Сцена 5с: до 72 символов. Сцена 6с: до 88 символов.
   — Живой разговорный русский. Никакого «дорогой зритель», никакого официоза.
   — Текст ЧИТАЕТСЯ как от лица друга, а не диктора.
   — ОБЯЗАТЕЛЬНО уложиться в лимит символов — иначе голос оборвётся на середине фразы.
   ${isGuess ? '— В voiceover сцен 1–5 ТАКЖЕ запрещены знак/эмодзи/даты/стихия/созвездие.' : ''}

5. CAPTION (подпись TikTok — КОРОТКАЯ!):
   — МАКСИМУМ 80 символов. Это жёсткое ограничение — TikTok обрезает длинное под кнопкой «ещё».
   — Формула: один хлёсткий крючок + 1 эмодзи в конце. Без CTA — CTA уже в видео.
   — Пример: «${isGuess ? 'Угадал знак? 🎧' : sign1Ru ? `${sign1Ru} звучит громче всех 🔥` : 'Твой звук ждёт 🎧'}»

6. HASHTAGS (строго 5 штук — качество важнее количества):
   — 5 тегов: 1 широкий (#рек или #fyp), 2 нишевых (#астрология #гороскоп), 1 точечный (#${sign1Ru ? sign1Ru.toLowerCase() : 'зодиак'} или #музыка), 1 брендовый (#yupsoul).
   — Без пробелов внутри тега. Только реальные трендовые.

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

  // Caption hard-limit: TikTok truncates past ~80 chars under the "...ещё".
  const rawCaption = (parsed.caption || '').trim();
  const caption = rawCaption.length > 80 ? rawCaption.slice(0, 79).replace(/\s+\S*$/, '') + '…' : rawCaption;

  // Hashtag hard-limit: 5 max, unique, ensure #yupsoul present.
  const tags = Array.from(new Set((parsed.hashtags || [])
    .map((t) => String(t).trim())
    .filter((t) => t.startsWith('#'))))
    .slice(0, 5);
  if (!tags.some((t) => t.toLowerCase() === '#yupsoul')) {
    if (tags.length >= 5) tags.pop();
    tags.push('#yupsoul');
  }

  return {
    title: parsed.title || 'YupSoul Video',
    zodiacSign: opts.zodiacSign,
    zodiacSign2: opts.zodiacSign2,
    rubric: opts.rubric,
    scenes,
    caption,
    hashtags: tags.length ? tags : ['#рек', '#астрология', '#гороскоп', '#музыка', '#yupsoul'],
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
    'brand_sounds',
  ];

  const rubric = rubrics[Math.floor(Math.random() * rubrics.length)];
  const sign1 = signs[Math.floor(Math.random() * signs.length)];

  if (rubric === 'compatibility' || rubric === 'zodiac_battle') {
    let sign2 = signs[Math.floor(Math.random() * signs.length)];
    while (sign2 === sign1) sign2 = signs[Math.floor(Math.random() * signs.length)];
    return { zodiacSign: sign1, zodiacSign2: sign2, rubric };
  }

  if (rubric === 'signs_as_genres' || rubric === 'brand_sounds') {
    return { rubric };
  }

  return { zodiacSign: sign1, rubric };
}
