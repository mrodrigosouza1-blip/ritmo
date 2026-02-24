import { getDatabase } from '@/src/db/database';

const KEY_WEEKLY_4X_COUNT = 'achievements_weekly_4x_count';
const KEY_WEEKLY_4X_LAST_WEEK = 'achievements_weekly_4x_last_week';

export async function getWeekly4xConsecutiveCount(): Promise<number> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ value: string }>(
    'SELECT value FROM ui_settings WHERE key = ?',
    KEY_WEEKLY_4X_COUNT
  );
  const n = row?.value != null ? parseInt(row.value, 10) : NaN;
  return Number.isFinite(n) ? n : 0;
}

export async function setWeekly4xConsecutiveCount(value: number): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    'INSERT OR REPLACE INTO ui_settings (key, value) VALUES (?, ?)',
    KEY_WEEKLY_4X_COUNT,
    String(value)
  );
}

export async function getWeekly4xLastWeekStart(): Promise<string | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ value: string }>(
    'SELECT value FROM ui_settings WHERE key = ?',
    KEY_WEEKLY_4X_LAST_WEEK
  );
  return row?.value && row.value !== '' ? row.value : null;
}

export async function setWeekly4xLastWeekStart(weekStart: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    'INSERT OR REPLACE INTO ui_settings (key, value) VALUES (?, ?)',
    KEY_WEEKLY_4X_LAST_WEEK,
    weekStart
  );
}
