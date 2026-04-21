// ============================================================
// Video Factory — Core Types (YupSoul)
// ============================================================

export type ZodiacSign =
  | 'aries' | 'taurus' | 'gemini' | 'cancer'
  | 'leo' | 'virgo' | 'libra' | 'scorpio'
  | 'sagittarius' | 'capricorn' | 'aquarius' | 'pisces';

export const ZODIAC_SIGNS: ZodiacSign[] = [
  'aries', 'taurus', 'gemini', 'cancer',
  'leo', 'virgo', 'libra', 'scorpio',
  'sagittarius', 'capricorn', 'aquarius', 'pisces',
];

export const ZODIAC_RU: Record<ZodiacSign, string> = {
  aries: 'Овен', taurus: 'Телец', gemini: 'Близнецы', cancer: 'Рак',
  leo: 'Лев', virgo: 'Дева', libra: 'Весы', scorpio: 'Скорпион',
  sagittarius: 'Стрелец', capricorn: 'Козерог', aquarius: 'Водолей', pisces: 'Рыбы',
};

export const ZODIAC_EMOJI: Record<ZodiacSign, string> = {
  aries: '♈️', taurus: '♉️', gemini: '♊️', cancer: '♋️',
  leo: '♌️', virgo: '♍️', libra: '♎️', scorpio: '♏️',
  sagittarius: '♐️', capricorn: '♑️', aquarius: '♒️', pisces: '♓️',
};

export const ZODIAC_DATES: Record<ZodiacSign, string> = {
  aries: '21 марта — 19 апреля',
  taurus: '20 апреля — 20 мая',
  gemini: '21 мая — 20 июня',
  cancer: '21 июня — 22 июля',
  leo: '23 июля — 22 августа',
  virgo: '23 августа — 22 сентября',
  libra: '23 сентября — 22 октября',
  scorpio: '23 октября — 21 ноября',
  sagittarius: '22 ноября — 21 декабря',
  capricorn: '22 декабря — 19 января',
  aquarius: '20 января — 18 февраля',
  pisces: '19 февраля — 20 марта',
};

export type ContentRubric =
  | 'zodiac_sound'
  | 'compatibility'
  | 'zodiac_memes'
  | 'zodiac_battle'
  | 'celebrities'
  | 'signs_as_genres'
  | 'daily_energy'
  | 'backstage_ai'
  | 'astro_facts'
  | 'gift'
  | 'tutorial';

export const RUBRIC_RU: Record<ContentRubric, string> = {
  zodiac_sound: 'Звук твоего знака',
  compatibility: 'Совместимость',
  zodiac_memes: 'Знаки в ситуациях',
  zodiac_battle: 'Батл знаков',
  celebrities: 'Знаменитости и их звук',
  signs_as_genres: 'Знаки как жанры',
  daily_energy: 'Энергия дня',
  backstage_ai: 'Как AI создаёт музыку',
  astro_facts: 'Астро-факты',
  gift: 'Подарок',
  tutorial: 'Как это работает',
};

// --- Video Scene ---
export interface VideoScene {
  id: number;
  heading: string;
  body?: string;
  voiceover: string;
  duration: number;    // seconds
  isHook?: boolean;
  isCTA?: boolean;
  accentColor?: string;
}

// --- Video Script ---
export interface VideoScript {
  title: string;
  zodiacSign?: ZodiacSign;
  zodiacSign2?: ZodiacSign;
  rubric: ContentRubric;
  scenes: VideoScene[];
  caption: string;
  hashtags: string[];
  totalDuration: number;
  music?: 'cosmic_ambient' | 'energetic' | 'mystical' | 'upbeat';
}

// --- Job Status ---
export type JobStatus =
  | 'pending'
  | 'generating_script'
  | 'rendering_slides'
  | 'generating_voice'
  | 'uploading'
  | 'rendering_video'
  | 'done'
  | 'failed';

// --- Video Job ---
export interface VideoJob {
  id: string;
  status: JobStatus;
  zodiacSign?: ZodiacSign;
  zodiacSign2?: ZodiacSign;
  rubric: ContentRubric;

  // Generated assets (R2 URLs)
  slideUrls?: string[];
  audioUrl?: string;
  videoUrl?: string;
  videoPublicUrl?: string;

  // Script data
  script?: VideoScript;

  // Caption / hashtags for posting
  caption?: string;
  hashtags?: string[];

  // Metadata
  createdAt: string;
  updatedAt: string;
  error?: string;
  githubRunId?: string;
  scheduledAt?: string;
}

// --- Config ---
export interface AppConfig {
  brand: {
    name: string;
    botUrl: string;
    siteUrl: string;
    language: 'ru' | 'en';
  };
  llm: {
    geminiApiKey?: string;
    geminiModel: string;
    deepseekApiKey?: string;
    anthropicApiKey?: string;
  };
  tts: {
    fishAudioApiKey?: string;
    fishAudioVoiceId?: string;
    elevenLabsApiKey?: string;
    elevenLabsVoiceId?: string;
  };
  storage: {
    r2AccountId: string;
    r2AccessKeyId: string;
    r2SecretAccessKey: string;
    r2BucketName: string;
    r2PublicUrl: string;
  };
  github: {
    owner: string;
    repo: string;
    token: string;
    workflow: string;
  };
  telegram: {
    botToken: string;
    chatId: string;
  };
  cronSecret: string;
  renderWebhookSecret: string;
}
