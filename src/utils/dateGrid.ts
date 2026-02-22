/**
 * Utilitários para grid de calendário (Segunda a Domingo, local).
 */

import { localDayKey as _localDayKey, dayIndexMon0 as _dayIndexMon0 } from './dateKey';

/** Re-export: YYYY-MM-DD usando getFullYear/getMonth/getDate (horário local). */
export const localDayKey = _localDayKey;

/** Re-export: 0=Segunda .. 6=Domingo. */
export const dayIndexMon0 = _dayIndexMon0;

export interface MonthCell {
  date: Date;
  isCurrentMonth: boolean;
}

/** Gera 42 células (6 semanas × 7 colunas) para o mês, Seg→Dom. */
export function makeMonthGrid(year: number, monthIndex0: number): MonthCell[] {
  const first = new Date(year, monthIndex0, 1);
  const offset = dayIndexMon0(first);
  const start = new Date(year, monthIndex0, 1 - offset);
  const cells: MonthCell[] = [];

  for (let i = 0; i < 42; i++) {
    const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
    cells.push({
      date: d,
      isCurrentMonth: d.getMonth() === monthIndex0,
    });
  }

  return cells;
}
