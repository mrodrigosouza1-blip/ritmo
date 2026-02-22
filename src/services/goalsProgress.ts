import { getDatabase } from '@/src/db/database';
import { getFullyDoneRoutineCategoryDaysInRange } from '@/src/services/routinesDailyStatus';

/**
 * Retorna Map<category_id, doneCount> para a semana (start..end inclusive).
 * Conta NO MÁXIMO 1 por dia por categoria: completed = dias distintos em que
 * houve pelo menos 1 item done daquela categoria.
 * Rotinas COM times: só conta quando TODOS os horários do dia estão done.
 */
export async function getWeeklyDoneCountsByCategory(
  weekStartIso: string,
  weekEndIso: string
): Promise<Map<string, number>> {
  const db = await getDatabase();

  const dayItemsRows = await db.getAllAsync<{ date: string; category_id: string }>(
    `WITH daily AS (
      SELECT r.category_id AS category_id, di.date AS date
      FROM day_items di
      JOIN routines r ON r.id = di.source_id
      WHERE di.source_type = 'routine'
        AND di.status = 'done'
        AND di.date >= ? AND di.date <= ?
        AND r.category_id IS NOT NULL AND r.category_id <> ''
        AND NOT EXISTS (SELECT 1 FROM routine_times rt WHERE rt.routine_id = r.id AND rt.enabled = 1)
      UNION
      SELECT t.category_id, di.date FROM day_items di JOIN tasks t ON t.id = di.source_id
      WHERE di.source_type = 'task' AND di.status = 'done' AND di.date >= ? AND di.date <= ?
        AND t.category_id IS NOT NULL AND t.category_id <> ''
      UNION
      SELECT e.category_id, di.date FROM day_items di JOIN events e ON e.id = di.source_id
      WHERE di.source_type = 'event' AND di.status = 'done' AND di.date >= ? AND di.date <= ?
        AND e.category_id IS NOT NULL AND e.category_id <> ''
    )
    SELECT category_id, date FROM daily`,
    weekStartIso,
    weekEndIso,
    weekStartIso,
    weekEndIso,
    weekStartIso,
    weekEndIso
  );

  const fullyDone = await getFullyDoneRoutineCategoryDaysInRange(
    weekStartIso,
    weekEndIso
  );

  const combined = new Map<string, Set<string>>();
  for (const r of dayItemsRows) {
    if (!r.category_id) continue;
    if (!combined.has(r.category_id)) combined.set(r.category_id, new Set());
    combined.get(r.category_id)!.add(r.date);
  }
  for (const { date, category_id } of fullyDone) {
    if (!category_id) continue;
    if (!combined.has(category_id)) combined.set(category_id, new Set());
    combined.get(category_id)!.add(date);
  }

  const result = new Map<string, number>();
  for (const [catId, dates] of combined) {
    result.set(catId, dates.size);
  }
  return result;
}

/**
 * Retorna quantidade de dias distintos ativos na semana (day_items + rotinas com horários fully done).
 */
export async function getActiveDaysInWeek(
  weekStartIso: string,
  weekEndIso: string
): Promise<number> {
  const allDates = new Set<string>();
  const db = await getDatabase();
  const dayItemsRows = await db.getAllAsync<{ date: string }>(
    `SELECT DISTINCT date FROM day_items
     WHERE status = 'done' AND date >= ? AND date <= ?`,
    weekStartIso,
    weekEndIso
  );
  dayItemsRows.forEach((r) => allDates.add(r.date));
  const fullyDone = await getFullyDoneRoutineCategoryDaysInRange(
    weekStartIso,
    weekEndIso
  );
  for (const { date } of fullyDone) {
    allDates.add(date);
  }
  return allDates.size;
}
