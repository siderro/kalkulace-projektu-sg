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
 * Compute expected start date from today + days offset.
 */
export function computeExpectedStartDate(daysToStart: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysToStart);
  return d.toISOString().slice(0, 10);
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
