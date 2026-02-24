import { getDatabase } from '@/src/db/database';

export const SMART_KEYS = {
  daily_nudge: 'smart_daily_nudge',
  streak_warning: 'smart_streak_warning',
  week_goal_reminder: 'smart_week_goal_reminder',
  any: 'smart_any_sent_today',
} as const;

/**
 * Verifica se pode enviar notificação inteligente.
 * Regras: máx 1/dia por chave E máx 1/dia global (smart_any).
 */
export async function canSendSmart(
  key: keyof typeof SMART_KEYS,
  todayIso: string
): Promise<boolean> {
  const db = await getDatabase();

  const keyVal = SMART_KEYS[key];
  const anyRow = await db.getFirstAsync<{ value: string }>(
    'SELECT value FROM ui_settings WHERE key = ?',
    SMART_KEYS.any
  );
  if (anyRow?.value === todayIso) return false;

  const keyRow = await db.getFirstAsync<{ value: string }>(
    'SELECT value FROM ui_settings WHERE key = ?',
    `notif_log_${keyVal}`
  );
  if (keyRow?.value === todayIso) return false;

  return true;
}

/**
 * Registra que uma notificação inteligente foi enviada.
 */
export async function recordSmartSent(
  key: keyof typeof SMART_KEYS,
  todayIso: string,
  reason: string
): Promise<void> {
  const db = await getDatabase();
  const keyVal = SMART_KEYS[key];
  const logKey = `notif_log_${keyVal}`;
  await db.runAsync(
    'INSERT OR REPLACE INTO ui_settings (key, value) VALUES (?, ?)',
    logKey,
    todayIso
  );
  await db.runAsync(
    'INSERT OR REPLACE INTO ui_settings (key, value) VALUES (?, ?)',
    SMART_KEYS.any,
    todayIso
  );
}
