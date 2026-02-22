import { getDatabase } from '@/src/db/database';

export interface RoutineTime {
  id: string;
  routine_id: string;
  time: string;
  enabled: number;
  sort_order: number;
}

function generateId(): string {
  return `rt-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export async function listRoutineTimes(routineId: string): Promise<RoutineTime[]> {
  const db = await getDatabase();
  return db.getAllAsync<RoutineTime>(
    'SELECT * FROM routine_times WHERE routine_id = ? ORDER BY sort_order ASC, time ASC',
    routineId
  );
}

export async function addRoutineTime(
  routineId: string,
  timeHHmm: string
): Promise<RoutineTime> {
  const db = await getDatabase();
  const existing = await db.getFirstAsync<RoutineTime>(
    'SELECT * FROM routine_times WHERE routine_id = ? AND time = ?',
    routineId,
    timeHHmm
  );
  if (existing) return existing;

  const maxOrder = await db.getFirstAsync<{ m: number }>(
    'SELECT COALESCE(MAX(sort_order), -1) + 1 as m FROM routine_times WHERE routine_id = ?',
    routineId
  );
  const sort_order = maxOrder?.m ?? 0;

  const id = generateId();
  await db.runAsync(
    'INSERT INTO routine_times (id, routine_id, time, enabled, sort_order) VALUES (?, ?, ?, 1, ?)',
    id,
    routineId,
    timeHHmm,
    sort_order
  );

  return {
    id,
    routine_id: routineId,
    time: timeHHmm,
    enabled: 1,
    sort_order,
  };
}

export async function removeRoutineTime(
  routineId: string,
  timeHHmmOrId: string
): Promise<void> {
  const db = await getDatabase();
  const isId = timeHHmmOrId.startsWith('rt-');
  if (isId) {
    await db.runAsync('DELETE FROM routine_times WHERE id = ? AND routine_id = ?', timeHHmmOrId, routineId);
  } else {
    await db.runAsync(
      'DELETE FROM routine_times WHERE routine_id = ? AND time = ?',
      routineId,
      timeHHmmOrId
    );
  }
}

/**
 * Sincroniza os horários da rotina com a lista desejada.
 * Adiciona os faltantes e remove os extras.
 */
export async function setRoutineTimes(
  routineId: string,
  timesHHmm: string[]
): Promise<void> {
  const current = await listRoutineTimes(routineId);
  const currentSet = new Set(current.map((t) => t.time));
  const desiredSet = new Set(timesHHmm);

  for (const t of timesHHmm) {
    if (!currentSet.has(t)) {
      await addRoutineTime(routineId, t);
    }
  }

  for (const t of current) {
    if (!desiredSet.has(t.time)) {
      await removeRoutineTime(routineId, t.id);
    }
  }
}
