import { getDatabase } from '@/src/db/database';

export interface RoutineException {
  id: string;
  routine_id: string;
  date: string;
  kind: 'skip' | 'move';
  moved_to_date?: string | null;
  created_at?: string | null;
}

function generateId(): string {
  return `rex-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export async function getException(
  routineId: string,
  date: string
): Promise<RoutineException | null> {
  const db = await getDatabase();
  const dateOnly = date.includes('T') ? date.split('T')[0]! : date;
  const row = await db.getFirstAsync<RoutineException>(
    'SELECT * FROM routine_exceptions WHERE routine_id = ? AND date = ?',
    routineId,
    dateOnly
  );
  return row ?? null;
}

/**
 * Retorna exceções do tipo "move" cujo moved_to_date = date (rotinas movidas para este dia).
 */
export async function getMovedToDate(date: string): Promise<RoutineException[]> {
  const db = await getDatabase();
  const dateOnly = date.includes('T') ? date.split('T')[0]! : date;
  return db.getAllAsync<RoutineException>(
    'SELECT * FROM routine_exceptions WHERE kind = ? AND moved_to_date = ?',
    'move',
    dateOnly
  );
}

/**
 * Retorna mapa routine_id -> exception para exceções do tipo skip ou move (from) na data.
 */
export async function getExceptionsForDate(date: string): Promise<Map<string, RoutineException>> {
  const db = await getDatabase();
  const dateOnly = date.includes('T') ? date.split('T')[0]! : date;
  const rows = await db.getAllAsync<RoutineException>(
    'SELECT * FROM routine_exceptions WHERE date = ?',
    dateOnly
  );
  const map = new Map<string, RoutineException>();
  for (const row of rows) {
    map.set(row.routine_id, row);
  }
  return map;
}

export async function setSkip(routineId: string, date: string): Promise<void> {
  const db = await getDatabase();
  const dateOnly = date.includes('T') ? date.split('T')[0]! : date;
  const id = generateId();
  await db.runAsync(
    `INSERT OR REPLACE INTO routine_exceptions (id, routine_id, date, kind, moved_to_date, created_at)
     VALUES (?, ?, ?, 'skip', NULL, ?)`,
    id,
    routineId,
    dateOnly,
    new Date().toISOString()
  );
}

export async function setMove(
  routineId: string,
  fromDate: string,
  movedToDate: string
): Promise<void> {
  const db = await getDatabase();
  const fromOnly = fromDate.includes('T') ? fromDate.split('T')[0]! : fromDate;
  const toOnly = movedToDate.includes('T') ? movedToDate.split('T')[0]! : movedToDate;
  const id = generateId();
  await db.runAsync(
    `INSERT OR REPLACE INTO routine_exceptions (id, routine_id, date, kind, moved_to_date, created_at)
     VALUES (?, ?, ?, 'move', ?, ?)`,
    id,
    routineId,
    fromOnly,
    toOnly,
    new Date().toISOString()
  );
}

export async function clearException(routineId: string, date: string): Promise<void> {
  const db = await getDatabase();
  const dateOnly = date.includes('T') ? date.split('T')[0]! : date;
  await db.runAsync(
    'DELETE FROM routine_exceptions WHERE routine_id = ? AND date = ?',
    routineId,
    dateOnly
  );
}
