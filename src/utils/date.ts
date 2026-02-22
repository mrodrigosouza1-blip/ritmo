export function formatDateBR(isoDate: string | undefined): string {
  if (!isoDate) return '';
  const [y, m, d] = isoDate.split(/[-T]/);
  if (!y || !m || !d) return isoDate;
  return `${d.padStart(2, '0')}/${m.padStart(2, '0')}/${y}`;
}

export function isoFromDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function timeFromDate(d: Date): string {
  const h = String(d.getHours()).padStart(2, '0');
  const m = String(d.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}

export function dateFromIsoAndTime(isoDate: string, time: string): Date {
  const [h, m] = time.split(':').map(Number);
  const d = new Date(isoDate + 'T12:00:00');
  d.setHours(h ?? 0, m ?? 0, 0, 0);
  return d;
}

export function isoToDate(isoDate: string): Date {
  return new Date(isoDate + 'T12:00:00');
}

/** Adiciona dias a uma data ISO (YYYY-MM-DD). Retorna YYYY-MM-DD. */
export function addDaysToIso(isoDate: string, days: number): string {
  const d = isoToDate(isoDate);
  d.setDate(d.getDate() + days);
  return isoFromDate(d);
}

/**
 * Formata a data de um compromisso futuro para exibição:
 * "Amanhã" se for o dia seguinte a todayIso, senão "DD/MM".
 */
export function formatNextEventDay(eventDate: string, todayIso: string): string {
  const eventOnly = eventDate.includes('T') ? eventDate.split('T')[0]! : eventDate;
  const todayOnly = todayIso.includes('T') ? todayIso.split('T')[0]! : todayIso;
  const [ty, tm, td] = todayOnly.split('-').map(Number);
  const [ey, em, ed] = eventOnly.split('-').map(Number);
  const tomorrow = new Date(ty!, tm! - 1, td! + 1);
  if (ey === tomorrow.getFullYear() && em === tomorrow.getMonth() + 1 && ed === tomorrow.getDate()) {
    return 'Amanhã';
  }
  return formatDateBR(eventOnly);
}
