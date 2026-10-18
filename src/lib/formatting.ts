// ============================================================
// Czech formatting utilities
// ============================================================

// Czech month names (genitive case for dates)
const CZECH_MONTHS_GENITIVE = [
  'ledna', 'února', 'března', 'dubna', 'května', 'června',
  'července', 'srpna', 'září', 'října', 'listopadu', 'prosince',
];

/**
 * Format a number with Czech decimal comma.
 * e.g. 3.6 → "3,60", 1.125 → "1,13"
 */
export function formatDecimal(value: number, decimals = 2): string {
  return value.toFixed(decimals).replace('.', ',');
}

/**
 * Format currency in Czech format.
 * e.g. 53136 → "53 136 Kč"
 */
export function formatCurrency(value: number): string {
  const rounded = Math.round(value);
  const formatted = rounded
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, '\u00A0'); // non-breaking space
  return `${formatted} Kč`;
}

/**
 * Format currency for markdown (use regular spaces).
 * e.g. 53136 → "53 136 Kč"
 */
export function formatCurrencyMd(value: number): string {
  const rounded = Math.round(value);
  const formatted = rounded
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return `${formatted} Kč`;
}

/**
 * Format a date in Czech long format.
 * e.g. "2026-04-10" → "10. dubna 2026"
 */
export function formatCzechDate(isoDate: string): string {
  const d = new Date(isoDate);
  if (isNaN(d.getTime())) return isoDate;
  const day = d.getDate();
  const month = CZECH_MONTHS_GENITIVE[d.getMonth()];
  const year = d.getFullYear();
  return `${day}. ${month} ${year}`;
}

/**
 * Format MD value for display.
 * e.g. 3.6 → "3,60 MD"
 */
export function formatMd(value: number): string {
  return `${formatDecimal(value)} MD`;
}

/**
 * Format percentage for display.
 * e.g. 120 → "120 %"
 */
export function formatPercent(value: number): string {
  return `${value} %`;
}

/**
 * Today's date as ISO string (YYYY-MM-DD).
 */
export function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Doba mezi dvěma daty v celých měsících a zbylých dnech.
 * e.g. 2026-10-24 → 2026-12-31 = "2 měs. 7 dní"
 */
export function formatDuration(startIso: string | null, endIso: string | null): string {
  if (!startIso || !endIso) return '';
  const start = new Date(startIso);
  const end = new Date(endIso);
  if (isNaN(start.getTime()) || isNaN(end.getTime()) || end < start) return '';

  // Start + n měsíců; den se ořízne na konec cílového měsíce (31. 1. + 1 měs. = 28. 2.)
  const addMonths = (n: number) => {
    const total = start.getUTCFullYear() * 12 + start.getUTCMonth() + n;
    const lastDay = new Date(Date.UTC(Math.floor(total / 12), (total % 12) + 1, 0)).getUTCDate();
    return Date.UTC(Math.floor(total / 12), total % 12, Math.min(start.getUTCDate(), lastDay));
  };

  let months =
    (end.getUTCFullYear() - start.getUTCFullYear()) * 12 + (end.getUTCMonth() - start.getUTCMonth());
  if (addMonths(months) > end.getTime()) months -= 1;
  const days = Math.round((end.getTime() - addMonths(months)) / 86400000);

  const parts: string[] = [];
  if (months > 0) parts.push(`${months} měs.`);
  if (days > 0) parts.push(`${days} ${days === 1 ? 'den' : days < 5 ? 'dny' : 'dní'}`);
  return parts.join(' ') || '0 dní';
}

/**
 * Generate project code from name.
 * Format: YY-MM-slugified-name-UNIX
 */
export function generateProjectCode(name: string): string {
  const now = new Date();
  const yy = String(now.getFullYear()).slice(2);
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const unix = String(Math.floor(now.getTime() / 1000)).slice(-5);
  const slug = slugify(name);
  return slug ? `${yy}-${mm}-${slug}-${unix}` : '';
}

const CZECH_MAP: Record<string, string> = {
  á: 'a', č: 'c', ď: 'd', é: 'e', ě: 'e', í: 'i', ň: 'n',
  ó: 'o', ř: 'r', š: 's', ť: 't', ú: 'u', ů: 'u', ý: 'y', ž: 'z',
};

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[áčďéěíňóřšťúůýž]/g, (ch) => CZECH_MAP[ch] ?? ch)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}
