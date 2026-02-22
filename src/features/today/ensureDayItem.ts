import { getDatabase } from '@/src/db/database';

export type SourceType = 'event' | 'routine' | 'task';

function dayItemId(date: string, sourceType: SourceType, sourceId: string): string {
  const prefix = sourceType === 'event' ? 'e' : sourceType === 'routine' ? 'r' : 't';
  const dateOnly = date.includes('T') ? date.split('T')[0]! : date;
  return `di-${prefix}-${sourceId}-${dateOnly}`;
}

/**
 * Garante que existe day_item para a combinação (date, source_type, source_id).
 * Cria se não existir e retorna o id.
 */
export async function ensureDayItem(
  date: string,
  source_type: SourceType,
  source_id: string
): Promise<string> {
  const db = await getDatabase();
  const dateOnly = date.includes('T') ? date.split('T')[0]! : date;
  const id = dayItemId(dateOnly, source_type, source_id);

  await db.runAsync(
    `INSERT OR IGNORE INTO day_items (id, date, source_type, source_id, status, done_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    id,
    dateOnly,
    source_type,
    source_id,
    'pending',
    null
  );

  return id;
}

/**
 * Retorna o status do day_item (pending/done).
 */
export async function getDayItemStatus(
  date: string,
  sourceType: SourceType,
  sourceId: string
): Promise<'pending' | 'done'> {
  const db = await getDatabase();
  const dateOnly = date.includes('T') ? date.split('T')[0]! : date;
  const id = dayItemId(dateOnly, sourceType, sourceId);

  const row = await db.getFirstAsync<{ status: string }>(
    'SELECT status FROM day_items WHERE id = ?',
    id
  );

  return row?.status === 'done' ? 'done' : 'pending';
}
