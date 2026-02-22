import type { Locale } from '@/src/i18n';
import { getIntlLocale } from '@/src/utils/i18nDate';

const formatterCache = new Map<string, Intl.DateTimeFormat>();

function getFormatter(
  locale: Locale,
  options: Intl.DateTimeFormatOptions
): Intl.DateTimeFormat {
  const intlLocale = getIntlLocale(locale);
  const key = `${intlLocale}-${JSON.stringify(options)}`;
  let f = formatterCache.get(key);
  if (!f) {
    f = new Intl.DateTimeFormat(intlLocale, options);
    formatterCache.set(key, f);
  }
  return f;
}

/**
 * Formata data no padrão DD/MM/AAAA (ou localizado).
 * @param date Date ou string ISO (YYYY-MM-DD)
 */
export function formatDate(date: Date | string, locale: Locale): string {
  const d = typeof date === 'string' ? new Date(date + 'T12:00:00') : date;
  return getFormatter(locale, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(d);
}

/**
 * Formata mês e ano (ex: "Março 2026").
 */
export function formatMonthYear(date: Date | { year: number; month: number }, locale: Locale): string {
  const d =
    date instanceof Date
      ? date
      : new Date(date.year, date.month, 1);
  return getFormatter(locale, {
    month: 'long',
    year: 'numeric',
  }).format(d);
}

/**
 * Retorna o nome do dia da semana (ex: "segunda-feira").
 */
export function formatWeekday(isoDate: string, locale: Locale): string {
  const d = new Date(isoDate + 'T12:00:00');
  return getFormatter(locale, { weekday: 'long' }).format(d);
}

const TOMORROW_STR: Record<Locale, string> = {
  pt: 'Amanhã',
  en: 'Tomorrow',
  it: 'Domani',
};

/**
 * Formata data de evento futuro: "Amanhã" se for dia seguinte, senão DD/MM.
 */
export function formatNextEventDay(
  eventDate: string,
  todayIso: string,
  locale: Locale
): string {
  const eventOnly = eventDate.includes('T') ? eventDate.split('T')[0]! : eventDate;
  const todayOnly = todayIso.includes('T') ? todayIso.split('T')[0]! : todayIso;
  const [ty, tm, td] = todayOnly.split('-').map(Number);
  const [ey, em, ed] = eventOnly.split('-').map(Number);
  const tomorrow = new Date(ty!, tm! - 1, td! + 1);
  if (
    ey === tomorrow.getFullYear() &&
    em === tomorrow.getMonth() + 1 &&
    ed === tomorrow.getDate()
  ) {
    return TOMORROW_STR[locale];
  }
  return formatDate(eventOnly, locale);
}
