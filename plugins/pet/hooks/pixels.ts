// Drawing tools shared by every mood: the canvas, the palette, and Clawd's body.
// Each terminal cell holds 2 x 2 pixels (quarter blocks ▘▝▖▗ and friends) in
// two colors, so a 62 x 12 pixel canvas draws as 31 columns x 6 rows.

export const WIDTH = 62;
export const HEIGHT = 12;
export const COLUMNS = WIDTH / 2;
export const ROWS = HEIGHT / 2;

const PALETTE: Record<string, number> = {
  o: 0xd77757, // Claude orange
  w: 0xffffff,
  r: 0xe04848,
  y: 0xffd84a,
  c: 0x5ec8ff,
  B: 0x3a7bd5,
  G: 0x5cb85c,
  g: 0x9aa0a6,
  k: 0x2b2b2b,
  p: 0xf4a3b5,
  n: 0x8b5a2b,
  t: 0xf5ecd6,
  d: 0x5f6368, // dim gray, for things fading out
};

// '_' erases: Clawd's eyes are holes in the body, as in the logo.
const ERASE = '_';

// The logo,  ▐▛███▜▌ / ▝▜█████▛▘ / ▘▘ ▝▝ , one pixel per quarter block.
export const HEAD = '...oooooooooooo...';
export const FACE = '...oo_oooooo_oo...';
export const ARMS = '.oooooooooooooooo.';
export const LEGS = ['....o.o....o.o....', '...o.o......o.o...'];

export type Canvas = (number | null)[];

export function stamp(canvas: Canvas, art: string[], x: number, y: number) {
  art.forEach((line, dy) => {
    for (let dx = 0; dx < line.length; dx++) {
      const ch = line[dx] ?? '.';
      const px = x + dx;
      const py = y + dy;
      if (px < 0 || py < 0 || px >= WIDTH || py >= HEIGHT) continue;
      if (ch === ERASE) canvas[py * WIDTH + px] = null;
      const color = PALETTE[ch];
      if (color !== undefined) canvas[py * WIDTH + px] = color;
    }
  });
}

/** Doubles art across: one character becomes one square on screen. */
export function wide(art: string[]): string[] {
  return art.map((line) => [...line].map((ch) => ch + ch).join(''));
}

/** Doubles art both ways. */
function scale2(art: string[]): string[] {
  return wide(art).flatMap((line) => [line, line]);
}

// Eyes are 4 x 2 (cross: 3 x 3) patches over the logo's eye holes.
const EYES = {
  open: ['.__.', '.__.'],
  shut: ['....', '.__.'],
  up: ['.__.', '....'],
  happy: ['.__.', '_.._'],
};

type Eyes = keyof typeof EYES | 'cross';
export type Pose = {
  lift?: number;
  squash?: boolean;
  step?: boolean;
  eyes?: Eyes;
  look?: number;
  wave?: boolean;
  cap?: boolean;
};

export function drawPet(
  canvas: Canvas,
  { lift = 0, squash = false, step = false, eyes = 'open', look = 0, wave = false, cap = false }: Pose,
) {
  const legs = LEGS[step ? 1 : 0] ?? '';
  let art = scale2([HEAD, HEAD, ARMS, HEAD, legs]);
  // Squash drops one belly row so Clawd looks like it breathes out.
  if (squash) art = art.filter((_, i) => i !== 6);
  const y = HEIGHT - art.length - lift;
  stamp(canvas, art, 0, y);
  if (cap) {
    // A striped nightcap on the head, its tip flopping down the right side to a pom-pom.
    // prettier-ignore
    stamp(canvas, [
      '..BBBBBBBBBBBBBBBBBBBB..........',
      'BBccBBccBBccBBccBBccBBccBBcc....',
      'wwwwwwwwwwwwwwwwwwwwwwwwccBBcc..',
      '..........................BBccBB',
      '............................wwww',
      '............................wwww',
    ], 6, y - 1)
  }
  if (wave) {
    // Wave the right arm: it rises to a short diagonal, then rests.
    stamp(canvas, ['____', '____'], 30, y + 4);
    stamp(canvas, ['..oo', '..oo', 'oo..', 'oo..'], 30, y + 2);
  }
  if (eyes === 'cross') {
    stamp(canvas, ['r.r', '.r.', 'r.r'], 10, y + 1);
    stamp(canvas, ['r.r', '.r.', 'r.r'], 24, y + 1);
    return;
  }
  stamp(canvas, EYES[eyes], 9 + look, y + 2);
  stamp(canvas, EYES[eyes], 23 + look, y + 2);
}

// Props sit to the right of Clawd, in a 24 x 12 area starting at x = 38,
// drawn square (`wide`) so each character fills one cell's width.
export const PX = 38;

/** What one mood shows: its label, Clawd's pose, and the prop beside Clawd. */
export type MoodArt = {
  /** The text beside Clawd. */
  label: string;
  pose: (tick: number) => Pose;
  prop?: (canvas: Canvas, tick: number) => void;
  /** A sleeping Clawd moves at a quarter speed. */
  slow?: boolean;
};
