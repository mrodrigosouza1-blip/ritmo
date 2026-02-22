/**
 * Helpers de data/calendário com locale do app.
 * Sempre usar getLocale() do i18n ao chamar estas funções.
 */

export type AppLocale = 'pt' | 'en' | 'it';

/**
 * Mapeia locale do app para Intl (BCP 47).
 */
export function getIntlLocale(locale: AppLocale): string {
  switch (locale) {
    case 'pt':
      return 'pt-BR';
    case 'en':
      return 'en-US';
    case 'it':
      return 'it-IT';
    default:
      return 'pt-BR';
  }
}

const formatterCache = new Map<string, Intl.DateTimeFormat>();

function getFormatter(
  intlLocale: string,
  options: Intl.DateTimeFormatOptions
): Intl.DateTimeFormat {
  const key = `${intlLocale}-${JSON.stringify(options)}`;
  let f = formatterCache.get(key);
  if (!f) {
    f = new Intl.DateTimeFormat(intlLocale, options);
    formatterCache.set(key, f);
  }
  return f;
}

/**
 * Nome curto do dia da semana (ex: Seg, Mon, Lun).
 */
export function formatDayName(date: Date, locale: AppLocale): string {
  const intlLocale = getIntlLocale(locale);
  return getFormatter(intlLocale, { weekday: 'short' }).format(date);
}

/**
 * Mês longo + ano (ex: Março 2026, March 2026).
 */
export function formatMonthYear(date: Date, locale: AppLocale): string {
  const intlLocale = getIntlLocale(locale);
  return getFormatter(intlLocale, {
    month: 'long',
    year: 'numeric',
  }).format(date);
}

/**
 * Data curta DD/MM/AAAA (PT/IT). Para EN: DD/MM/AAAA (MVP).
 */
export function formatShortDate(date: Date, locale: AppLocale): string {
  const intlLocale = getIntlLocale(locale);
  return getFormatter(intlLocale, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
}

/**
 * 7 labels de dias da semana, Monday-first.
 * Ex: ["Seg","Ter","Qua","Qui","Sex","Sáb","Dom"] em PT.
 */
export function getWeekdayHeadersMondayFirst(locale: AppLocale): string[] {
  const intlLocale = getIntlLocale(locale);
  const monday = new Date(2024, 0, 1); // 1 Jan 2024 = Monday
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return getFormatter(intlLocale, { weekday: 'short' }).format(d);
  });
}
