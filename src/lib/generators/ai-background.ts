// ============================================================
// AI Background Generator — Pollinations.ai (free, no key)
// Builds a theme-aware prompt from scene + rubric + zodiac sign
// and fetches a 1080×1920 PNG. Used as backdrop behind Satori text.
// ============================================================
import type { VideoScene, ZodiacSign, ContentRubric } from '../types';

const RUBRIC_STYLE: Record<ContentRubric, string> = {
  zodiac_sound:    'cosmic nebula with flowing musical energy waves, ethereal soundscape, glowing sound particles',
  compatibility:   'two celestial souls intertwined in cosmic dance, harmonious aurora, soft pastel nebula',
  zodiac_memes:    'playful surreal dreamscape, vibrant pastel clouds, whimsical cosmic atmosphere',
  zodiac_battle:   'dramatic cosmic clash of elements, lightning and fire meeting ice, epic deep space arena',
  celebrities:     'glamorous starlit stage, vintage neon glow, spotlight beams through mist',
  signs_as_genres: 'abstract musical instruments floating in cosmic space, vinyl records orbiting planets',
  daily_energy:    'sunrise over misty mountains, golden light beams piercing clouds, serene cosmic morning',
  backstage_ai:    'futuristic neural network, glowing particles flowing through digital aurora',
  astro_facts:     'deep space nebula, distant galaxies, constellations glowing on cosmic canvas',
  gift:            'magical wrapped gift floating in dreamy nebula, golden ribbons and sparkles',
  tutorial:        'minimalist abstract interface, glowing neon lines on dark gradient',
  brand_sounds:    'sleek minimalist studio, ambient sound wave patterns, cinematic lighting',
};

const SIGN_IMAGERY: Record<ZodiacSign, string> = {
  aries:       'fiery ram silhouette, red and orange flames, fierce cosmic fire',
  taurus:      'earthy bull in emerald meadow, lush grounded greenery',
  gemini:      'twin ethereal figures in swirling blue mist, dual reflection',
  cancer:      'moonlit ocean waves, silver crab silhouette, tidal shimmer',
  leo:         'majestic lion with golden solar mane, radiant sun rays',
  virgo:       'graceful maiden among golden wheat fields, soft earthy tones',
  libra:       'floating golden scales in balanced cosmos, harmonious light',
  scorpio:     'mysterious scorpion in deep purple shadows, venomous glow',
  sagittarius: 'archer silhouette drawing bow against cosmic sky, shooting arrow of stars',
  capricorn:   'mountain goat on starry snowy peak, icy cosmic summit',
  aquarius:    'flowing water bearer in electric blue aurora, stream of stars',
  pisces:      'two mystical fish swimming through pastel nebula, dreamy underwater cosmos',
};

const BASE_STYLE =
  'cinematic, vertical 9:16 composition, dreamy ethereal atmosphere, soft bokeh, rich depth, ' +
  'mystical spiritual mood, painterly, high quality concept art, ' +
  'no text, no letters, no typography, no watermark, no logo, no human faces';

function sanitize(s: string): string {
  return s.replace(/[\n\r]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 120);
}

export function buildScenePrompt(
  scene: VideoScene,
  rubric?: ContentRubric,
  sign?: ZodiacSign,
  sign2?: ZodiacSign,
): string {
  const parts: string[] = [];
  if (rubric) parts.push(RUBRIC_STYLE[rubric]);
  if (sign) parts.push(SIGN_IMAGERY[sign]);
  if (sign2) parts.push(SIGN_IMAGERY[sign2]);
  // Scene text hint — lets each slide diverge visually while staying on-topic.
  const hint = sanitize(scene.body || scene.heading);
  if (hint) parts.push(`mood: ${hint}`);
  parts.push(BASE_STYLE);
  return parts.join(', ');
}

const _cache = new Map<string, Buffer>();

export async function fetchPollinationsImage(
  prompt: string,
  seed: number,
): Promise<Buffer | null> {
  const cacheKey = `${seed}|${prompt}`;
  const hit = _cache.get(cacheKey);
  if (hit) return hit;

  const url =
    `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}` +
    `?width=1080&height=1920&model=flux&nologo=true&enhance=true&seed=${seed}`;

  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(45000) });
    if (!res.ok) {
      console.warn(`[pollinations] ${res.status} — falling back to gradient`);
      return null;
    }
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length < 2000) {
      console.warn(`[pollinations] tiny payload (${buf.length}B) — treating as failure`);
      return null;
    }
    _cache.set(cacheKey, buf);
    return buf;
  } catch (e) {
    console.warn('[pollinations] fetch error:', (e as Error).message);
    return null;
  }
}

export function bufferToDataUrl(buf: Buffer): string {
  // Sniff magic bytes — Pollinations usually returns JPEG, occasionally PNG.
  const mime =
    buf[0] === 0x89 && buf[1] === 0x50 ? 'image/png' :
    buf[0] === 0xff && buf[1] === 0xd8 ? 'image/jpeg' :
    'image/jpeg';
  return `data:${mime};base64,${buf.toString('base64')}`;
}
