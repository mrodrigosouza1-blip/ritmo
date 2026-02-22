import { getDatabase } from '@/src/db/database';

const KEYS = {
  todayTypeFilter: 'ui.today.typeFilter',
  todayCategoryFilter: 'ui.today.categoryFilter',
  weekCategoryFilter: 'ui.week.categoryFilter',
  locale: 'ui.locale',
} as const;

export type Locale = 'pt' | 'en' | 'it';

export async function getLocale(): Promise<Locale> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ value: string }>(
    'SELECT value FROM ui_settings WHERE key = ?',
    KEYS.locale
  );
  const v = row?.value;
  if (v === 'en' || v === 'it') return v;
  return 'pt';
}

export async function setLocale(value: Locale): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    'INSERT OR REPLACE INTO ui_settings (key, value) VALUES (?, ?)',
    KEYS.locale,
    value
  );
}

export type TodayTypeFilter = 'all' | 'event' | 'routine' | 'task';
export type CategoryFilter = string; // 'all' | category_id

export async function getTodayTypeFilter(): Promise<TodayTypeFilter> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ value: string }>(
    'SELECT value FROM ui_settings WHERE key = ?',
    KEYS.todayTypeFilter
  );
  const v = row?.value;
  if (v === 'event' || v === 'routine' || v === 'task') return v;
  return 'all';
}

export async function setTodayTypeFilter(value: TodayTypeFilter): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    'INSERT OR REPLACE INTO ui_settings (key, value) VALUES (?, ?)',
    KEYS.todayTypeFilter,
    value
  );
}

export async function getTodayCategoryFilter(): Promise<CategoryFilter> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ value: string }>(
    'SELECT value FROM ui_settings WHERE key = ?',
    KEYS.todayCategoryFilter
  );
  return row?.value ?? 'all';
}

export async function setTodayCategoryFilter(value: CategoryFilter): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    'INSERT OR REPLACE INTO ui_settings (key, value) VALUES (?, ?)',
    KEYS.todayCategoryFilter,
    value
  );
}

export async function getWeekCategoryFilter(): Promise<CategoryFilter> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ value: string }>(
    'SELECT value FROM ui_settings WHERE key = ?',
    KEYS.weekCategoryFilter
  );
  return row?.value ?? 'all';
}

export async function setWeekCategoryFilter(value: CategoryFilter): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    'INSERT OR REPLACE INTO ui_settings (key, value) VALUES (?, ?)',
    KEYS.weekCategoryFilter,
    value
  );
}
