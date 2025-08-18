export function winsorize(values: number[], lowQuantile = 0.01, highQuantile = 0.99): number[] {
  if (values.length === 0) return values;
  const sorted = [...values].sort((a, b) => a - b);
  const qLow = quantileSorted(sorted, lowQuantile);
  const qHigh = quantileSorted(sorted, highQuantile);
  return values.map((v) => Math.min(qHigh, Math.max(qLow, v)));
}

export function zscore(values: number[]): number[] {
  if (values.length === 0) return values;
  const mean = values.reduce((s, v) => s + v, 0) / values.length;
  const variance = values.reduce((s, v) => s + (v - mean) * (v - mean), 0) / Math.max(1, values.length - 1);
  const std = Math.sqrt(Math.max(variance, 1e-12));
  return values.map((v) => (v - mean) / std);
}

export function minMaxToMinus1To1(values: number[]): number[] {
  if (values.length === 0) return values;
  const min = Math.min(...values);
  const max = Math.max(...values);
  if (Math.abs(max - min) < 1e-12) return values.map(() => 0);
  return values.map((v) => -1 + ((v - min) / (max - min)) * 2);
}

function quantileSorted(sorted: number[], q: number): number {
  const pos = (sorted.length - 1) * Math.min(1, Math.max(0, q));
  const base = Math.floor(pos);
  const rest = pos - base;
  if (sorted[base + 1] !== undefined) return sorted[base] + rest * (sorted[base + 1] - sorted[base]);
  return sorted[base];
}

