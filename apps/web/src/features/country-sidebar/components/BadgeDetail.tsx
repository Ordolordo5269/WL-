/**
 * Shared UI primitives used across sidebar sections (Politics, Environment,
 * Commodities, ...). Extracted when the 3rd use case appeared (P3 Energy Mix card).
 *
 * All three components are presentational and deliberately minimal.
 */

export type BadgeLevel = 'good' | 'warning' | 'danger';

const BADGE_COLORS: Record<BadgeLevel, { bg: string; color: string; border: string }> = {
  good:    { bg: 'rgba(16, 185, 129, 0.12)', color: '#34d399', border: 'rgba(16, 185, 129, 0.25)' },
  warning: { bg: 'rgba(245, 158, 11, 0.12)', color: '#fbbf24', border: 'rgba(245, 158, 11, 0.25)' },
  danger:  { bg: 'rgba(239, 68, 68, 0.12)', color: '#f87171', border: 'rgba(239, 68, 68, 0.25)' },
};

export function Badge({ text, level }: { text: string; level: BadgeLevel }) {
  const c = BADGE_COLORS[level];
  return (
    <span
      className="inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-semibold"
      style={{ background: c.bg, color: c.color, border: `1px solid ${c.border}` }}
    >
      {text}
    </span>
  );
}

export function Bar({ pct, color }: { pct: number; color: string }) {
  return (
    <div className="w-full h-1 rounded-full overflow-hidden mt-1" style={{ background: 'rgba(30, 41, 59, 0.5)' }}>
      <div
        className="h-full rounded-full transition-all duration-700"
        style={{ width: `${Math.min(pct, 100)}%`, background: color }}
      />
    </div>
  );
}

export function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[10px] text-slate-500">{label}</span>
      <span className="text-[11px] text-slate-400">{value}</span>
    </div>
  );
}
