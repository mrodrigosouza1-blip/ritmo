import { getDatabase } from '@/src/db/database';
import type { Routine, RoutineRule } from '@/src/types';
import type { TimeBlock } from '@/src/types';

export async function createRoutine(routine: Routine, rules?: Omit<RoutineRule, 'routine_id'>[]): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `INSERT INTO routines (id, title, block, default_time, category_id, is_active, location, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    routine.id,
    routine.title,
    routine.block,
    routine.default_time ?? null,
    routine.category_id ?? null,
    routine.is_active,
    routine.location ?? null,
    routine.notes ?? null
  );

  if (rules?.length) {
    for (const rule of rules) {
      await db.runAsync(
        `INSERT INTO routine_rules (routine_id, freq, interval, byweekday, bymonthday)
         VALUES (?, ?, ?, ?, ?)`,
        routine.id,
        rule.freq,
        rule.interval ?? null,
        rule.byweekday ?? null,
        rule.bymonthday ?? null
      );
    }
  }
}

export async function getActiveRoutines(): Promise<Routine[]> {
  const db = await getDatabase();
  return db.getAllAsync<Routine>('SELECT * FROM routines WHERE is_active = 1 ORDER BY default_time');
}

export async function getRoutineById(id: string): Promise<Routine | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<Routine>('SELECT * FROM routines WHERE id = ?', id);
  return row ?? null;
}

export async function getRoutineRules(routineId: string): Promise<RoutineRule[]> {
  const db = await getDatabase();
  return db.getAllAsync<RoutineRule>('SELECT * FROM routine_rules WHERE routine_id = ?', routineId);
}

export function routineOccursOnDate(routine: Routine, rules: RoutineRule[], date: Date): boolean {
  const dayOfWeek = date.getDay() as 0 | 1 | 2 | 3 | 4 | 5 | 6;
  const dayOfMonth = date.getDate();

  if (rules.length === 0) return true;

  for (const rule of rules) {
    if (rule.freq === 'daily') return true;
    if (rule.freq === 'weekly' && rule.byweekday) {
      const weekdays = rule.byweekday.split(',').map((d) => parseInt(d, 10));
      if (weekdays.includes(dayOfWeek)) return true;
    }
    if (rule.freq === 'monthly' && rule.bymonthday) {
      const days = rule.bymonthday.split(',').map((d) => parseInt(d, 10));
      if (days.includes(dayOfMonth)) return true;
    }
  }
  return false;
}

export async function getAllRoutines(): Promise<Routine[]> {
  const db = await getDatabase();
  return db.getAllAsync<Routine>('SELECT * FROM routines ORDER BY default_time');
}

export async function updateRoutine(routine: Routine): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `UPDATE routines SET title=?, block=?, default_time=?, category_id=?, is_active=?, location=?, notes=?
     WHERE id=?`,
    routine.title,
    routine.block,
    routine.default_time ?? null,
    routine.category_id ?? null,
    routine.is_active,
    routine.location ?? null,
    routine.notes ?? null,
    routine.id
  );
}

export async function deleteRoutine(id: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM routine_rules WHERE routine_id = ?', id);
  await db.runAsync('DELETE FROM routine_times WHERE routine_id = ?', id);
  await db.runAsync('DELETE FROM day_routine_times WHERE routine_id = ?', id);
  await db.runAsync('DELETE FROM routines WHERE id = ?', id);
}
