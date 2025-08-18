function clamp(x: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, x));
}

function hex(n: number): string {
  const s = clamp(Math.round(n), 0, 255).toString(16).padStart(2, '0');
  return s;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

// Color stops from ColorBrewer RdBu-like palette
const RED = { r: 215, g: 48, b: 39 }; // #d73027
const WHITE = { r: 247, g: 247, b: 247 }; // #f7f7f7
const BLUE = { r: 69, g: 117, b: 180 }; // #4575b4

export function coefToRgb(coef: number): { r: number; g: number; b: number } {
  const c = clamp(coef, -1, 1);
  if (c < 0) {
    const t = (c + 1) / 1; // -1 -> 0 maps to 0 -> 1
    return {
      r: lerp(RED.r, WHITE.r, t),
      g: lerp(RED.g, WHITE.g, t),
      b: lerp(RED.b, WHITE.b, t),
    };
  } else {
    const t = c; // 0 -> 1
    return {
      r: lerp(WHITE.r, BLUE.r, t),
      g: lerp(WHITE.g, BLUE.g, t),
      b: lerp(WHITE.b, BLUE.b, t),
    };
  }
}

export function coefToHex(coef: number): string {
  const { r, g, b } = coefToRgb(coef);
  return `#${hex(r)}${hex(g)}${hex(b)}`;
}

