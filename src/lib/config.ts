import type { AppConfig } from './types';

function env(key: string, fallback = ''): string {
  return process.env[key] ?? fallback;
}

function required(key: string): string {
  const val = process.env[key];
  if (!val) throw new Error(`Missing required env var: ${key}`);
  return val;
}

export function loadConfig(): AppConfig {
  return {
    brand: {
      name: env('BRAND_NAME', 'YupSoul'),
      botUrl: env('BRAND_BOT_URL', 'https://t.me/Yup_Soul_bot'),
      siteUrl: env('BRAND_SITE_URL', 'https://yupsoul.ru'),
      language: (env('BRAND_LANGUAGE', 'ru') as 'ru' | 'en'),
    },
    llm: {
      geminiApiKey: env('GEMINI_API_KEY') || undefined,
      geminiModel: env('GEMINI_MODEL', 'gemini-2.5-flash-lite'),
      deepseekApiKey: env('DEEPSEEK_API_KEY') || undefined,
      anthropicApiKey: env('ANTHROPIC_API_KEY') || undefined,
    },
    tts: {
      fishAudioApiKey: env('FISH_AUDIO_API_KEY') || undefined,
      fishAudioVoiceId: env('FISH_AUDIO_VOICE_ID', 'ad9d7ac98da2471fae4a5a44a86cfb08'),
      elevenLabsApiKey: env('ELEVENLABS_API_KEY') || undefined,
      elevenLabsVoiceId: env('ELEVENLABS_VOICE_ID', '21m00Tcm4TlvDq8ikWAM'),
    },
    storage: {
      r2AccountId: env('R2_ACCOUNT_ID'),
      r2AccessKeyId: env('R2_ACCESS_KEY_ID'),
      r2SecretAccessKey: env('R2_SECRET_ACCESS_KEY'),
      r2BucketName: env('R2_BUCKET_NAME', 'yupsoul-videos'),
      r2PublicUrl: env('R2_PUBLIC_URL', ''),
    },
    github: {
      owner: env('GITHUB_OWNER'),
      repo: env('GITHUB_REPO'),
      token: env('GITHUB_PAT'),
      workflow: env('GITHUB_WORKFLOW', 'render-video.yml'),
    },
    telegram: {
      botToken: env('TELEGRAM_BOT_TOKEN'),
      chatId: env('TELEGRAM_CHAT_ID'),
    },
    cronSecret: env('CRON_SECRET'),
    renderWebhookSecret: env('RENDER_WEBHOOK_SECRET'),
  };
}

export function getActiveLLMProvider(config: AppConfig): 'gemini' | 'deepseek' | 'anthropic' | null {
  if (config.llm.geminiApiKey) return 'gemini';
  if (config.llm.deepseekApiKey) return 'deepseek';
  if (config.llm.anthropicApiKey) return 'anthropic';
  return null;
}

export function getActiveTTSProvider(config: AppConfig): 'fish' | 'elevenlabs' | null {
  if (config.tts.fishAudioApiKey) return 'fish';
  if (config.tts.elevenLabsApiKey) return 'elevenlabs';
  return null;
}
