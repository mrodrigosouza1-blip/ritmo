import { getDatabase } from '@/src/db/database';

const KEY_COMPLETED = 'onboarding_completed';
const KEY_GOAL = 'onboarding_goal';
const KEY_NOTIFICATIONS = 'notifications_enabled';

export async function getOnboardingCompleted(): Promise<boolean> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ value: string }>(
    'SELECT value FROM ui_settings WHERE key = ?',
    KEY_COMPLETED
  );
  return row?.value === '1';
}

/**
 * Retorna true se deve mostrar o onboarding (primeira vez ou após reset).
 */
export async function shouldShowOnboarding(): Promise<boolean> {
  return !(await getOnboardingCompleted());
}

/** Alias semântico: marca que o usuário já viu o onboarding. */
export async function setHasSeenOnboarding(value: boolean): Promise<void> {
  await setOnboardingCompleted(value);
}

export async function setOnboardingCompleted(value: boolean): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    'INSERT OR REPLACE INTO ui_settings (key, value) VALUES (?, ?)',
    KEY_COMPLETED,
    value ? '1' : '0'
  );
}

export async function getOnboardingGoal(): Promise<string | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ value: string }>(
    'SELECT value FROM ui_settings WHERE key = ?',
    KEY_GOAL
  );
  return row?.value ?? null;
}

export async function setOnboardingGoal(goal: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    'INSERT OR REPLACE INTO ui_settings (key, value) VALUES (?, ?)',
    KEY_GOAL,
    goal
  );
}

export async function getNotificationsEnabled(): Promise<boolean> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ value: string }>(
    'SELECT value FROM ui_settings WHERE key = ?',
    KEY_NOTIFICATIONS
  );
  return row?.value === '1';
}

export async function setNotificationsEnabled(value: boolean): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    'INSERT OR REPLACE INTO ui_settings (key, value) VALUES (?, ?)',
    KEY_NOTIFICATIONS,
    value ? '1' : '0'
  );
}
