import { getDatabase } from '@/src/db/database';
import { listRoutineTimes } from '@/src/services/routineTimes';

/**
 * Dia ativo somente quando TODOS os horários do dia estiverem done.
 * Para rotinas sem times, usa fallback em day_items.
 */
export async function isRoutineFullyDoneOnDate(
  routineId: string,
  date: string
): Promise<boolean> {
  const db = await getDatabase();
  const dateOnly = date.includes('T') ? date.split('T')[0]! : date;

  const times = await listRoutineTimes(routineId);
  const enabledTimes = times.filter((t) => t.enabled === 1);

  if (enabledTimes.length === 0) {
    const row = await db.getFirstAsync<{ count: number }>(
      `SELECT COUNT(*) as count FROM day_items
       WHERE date = ? AND source_type = 'routine' AND source_id = ? AND status = 'done'`,
      dateOnly,
      routineId
    );
    return (row?.count ?? 0) > 0;
  }

  const totalTimes = enabledTimes.length;
  const doneRows = await db.getAllAsync<{ status: string }>(
    `SELECT status FROM day_routine_times
     WHERE date = ? AND routine_id = ? AND status = 'done'`,
    dateOnly,
    routineId
  );
  const doneTimes = doneRows.length;

  return doneTimes === totalTimes;
}

/**
 * Retorna lista de { date, category_id } onde rotinas com horários
 * tiveram TODOS os horários concluídos no dia.
 */
export async function getFullyDoneRoutineCategoryDaysInRange(
  dateStart: string,
  dateEnd: string
): Promise<Array<{ date: string; category_id: string }>> {
  const db = await getDatabase();
  const results: Array<{ date: string; category_id: string }> = [];

  const routinesWithTimes = await db.getAllAsync<{ id: string; category_id: string }>(
    `SELECT r.id, r.category_id FROM routines r
     INNER JOIN routine_times rt ON rt.routine_id = r.id
     WHERE rt.enabled = 1
     GROUP BY r.id, r.category_id`
  );

  const start = new Date(dateStart);
  const end = new Date(dateEnd);

  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const dateStr = d.toISOString().slice(0, 10)!;
    for (const r of routinesWithTimes) {
      const times = await listRoutineTimes(r.id);
      const enabledCount = times.filter((t) => t.enabled === 1).length;
      if (enabledCount === 0) continue;

      const doneCount = await db.getFirstAsync<{ c: number }>(
        `SELECT COUNT(*) as c FROM day_routine_times
         WHERE date = ? AND routine_id = ? AND status = 'done'`,
        dateStr,
        r.id
      );

      if ((doneCount?.c ?? 0) === enabledCount) {
        results.push({ date: dateStr, category_id: r.category_id });
      }
    }
  }

  return results;
}
