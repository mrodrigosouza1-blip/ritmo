import { getDatabase } from '@/src/db/database';

const KEYS = {
  streakCurrent: 'streak_current',
  streakLastActiveDate: 'streak_last_active_date',
  lastWeeklySummarySent: 'last_weekly_summary_sent',
  lastMonthlyCompareSent: 'last_monthly_compare_sent',
  premiumSentToday: 'premium_sent_today',
  streakBreakSentToday: 'streak_break_sent_today',
  goalAlmostSentPrefix: 'goal_almost_sent_',
} as const;

export async function getStreakCurrent(): Promise<number> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ value: string }>(
    'SELECT value FROM ui_settings WHERE key = ?',
    KEYS.streakCurrent
  );
  const n = row?.value != null ? parseInt(row.value, 10) : NaN;
  return Number.isFinite(n) ? n : 0;
}

export async function setStreakCurrent(value: number): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    'INSERT OR REPLACE INTO ui_settings (key, value) VALUES (?, ?)',
    KEYS.streakCurrent,
    String(value)
  );
}

export async function getStreakLastActiveDate(): Promise<string | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ value: string }>(
    'SELECT value FROM ui_settings WHERE key = ?',
    KEYS.streakLastActiveDate
  );
  return row?.value ?? null;
}

export async function setStreakLastActiveDate(value: string | null): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    'INSERT OR REPLACE INTO ui_settings (key, value) VALUES (?, ?)',
    KEYS.streakLastActiveDate,
    value ?? ''
  );
}

export async function getLastWeeklySummarySent(): Promise<string | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ value: string }>(
    'SELECT value FROM ui_settings WHERE key = ?',
    KEYS.lastWeeklySummarySent
  );
  return row?.value ?? null;
}

export async function setLastWeeklySummarySent(value: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    'INSERT OR REPLACE INTO ui_settings (key, value) VALUES (?, ?)',
    KEYS.lastWeeklySummarySent,
    value
  );
}

export async function getLastMonthlyCompareSent(): Promise<string | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ value: string }>(
    'SELECT value FROM ui_settings WHERE key = ?',
    KEYS.lastMonthlyCompareSent
  );
  return row?.value ?? null;
}

export async function setLastMonthlyCompareSent(value: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    'INSERT OR REPLACE INTO ui_settings (key, value) VALUES (?, ?)',
    KEYS.lastMonthlyCompareSent,
    value
  );
}

/** Verifica se já enviou alguma notificação premium hoje. */
export async function getPremiumSentToday(): Promise<string | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ value: string }>(
    'SELECT value FROM ui_settings WHERE key = ?',
    KEYS.premiumSentToday
  );
  return row?.value ?? null;
}

/** Registra que uma notificação premium foi enviada hoje (YYYY-MM-DD). */
export async function setPremiumSentToday(value: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    'INSERT OR REPLACE INTO ui_settings (key, value) VALUES (?, ?)',
    KEYS.premiumSentToday,
    value
  );
}

/** Quebra de sequência: só dispara 1x por dia. */
export async function getStreakBreakSentToday(): Promise<string | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ value: string }>(
    'SELECT value FROM ui_settings WHERE key = ?',
    KEYS.streakBreakSentToday
  );
  return row?.value ?? null;
}

export async function setStreakBreakSentToday(value: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    'INSERT OR REPLACE INTO ui_settings (key, value) VALUES (?, ?)',
    KEYS.streakBreakSentToday,
    value
  );
}

/** Para meta quase batida: última semana em que enviamos para esta categoria (week start YYYY-MM-DD). */
export async function getGoalAlmostSentWeek(categoryId: string): Promise<string | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ value: string }>(
    'SELECT value FROM ui_settings WHERE key = ?',
    KEYS.goalAlmostSentPrefix + categoryId
  );
  return row?.value ?? null;
}

export async function setGoalAlmostSentWeek(categoryId: string, weekStart: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    'INSERT OR REPLACE INTO ui_settings (key, value) VALUES (?, ?)',
    KEYS.goalAlmostSentPrefix + categoryId,
    weekStart
  );
}
