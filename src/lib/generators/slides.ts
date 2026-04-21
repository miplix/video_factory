// ============================================================
// Slide Renderer — Satori + Resvg → PNG (1080×1920)
// Each scene from VideoScript becomes a 9:16 PNG frame
// ============================================================
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
import fs from 'node:fs';
import path from 'node:path';
import type { VideoScene, ZodiacSign } from '../types';
import { ZODIAC_RU, ZODIAC_EMOJI } from '../types';

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

export interface RenderSlideOptions {
  scene: VideoScene;
  sceneIndex: number;
  totalScenes: number;
  zodiacSign?: ZodiacSign;
  zodiacSign2?: ZodiacSign;
}

export async function renderSlide(opts: RenderSlideOptions): Promise<Buffer> {
  const { scene, sceneIndex, zodiacSign, zodiacSign2 } = opts;
  const fonts = loadFonts();

  const isHook = scene.isHook || sceneIndex === 0;
  const isCTA = scene.isCTA || sceneIndex === opts.totalScenes - 1;

  const headingSize = headingFontSize(scene.heading, isHook);

  // Background gradient variant per scene
  const bgGradients = [
    `linear-gradient(160deg, #0A0A1A 0%, #2D1B69 50%, #0A0A1A 100%)`,
    `linear-gradient(140deg, #0A0A1A 0%, #1A1040 40%, #3D1050 100%)`,
    `linear-gradient(170deg, #050510 0%, #1B1050 50%, #2D0830 100%)`,
    `linear-gradient(150deg, #080818 0%, #1A2060 50%, #080818 100%)`,
    `linear-gradient(160deg, #0A0A1A 0%, #2A1060 40%, #1A0840 100%)`,
    `linear-gradient(140deg, #050510 0%, #201060 50%, #050510 100%)`,
  ];
  const bg = bgGradients[sceneIndex % bgGradients.length];

  // Accent color per scene
  const accents = [COLORS.neonLavender, COLORS.softGold, COLORS.cosmicPink, COLORS.tealGlow];
  const accent = scene.accentColor || accents[sceneIndex % accents.length];

  // Sign display
  const signText = zodiacSign ? `${ZODIAC_EMOJI[zodiacSign]} ${ZODIAC_RU[zodiacSign]}` : '';
  const sign2Text = zodiacSign2 ? ` × ${ZODIAC_EMOJI[zodiacSign2]} ${ZODIAC_RU[zodiacSign2]}` : '';

  const jsx = {
    type: 'div',
    props: {
      style: {
        width: W,
        height: H,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: bg,
        fontFamily: '"Inter", sans-serif',
        position: 'relative',
        overflow: 'hidden',
      },
      children: [
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
                  children: 'yupsoul.online',
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

        // Brand watermark (non-CTA slides)
        !isCTA ? {
          type: 'div',
          props: {
            style: {
              position: 'absolute',
              bottom: 60,
              right: 60,
              fontSize: 32,
              fontWeight: 600,
              color: `${accent}88`,
              letterSpacing: 1,
            },
            children: 'yupsoul.online',
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
  });

  const resvg = new Resvg(svg, {
    fitTo: { mode: 'width', value: W },
  });

  return Buffer.from(resvg.render().asPng());
}

export async function renderAllSlides(
  scenes: VideoScene[],
  zodiacSign?: ZodiacSign,
  zodiacSign2?: ZodiacSign
): Promise<Buffer[]> {
  const buffers: Buffer[] = [];
  for (let i = 0; i < scenes.length; i++) {
    const buf = await renderSlide({
      scene: scenes[i],
      sceneIndex: i,
      totalScenes: scenes.length,
      zodiacSign,
      zodiacSign2,
    });
    buffers.push(buf);
  }
  return buffers;
}
