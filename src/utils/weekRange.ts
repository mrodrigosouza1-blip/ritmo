import { dayIndexMon0 } from './dateKey';

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

function toIso(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

/**
 * Retorna início e fim da semana (Segunda–Domingo) em YYYY-MM-DD (inclusive).
 * Usa datas locais (getFullYear/getMonth/getDate).
 */
export function getWeekRangeISO(date: Date): { start: string; end: string } {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const offset = dayIndexMon0(d); // 0=Seg..6=Dom
  const monday = new Date(d);
  monday.setDate(d.getDate() - offset);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return {
    start: toIso(monday),
    end: toIso(sunday),
  };
}
