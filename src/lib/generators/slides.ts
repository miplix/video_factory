// ============================================================
// Slide Renderer — Satori + Resvg → PNG (1080×1920)
// Each scene from VideoScript becomes a 9:16 PNG frame
// ============================================================
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
import fs from 'node:fs';
import path from 'node:path';
import type { VideoScene, ZodiacSign, ContentRubric } from '../types';
import { ZODIAC_RU, ZODIAC_EMOJI } from '../types';

// NOTE: slides are rendered with a TRANSPARENT background + darkening
// overlay. The AI backdrop (or gradient fallback) is composited underneath
// in GitHub Actions — see render-video.yml "Fetch AI backgrounds" step.

const W = 1080;
const H = 1920;

const COLORS = {
  deepSpace: '#0A0A1A',
  cosmicBlue: '#12122E',
  deepPurple: '#2D1B69',
  midPurple: '#4A2980',
  softGold: '#D4A574',
  neonLavender: '#B794F6',
  cosmicPink: '#F687B3',
  starWhite: '#F7FAFC',
  nebulaGray: '#A0AEC0',
  tealGlow: '#38B2AC',
};

let _fontRegular: ArrayBuffer | null = null;
let _fontBold: ArrayBuffer | null = null;

// --- Emoji support via twemoji SVG CDN ----------------------------------
// Satori ships without emoji glyphs. When it encounters an emoji grapheme,
// it calls loadAdditionalAsset(code='emoji', segment=emoji).
// We resolve the grapheme to the matching twemoji SVG and return a data URL.
const _emojiCache = new Map<string, string>();

function emojiToTwemojiHex(emoji: string): string {
  const cps: string[] = [];
  for (const ch of [...emoji]) {
    const cp = ch.codePointAt(0);
    if (!cp) continue;
    if (cp === 0xfe0f) continue; // skip variation selector-16 (twemoji omits it)
    cps.push(cp.toString(16));
  }
  return cps.join('-');
}

async function loadEmojiAsset(code: string, segment: string): Promise<string> {
  if (code !== 'emoji') return segment;
  if (_emojiCache.has(segment)) return _emojiCache.get(segment)!;
  const hex = emojiToTwemojiHex(segment);
  if (!hex) return segment;
  try {
    const url = `https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/svg/${hex}.svg`;
    const res = await fetch(url);
    if (!res.ok) return segment;
    const svg = await res.text();
    const dataUrl = `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
    _emojiCache.set(segment, dataUrl);
    return dataUrl;
  } catch {
    return segment;
  }
}

function loadFonts() {
  if (_fontRegular && _fontBold) return { regular: _fontRegular, bold: _fontBold };

  const candidates = [
    path.join(process.cwd(), 'src/lib/fonts'),
    path.join(process.cwd(), 'public/fonts'),
    path.join(__dirname, '../fonts'),
  ];

  for (const dir of candidates) {
    const r = path.join(dir, 'Inter-Regular.ttf');
    const b = path.join(dir, 'Inter-Bold.ttf');
    if (fs.existsSync(r) && fs.existsSync(b)) {
      _fontRegular = fs.readFileSync(r).buffer.slice(0) as ArrayBuffer;
      _fontBold = fs.readFileSync(b).buffer.slice(0) as ArrayBuffer;
      return { regular: _fontRegular, bold: _fontBold };
    }
  }

  throw new Error(`Fonts not found. Tried: ${candidates.join(', ')}`);
}

function headingFontSize(text: string, isHook: boolean): number {
  const len = text.length;
  if (isHook) {
    if (len < 20) return 112;
    if (len < 40) return 88;
    if (len < 70) return 72;
    return 60;
  }
  if (len < 20) return 96;
  if (len < 40) return 80;
  if (len < 70) return 64;
  return 52;
}

// Star field as SVG circles — deterministic based on index
function starField(sceneIndex: number): string {
  const stars: string[] = [];
  const seed = sceneIndex * 13;
  for (let i = 0; i < 60; i++) {
    const x = ((seed + i * 137.508) % 1080).toFixed(0);
    const y = ((seed + i * 199.31) % 1920).toFixed(0);
    const r = (0.5 + (i % 4) * 0.4).toFixed(1);
    const op = (0.3 + (i % 5) * 0.14).toFixed(2);
    stars.push(`<circle cx="${x}" cy="${y}" r="${r}" fill="white" opacity="${op}"/>`);
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1920" style="position:absolute;top:0;left:0">${stars.join('')}</svg>`;
}

const BRAND_NAME = 'YupSoul';
const BRAND_SITE_HOST = (process.env.BRAND_SITE_URL || 'https://yupsoul.ru')
  .replace(/^https?:\/\//, '')
  .replace(/\/$/, '');

// --- Theme system ------------------------------------------------------
// Each theme = 3 HSL stops + accent. Within one video we pick ONE theme
// (by sign/rubric seed) and apply tiny per-scene hue drift (~±8°) so
// slides feel cohesive. Across different videos the seed picks a
// different theme, giving strong visual contrast between topics.
type HSL = [number, number, number]; // hue, sat%, light%
interface Theme {
  a: HSL; // top-left gradient stop
  b: HSL; // middle stop
  c: HSL; // bottom-right stop
  accents: string[]; // accent pool (per-scene rotation inside one theme)
  angle: number; // gradient angle base
}

// Sign-family themes (fire / earth / air / water) + rubric themes.
const THEMES: Record<string, Theme> = {
  fire: {
    a: [12, 65, 8], b: [18, 75, 20], c: [345, 70, 14],
    accents: ['#F6AD55', '#FBD38D', '#F687B3', '#FC8181'],
    angle: 155,
  },
  earth: {
    a: [140, 25, 7], b: [45, 35, 18], c: [95, 30, 12],
    accents: ['#D4A574', '#F6E05E', '#9AE6B4', '#B794A0'],
    angle: 160,
  },
  air: {
    a: [220, 50, 8], b: [195, 60, 22], c: [260, 45, 14],
    accents: ['#90CDF4', '#B794F6', '#F7FAFC', '#38B2AC'],
    angle: 150,
  },
  water: {
    a: [250, 55, 6], b: [225, 65, 18], c: [280, 55, 12],
    accents: ['#B794F6', '#90CDF4', '#F687B3', '#38B2AC'],
    angle: 165,
  },
  cosmic: {
    a: [245, 60, 6], b: [270, 70, 18], c: [230, 60, 10],
    accents: ['#B794F6', '#D4A574', '#F687B3', '#38B2AC'],
    angle: 160,
  },
  brand_sounds: {
    a: [210, 12, 7], b: [200, 18, 18], c: [0, 0, 12],
    accents: ['#E2E8F0', '#D4A574', '#9AE6B4', '#B794F6'],
    angle: 145,
  },
  celebrities: {
    a: [0, 0, 6], b: [40, 60, 18], c: [330, 35, 10],
    accents: ['#F6D56B', '#FBD38D', '#F687B3', '#FC8181'],
    angle: 150,
  },
  gift: {
    a: [340, 50, 8], b: [15, 60, 20], c: [280, 45, 12],
    accents: ['#F687B3', '#F6AD55', '#FBD38D', '#B794F6'],
    angle: 155,
  },
  tutorial: {
    a: [210, 40, 8], b: [190, 50, 18], c: [240, 40, 12],
    accents: ['#90CDF4', '#38B2AC', '#B794F6', '#E2E8F0'],
    angle: 160,
  },
};

const SIGN_FAMILY: Record<ZodiacSign, 'fire' | 'earth' | 'air' | 'water'> = {
  aries: 'fire', leo: 'fire', sagittarius: 'fire',
  taurus: 'earth', virgo: 'earth', capricorn: 'earth',
  gemini: 'air', libra: 'air', aquarius: 'air',
  cancer: 'water', scorpio: 'water', pisces: 'water',
};

function hashStr(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function pickTheme(rubric?: ContentRubric, sign?: ZodiacSign, seed?: string): Theme {
  // Rubric-specific themes win over sign family (except zodiac-centric rubrics).
  const signCentric: ContentRubric[] = [
    'zodiac_sound', 'compatibility', 'zodiac_memes', 'zodiac_battle',
    'signs_as_genres', 'daily_energy', 'astro_facts',
  ];
  if (rubric === 'brand_sounds') return THEMES.brand_sounds;
  if (rubric === 'celebrities') return THEMES.celebrities;
  if (rubric === 'gift') return THEMES.gift;
  if (rubric === 'tutorial' || rubric === 'backstage_ai') return THEMES.tutorial;
  if (sign && (!rubric || signCentric.includes(rubric))) {
    return THEMES[SIGN_FAMILY[sign]];
  }
  // Fallback: pick one of the four families by seed so unrelated jobs diverge.
  const pool = ['fire', 'earth', 'air', 'water', 'cosmic'];
  const pick = pool[(seed ? hashStr(seed) : 0) % pool.length];
  return THEMES[pick];
}

function hsl([h, s, l]: HSL, hueShift = 0, satShift = 0, lightShift = 0): string {
  const hh = ((h + hueShift) % 360 + 360) % 360;
  const ss = Math.max(0, Math.min(100, s + satShift));
  const ll = Math.max(0, Math.min(100, l + lightShift));
  return `hsl(${hh.toFixed(1)}, ${ss.toFixed(1)}%, ${ll.toFixed(1)}%)`;
}

function buildBackground(theme: Theme, sceneIndex: number, seed: number): string {
  // Small per-scene drift so slides inside one video feel cohesive but not identical.
  // Hue wobbles ±8°, lightness ±2%, gradient angle ±6°.
  const hueDrift = ((sceneIndex * 7 + seed) % 17) - 8;
  const lightDrift = ((sceneIndex * 3 + seed) % 5) - 2;
  const angleDrift = ((sceneIndex * 5 + seed) % 13) - 6;
  const angle = theme.angle + angleDrift;
  const a = hsl(theme.a, hueDrift, 0, lightDrift);
  const b = hsl(theme.b, hueDrift, 0, lightDrift);
  const c = hsl(theme.c, hueDrift, 0, lightDrift);
  return `linear-gradient(${angle}deg, ${a} 0%, ${b} 50%, ${c} 100%)`;
}

export interface RenderSlideOptions {
  scene: VideoScene;
  sceneIndex: number;
  totalScenes: number;
  zodiacSign?: ZodiacSign;
  zodiacSign2?: ZodiacSign;
  rubric?: ContentRubric;
  themeSeed?: string; // jobId or title — keeps one video cohesive
}

export async function renderSlide(opts: RenderSlideOptions): Promise<Buffer> {
  const { scene, sceneIndex, zodiacSign, zodiacSign2, rubric, themeSeed } = opts;
  const fonts = loadFonts();

  const isHook = scene.isHook || sceneIndex === 0;
  const isCTA = scene.isCTA || sceneIndex === opts.totalScenes - 1;

  const headingSize = headingFontSize(scene.heading, isHook);

  // Seed derived from job identity — keeps one video cohesive, different
  // jobs diverge.
  const seedStr = `${themeSeed || ''}|${rubric || ''}|${zodiacSign || ''}|${zodiacSign2 || ''}`;
  const seed = hashStr(seedStr) % 997;
  const theme = pickTheme(rubric, zodiacSign, seedStr);
  const bg = buildBackground(theme, sceneIndex, seed);

  // Accent rotates within the theme's own pool (not global rainbow).
  const accent = scene.accentColor || theme.accents[(sceneIndex + seed) % theme.accents.length];

  // Sign display
  const signText = zodiacSign ? `${ZODIAC_EMOJI[zodiacSign]} ${ZODIAC_RU[zodiacSign]}` : '';
  const sign2Text = zodiacSign2 ? ` × ${ZODIAC_EMOJI[zodiacSign2]} ${ZODIAC_RU[zodiacSign2]}` : '';

  // Slides are rendered with a transparent root — the CI step "Composite
  // slides over AI backgrounds" puts either a Pollinations image or a
  // gradient fallback underneath. The darkening overlay keeps text legible
  // over any backdrop. `bg` (brand gradient) is kept around for diagnostics
  // but not applied — leaving transparent so ffmpeg overlay works cleanly.
  void bg;
  const rootStyle: Record<string, unknown> = {
    width: W,
    height: H,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: '"Inter", sans-serif',
    position: 'relative',
    overflow: 'hidden',
  };

  const jsx = {
    type: 'div',
    props: {
      style: rootStyle,
      children: [
        // Darkening gradient overlay — readable text over any backdrop.
        // Darker at top/bottom where headline + CTA sit, lighter mid-frame.
        {
          type: 'div',
          props: {
            style: {
              position: 'absolute',
              top: 0,
              left: 0,
              width: W,
              height: H,
              background:
                'linear-gradient(180deg, rgba(10,10,26,0.78) 0%, rgba(10,10,26,0.35) 35%, rgba(10,10,26,0.35) 65%, rgba(10,10,26,0.88) 100%)',
            },
          },
        },
        // Top glow orb
        {
          type: 'div',
          props: {
            style: {
              position: 'absolute',
              top: -200,
              left: '50%',
              transform: 'translateX(-50%)',
              width: 700,
              height: 700,
              borderRadius: '50%',
              background: `radial-gradient(circle, ${accent}22 0%, transparent 70%)`,
            },
          },
        },
        // Bottom glow
        {
          type: 'div',
          props: {
            style: {
              position: 'absolute',
              bottom: -150,
              left: '50%',
              transform: 'translateX(-50%)',
              width: 600,
              height: 600,
              borderRadius: '50%',
              background: `radial-gradient(circle, ${accent}18 0%, transparent 70%)`,
            },
          },
        },

        // Brand / sign header
        signText ? {
          type: 'div',
          props: {
            style: {
              position: 'absolute',
              top: 80,
              left: 0,
              right: 0,
              display: 'flex',
              justifyContent: 'center',
              fontSize: 44,
              fontWeight: 700,
              color: accent,
              letterSpacing: 2,
            },
            children: signText + sign2Text,
          },
        } : null,

        // Scene number dots
        {
          type: 'div',
          props: {
            style: {
              position: 'absolute',
              top: signText ? 150 : 80,
              left: 0,
              right: 0,
              display: 'flex',
              justifyContent: 'center',
              gap: 10,
            },
            children: Array.from({ length: opts.totalScenes }).map((_, i) => ({
              type: 'div',
              props: {
                key: i,
                style: {
                  width: i === sceneIndex ? 28 : 10,
                  height: 10,
                  borderRadius: 5,
                  background: i === sceneIndex ? accent : `${COLORS.nebulaGray}55`,
                },
              },
            })),
          },
        },

        // Main content block
        {
          type: 'div',
          props: {
            style: {
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              paddingLeft: 72,
              paddingRight: 72,
              gap: 36,
              zIndex: 1,
            },
            children: [
              // Heading
              {
                type: 'div',
                props: {
                  style: {
                    fontSize: headingSize,
                    fontWeight: 700,
                    color: COLORS.starWhite,
                    textAlign: 'center',
                    lineHeight: 1.15,
                    letterSpacing: isHook ? 1 : 0,
                  },
                  children: scene.heading,
                },
              },

              // Accent underline
              {
                type: 'div',
                props: {
                  style: {
                    width: 80,
                    height: 4,
                    borderRadius: 2,
                    background: accent,
                  },
                },
              },

              // Body text
              scene.body ? {
                type: 'div',
                props: {
                  style: {
                    fontSize: 44,
                    fontWeight: 400,
                    color: COLORS.nebulaGray,
                    textAlign: 'center',
                    lineHeight: 1.5,
                    maxWidth: 900,
                  },
                  children: scene.body,
                },
              } : null,
            ].filter(Boolean),
          },
        },

        // Brand header — top-left on EVERY slide
        {
          type: 'div',
          props: {
            style: {
              position: 'absolute',
              top: 70,
              left: 60,
              display: 'flex',
              alignItems: 'center',
              gap: 14,
              fontSize: 38,
              fontWeight: 700,
              color: COLORS.starWhite,
              letterSpacing: 2,
              textTransform: 'uppercase',
            },
            children: [
              {
                type: 'div',
                props: {
                  style: {
                    width: 12,
                    height: 12,
                    borderRadius: 6,
                    background: accent,
                    boxShadow: `0 0 12px ${accent}`,
                  },
                },
              },
              BRAND_NAME,
            ],
          },
        },

        // CTA footer
        isCTA ? {
          type: 'div',
          props: {
            style: {
              position: 'absolute',
              bottom: 140,
              left: 0,
              right: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 16,
            },
            children: [
              {
                type: 'div',
                props: {
                  style: {
                    background: accent,
                    borderRadius: 60,
                    paddingTop: 28,
                    paddingBottom: 28,
                    paddingLeft: 72,
                    paddingRight: 72,
                    fontSize: 48,
                    fontWeight: 700,
                    color: COLORS.deepSpace,
                  },
                  children: BRAND_SITE_HOST,
                },
              },
              {
                type: 'div',
                props: {
                  style: {
                    fontSize: 40,
                    color: `${COLORS.starWhite}88`,
                  },
                  children: '✨ Создай свою мелодию',
                },
              },
            ],
          },
        } : null,

        // Site URL watermark (non-CTA slides)
        !isCTA ? {
          type: 'div',
          props: {
            style: {
              position: 'absolute',
              bottom: 60,
              right: 60,
              fontSize: 30,
              fontWeight: 600,
              color: `${accent}99`,
              letterSpacing: 1,
            },
            children: BRAND_SITE_HOST,
          },
        } : null,
      ].filter(Boolean),
    },
  };

  const svg = await satori(jsx as Parameters<typeof satori>[0], {
    width: W,
    height: H,
    fonts: [
      { name: 'Inter', data: fonts.regular, weight: 400, style: 'normal' },
      { name: 'Inter', data: fonts.bold, weight: 700, style: 'normal' },
    ],
    loadAdditionalAsset: loadEmojiAsset,
  });

  const resvg = new Resvg(svg, {
    fitTo: { mode: 'width', value: W },
  });

  return Buffer.from(resvg.render().asPng());
}

export async function renderAllSlides(
  scenes: VideoScene[],
  zodiacSign?: ZodiacSign,
  zodiacSign2?: ZodiacSign,
  rubric?: ContentRubric,
  themeSeed?: string,
): Promise<Buffer[]> {
  const buffers: Buffer[] = [];
  for (let i = 0; i < scenes.length; i++) {
    const buf = await renderSlide({
      scene: scenes[i],
      sceneIndex: i,
      totalScenes: scenes.length,
      zodiacSign,
      zodiacSign2,
      rubric,
      themeSeed,
    });
    buffers.push(buf);
  }
  return buffers;
}
