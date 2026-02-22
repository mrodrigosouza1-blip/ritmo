import { getDatabase } from '@/src/db/database';
import { listRoutineTimes } from '@/src/services/routineTimes';

export interface DayRoutineTime {
  id: string;
  date: string;
  routine_id: string;
  time: string;
  status: string;
  notification_id: string | null;
}

function dayRoutineTimeId(date: string, routineId: string, time: string): string {
  return `drt-${date}-${routineId}-${time.replace(':', '-')}`;
}

/**
 * Garante que existem linhas em day_routine_times para cada routine_time enabled.
 */
export async function ensureDayRoutineTimes(
  date: string,
  routineId: string
): Promise<DayRoutineTime[]> {
  const db = await getDatabase();
  const dateOnly = date.includes('T') ? date.split('T')[0]! : date;

  const times = await listRoutineTimes(routineId);
  const enabledTimes = times.filter((t) => t.enabled === 1);

  for (const rt of enabledTimes) {
    const id = dayRoutineTimeId(dateOnly, routineId, rt.time);
    await db.runAsync(
      `INSERT OR IGNORE INTO day_routine_times (id, date, routine_id, time, status, notification_id)
       VALUES (?, ?, ?, ?, 'pending', NULL)`,
      id,
      dateOnly,
      routineId,
      rt.time
    );
  }

  return getDayRoutineTimes(dateOnly, routineId);
}

/**
 * Alterna status entre pending e done.
 */
export async function toggleDayRoutineTime(
  date: string,
  routineId: string,
  timeHHmm: string
): Promise<'pending' | 'done'> {
  const db = await getDatabase();
  const dateOnly = date.includes('T') ? date.split('T')[0]! : date;
  const id = dayRoutineTimeId(dateOnly, routineId, timeHHmm);

  const row = await db.getFirstAsync<{ status: string }>(
    'SELECT status FROM day_routine_times WHERE id = ?',
    id
  );
  const nextStatus = row?.status === 'done' ? 'pending' : 'done';

  await db.runAsync(
    'UPDATE day_routine_times SET status = ? WHERE id = ?',
    nextStatus,
    id
  );

  return nextStatus as 'pending' | 'done';
}

/**
 * Lista day_routine_times por rotina para uma data.
 */
export async function getDayRoutineTimes(
  date: string,
  routineId: string
): Promise<DayRoutineTime[]> {
  const db = await getDatabase();
  const dateOnly = date.includes('T') ? date.split('T')[0]! : date;

  return db.getAllAsync<DayRoutineTime>(
    'SELECT * FROM day_routine_times WHERE date = ? AND routine_id = ? ORDER BY time ASC',
    dateOnly,
    routineId
  );
}

/**
 * Retorna status de um horário específico.
 */
export async function getDayRoutineTimeStatus(
  date: string,
  routineId: string,
  timeHHmm: string
): Promise<'pending' | 'done'> {
  const db = await getDatabase();
  const dateOnly = date.includes('T') ? date.split('T')[0]! : date;
  const id = dayRoutineTimeId(dateOnly, routineId, timeHHmm);

  const row = await db.getFirstAsync<{ status: string }>(
    'SELECT status FROM day_routine_times WHERE id = ?',
    id
  );

  return row?.status === 'done' ? 'done' : 'pending';
}
