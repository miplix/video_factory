// ============================================================
// AI Background Prompt Builder
// The actual Pollinations HTTP fetch happens in GitHub Actions
// (see render-video.yml "Fetch AI backgrounds" step) — Vercel's
// 60s function cap is too tight for 6 serialized inference calls.
// This module only builds the prompt strings that get passed to CI.
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
  const hint = sanitize(scene.body || scene.heading);
  if (hint) parts.push(`mood: ${hint}`);
  parts.push(BASE_STYLE);
  return parts.join(', ');
}

export function buildAllScenePrompts(
  scenes: VideoScene[],
  rubric?: ContentRubric,
  sign?: ZodiacSign,
  sign2?: ZodiacSign,
): string[] {
  return scenes.map(s => buildScenePrompt(s, rubric, sign, sign2));
}
