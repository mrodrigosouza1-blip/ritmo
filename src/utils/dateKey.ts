/**
 * Retorna YYYY-MM-DD usando getFullYear/getMonth/getDate (horário local).
 * Evita problemas de timezone do toISOString().
 */
export function localDayKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Índice do dia da semana (0=Segunda, 6=Domingo).
 * getDay(): 0=Dom, 1=Seg, ..., 6=Sab
 */
export function dayIndexMon0(d: Date): number {
  return (d.getDay() + 6) % 7;
}
