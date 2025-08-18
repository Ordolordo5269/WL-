function clamp(x: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, x));
}

function toHex(n: number): string {
  const s = clamp(Math.round(n), 0, 255).toString(16).padStart(2, '0');
  return s;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const h = hex.replace('#', '').trim();
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return { r, g, b };
}

function rgbToHex(c: { r: number; g: number; b: number }): string {
  return `#${toHex(c.r)}${toHex(c.g)}${toHex(c.b)}`;
}

function mix(a: { r: number; g: number; b: number }, b: { r: number; g: number; b: number }, t: number) {
  return { r: lerp(a.r, b.r, t), g: lerp(a.g, b.g, t), b: lerp(a.b, b.b, t) };
}

// Exact ColorBrewer RdBu (11)
const RdBu11 = [
  '#67001f',
  '#b2182b',
  '#d6604d',
  '#f4a582',
  '#fddbc7',
  '#f7f7f7',
  '#d1e5f0',
  '#92c5de',
  '#4393c3',
  '#2166ac',
  '#053061',
];

function interpolatePalette(palette: string[], t: number): { r: number; g: number; b: number } {
  const n = palette.length;
  if (n === 0) return { r: 0, g: 0, b: 0 };
  if (n === 1) return hexToRgb(palette[0]);
  const x = clamp(t, 0, 1) * (n - 1);
  const i = Math.floor(x);
  const f = x - i;
  const c0 = hexToRgb(palette[i]);
  const c1 = hexToRgb(palette[Math.min(i + 1, n - 1)]);
  return mix(c0, c1, f);
}

export function coefToRgbRdBu(coef: number, min = -1, max = 1): { r: number; g: number; b: number } {
  const lo = Math.min(min, max);
  const hi = Math.max(min, max);
  const v = clamp(coef, lo, hi);
  const t = (v - lo) / (hi - lo); // 0..1
  return interpolatePalette(RdBu11, t);
}

export function coefToHexRdBu(coef: number, min = -1, max = 1): string {
  return rgbToHex(coefToRgbRdBu(coef, min, max));
}


