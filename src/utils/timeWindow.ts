/**
 * Utilitários para janelas de tempo (ex: quiet hours).
 */

/**
 * Verifica se um horário (HH:mm) está dentro da janela silenciosa.
 * Suporta janelas que cruzam meia-noite (ex: 22:00–08:00).
 *
 * Exemplos:
 * - start 22:00, end 08:00: 23:30 está dentro, 07:00 está dentro, 12:00 está fora
 * - start 08:00, end 22:00: 12:00 está dentro, 23:00 está fora
 */
export function isWithinQuietHours(
  nowHHmm: string,
  startHHmm: string,
  endHHmm: string
): boolean {
  const toMinutes = (hhmm: string) => {
    const [h, m] = hhmm.split(':').map(Number);
    return (h ?? 0) * 60 + (m ?? 0);
  };
  const now = toMinutes(nowHHmm);
  const start = toMinutes(startHHmm);
  const end = toMinutes(endHHmm);

  if (start <= end) {
    return now >= start && now < end;
  }
  return now >= start || now < end;
}
