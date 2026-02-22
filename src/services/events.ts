import { getDatabase } from '@/src/db/database';
import { cancelNotification } from './notifications';
import type { Event } from '@/src/types';

export async function createEvent(event: Event): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `INSERT INTO events (id, title, date, start_at, end_at, location, notes, notify_id, category_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    event.id,
    event.title,
    event.date,
    event.start_at,
    event.end_at,
    event.location ?? null,
    event.notes ?? null,
    event.notify_id ?? null,
    event.category_id ?? null
  );
}

export async function getEventsByDate(date: string): Promise<Event[]> {
  const db = await getDatabase();
  const dateOnly = date.includes('T') ? date.split('T')[0] : date;
  const rows = await db.getAllAsync<Event>(
    `SELECT * FROM events 
     WHERE (date = ? OR (date IS NULL AND date(start_at) = ?))
     ORDER BY date, start_at`,
    dateOnly,
    dateOnly
  );
  return rows.map(normalizeEvent);
}

function normalizeEvent(e: Event & { date?: string | null }): Event {
  const date = e.date ?? (e.start_at?.includes('T') ? e.start_at.split('T')[0]! : '');
  const start_at = e.start_at?.includes('T') ? e.start_at.slice(11, 16) : (e.start_at ?? '09:00');
  const end_at = e.end_at?.includes('T') ? e.end_at.slice(11, 16) : (e.end_at ?? start_at);
  return { ...e, date, start_at, end_at };
}

export async function getEventById(id: string): Promise<Event | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<Event & { date?: string | null }>(
    'SELECT * FROM events WHERE id = ?',
    id
  );
  if (!row) return null;
  return normalizeEvent(row);
}

export async function updateEvent(event: Event): Promise<void> {
  const existing = await getEventById(event.id);
  if (existing?.notify_id) {
    await cancelNotification(existing.notify_id);
  }

  const db = await getDatabase();
  await db.runAsync(
    `UPDATE events SET title=?, date=?, start_at=?, end_at=?, location=?, notes=?, notify_id=?, category_id=?
     WHERE id=?`,
    event.title,
    event.date,
    event.start_at,
    event.end_at,
    event.location ?? null,
    event.notes ?? null,
    event.notify_id ?? null,
    event.category_id ?? null,
    event.id
  );
}

export async function deleteEvent(id: string): Promise<void> {
  const existing = await getEventById(id);
  if (existing?.notify_id) {
    await cancelNotification(existing.notify_id);
  }

  const db = await getDatabase();
  await db.runAsync('DELETE FROM events WHERE id = ?', id);
}

export async function getAllEvents(): Promise<Event[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<Event & { date?: string | null }>(
    'SELECT * FROM events ORDER BY date, start_at'
  );
  return rows.map(normalizeEvent);
}

export async function getEventsFromDate(fromDate: string): Promise<Event[]> {
  const db = await getDatabase();
  const dateOnly = fromDate.includes('T') ? fromDate.split('T')[0]! : fromDate;
  const rows = await db.getAllAsync<Event & { date?: string | null }>(
    'SELECT * FROM events WHERE date >= ? ORDER BY date, start_at',
    dateOnly
  );
  return rows.map(normalizeEvent);
}

export interface EventWithCategory extends Event {
  color_hex?: string | null;
}

/**
 * Retorna o próximo compromisso futuro a partir de fromDate.
 * Ordena por date ASC, start_at ASC. Apenas events com date > fromDate.
 */
export async function getNextUpcomingEvent(
  fromDate: string
): Promise<EventWithCategory | null> {
  const db = await getDatabase();
  const dateOnly = fromDate.includes('T') ? fromDate.split('T')[0] : fromDate;
  const row = await db.getFirstAsync<Event & { date?: string | null; color_hex?: string | null }>(
    `SELECT e.*, c.color_hex
     FROM events e
     LEFT JOIN categories c ON c.id = e.category_id
     WHERE e.date > ?
     ORDER BY e.date ASC, e.start_at ASC
     LIMIT 1`,
    dateOnly
  );
  if (!row) return null;
  return { ...normalizeEvent(row), color_hex: row.color_hex };
}
