// ============================================================
// Voiceover Generator
// Fish Audio (free 200 min/mo) → ElevenLabs (free 10k chars/mo)
// Combines all scene voiceovers into a single MP3
// ============================================================
import type { AppConfig, VideoScene } from '../types';
import { getActiveTTSProvider } from '../config';

export async function generateVoiceover(
  scenes: VideoScene[],
  config: AppConfig
): Promise<Buffer> {
  const provider = getActiveTTSProvider(config);
  if (!provider) throw new Error('No TTS provider configured. Set FISH_AUDIO_API_KEY or ELEVENLABS_API_KEY');

  const fullText = scenes
    .map(s => s.voiceover)
    .join(' ... ');

  switch (provider) {
    case 'fish':
      return generateFishAudio(fullText, config);
    case 'elevenlabs':
      return generateElevenLabs(fullText, config);
    default:
      throw new Error(`Unknown TTS provider: ${provider}`);
  }
}

async function generateFishAudio(text: string, config: AppConfig): Promise<Buffer> {
  const voiceId = config.tts.fishAudioVoiceId || 'ad9d7ac98da2471fae4a5a44a86cfb08';

  const res = await fetch(`https://api.fish.audio/v1/tts`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${config.tts.fishAudioApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      text,
      reference_id: voiceId,
      format: 'mp3',
      mp3_bitrate: 128,
      latency: 'normal',
      normalize: true,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Fish Audio TTS error ${res.status}: ${err}`);
  }

  const arrayBuffer = await res.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

async function generateElevenLabs(text: string, config: AppConfig): Promise<Buffer> {
  const voiceId = config.tts.elevenLabsVoiceId || '21m00Tcm4TlvDq8ikWAM';

  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'xi-api-key': config.tts.elevenLabsApiKey!,
    },
    body: JSON.stringify({
      text,
      model_id: 'eleven_multilingual_v2',
      voice_settings: {
        stability: 0.5,
        similarity_boost: 0.75,
        style: 0.3,
        use_speaker_boost: true,
      },
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`ElevenLabs TTS error ${res.status}: ${err}`);
  }

  const arrayBuffer = await res.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

// Build SSML pause markers for scene boundaries
export function buildTimedText(scenes: VideoScene[]): string {
  return scenes.map(s => s.voiceover).join(' <break time="500ms"/> ');
}
