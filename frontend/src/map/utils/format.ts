export function formatDateRange(start?: string, end?: string): string {
  if (!start && !end) return 'N/A';
  const fmt = (s?: string) => (s ? new Date(s).toISOString().slice(0, 10) : '');
  if (start && end) return `${fmt(start)} – ${fmt(end)}`;
  if (start) return `${fmt(start)} – …`;
  return `… – ${fmt(end)}`;
}

export function titleOrFallback(title?: string) {
  return (title && title.trim()) || 'Untitled event';
}

