import { getDatabase } from '@/src/db/database';

/**
 * Service genérico para persistir configurações na tabela ui_settings.
 */

function serialize<T>(value: T): string {
  if (typeof value === 'boolean') return value ? '1' : '0';
  if (typeof value === 'number') return String(value);
  if (typeof value === 'string') return value;
  return JSON.stringify(value);
}

function deserialize<T>(raw: string | null | undefined, fallback: T): T {
  if (raw == null || raw === '') return fallback;
  if (typeof fallback === 'boolean') return (raw === '1' || raw === 'true') as T;
  if (typeof fallback === 'number') {
    const n = parseInt(raw, 10);
    return (Number.isFinite(n) ? n : fallback) as T;
  }
  if (typeof fallback === 'string') return raw as T;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export async function getSetting<T>(key: string, fallback: T): Promise<T> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ value: string }>(
    'SELECT value FROM ui_settings WHERE key = ?',
    key
  );
  return deserialize(row?.value, fallback);
}

export async function setSetting<T>(key: string, value: T): Promise<void> {
  const db = await getDatabase();
  const serialized = serialize(value);
  await db.runAsync(
    'INSERT OR REPLACE INTO ui_settings (key, value) VALUES (?, ?)',
    key,
    serialized
  );
}
