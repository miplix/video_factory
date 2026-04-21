import { NextResponse } from 'next/server';
import { loadConfig, getActiveLLMProvider, getActiveTTSProvider } from '@/lib/config';

export async function GET() {
  const config = loadConfig();
  return NextResponse.json({
    ok: true,
    llm: getActiveLLMProvider(config) || 'none',
    tts: getActiveTTSProvider(config) || 'none',
    storage: config.storage.r2AccountId ? 'r2' : 'none',
    github: config.github.token ? `${config.github.owner}/${config.github.repo}` : 'not configured',
    telegram: config.telegram.botToken ? 'configured' : 'not configured',
    timestamp: new Date().toISOString(),
  });
}
