import { getDatabase } from '@/src/db/database';
import { cancelItemNotification } from '@/src/services/notificationEngine';
import type { Task } from '@/src/types';

export const getTasksByDate = listTasksByDate;

export async function listTasksByDate(date: string): Promise<Task[]> {
  const db = await getDatabase();
  const dateOnly = date.includes('T') ? date.split('T')[0]! : date;
  const rows = await db.getAllAsync<Task>(
    `SELECT * FROM tasks WHERE date = ?
     ORDER BY (time IS NULL OR time = ''), time ASC, title ASC`,
    dateOnly
  );
  return rows.map(normalizeTask);
}

export async function getTaskById(id: string): Promise<Task | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<Task>('SELECT * FROM tasks WHERE id = ?', id);
  return row ? normalizeTask(row) : null;
}

export async function createTask(data: Omit<Task, 'id'> & { id?: string }): Promise<Task> {
  const db = await getDatabase();
  const id = data.id ?? `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  const now = new Date().toISOString();

  await db.runAsync(
    `INSERT INTO tasks (id, title, date, time, category_id, location, notes, created_at, updated_at, notify_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    id,
    data.title,
    data.date,
    data.time ?? null,
    data.category_id ?? null,
    data.location ?? null,
    data.notes ?? null,
    now,
    now,
    data.notify_id ?? null
  );

  const task = await getTaskById(id);
  return task!;
}

export async function updateTask(id: string, patch: Partial<Task>): Promise<void> {
  const existing = await getTaskById(id);
  if (!existing) return;

  if (existing.notify_id) {
    await cancelItemNotification({ type: 'task', id, notifyId: existing.notify_id });
  }

  const db = await getDatabase();
  const updated_at = new Date().toISOString();

  const task: Task = { ...existing, ...patch };

  await db.runAsync(
    `UPDATE tasks SET
       title = ?,
       date = ?,
       time = ?,
       category_id = ?,
       location = ?,
       notes = ?,
       updated_at = ?,
       notify_id = ?
     WHERE id = ?`,
    task.title,
    task.date,
    task.time ?? null,
    task.category_id ?? null,
    task.location ?? null,
    task.notes ?? null,
    updated_at,
    task.notify_id ?? null,
    id
  );
}

export async function getTasksFromDate(fromDate: string): Promise<Task[]> {
  const db = await getDatabase();
  const dateOnly = fromDate.includes('T') ? fromDate.split('T')[0]! : fromDate;
  const rows = await db.getAllAsync<Task>(
    `SELECT * FROM tasks WHERE date >= ? AND time IS NOT NULL AND time != ''
     ORDER BY date, time`,
    dateOnly
  );
  return rows.map(normalizeTask);
}

export async function deleteTask(id: string): Promise<void> {
  const existing = await getTaskById(id);
  if (existing?.notify_id) {
    await cancelItemNotification({ type: 'task', id, notifyId: existing.notify_id });
  }
  const db = await getDatabase();
  await db.runAsync('DELETE FROM tasks WHERE id = ?', id);
}

function normalizeTask(row: Record<string, unknown>): Task {
  const date =
    (row.date as string) ??
    (row.due_date as string) ??
    (row.due_at as string)?.toString().slice(0, 10) ??
    '';
  const time =
    (row.time as string) ??
    ((row.due_at as string)?.includes('T')
      ? (row.due_at as string).slice(11, 16)
      : (row.due_at as string)?.length === 5
        ? (row.due_at as string)
        : undefined);

  return {
    id: row.id as string,
    title: row.title as string,
    date,
    time: time || undefined,
    category_id: (row.category_id as string) || undefined,
    location: (row.location as string) || undefined,
    notes: (row.notes as string) || undefined,
    created_at: (row.created_at as string) || undefined,
    updated_at: (row.updated_at as string) || undefined,
    notify_id: (row.notify_id as string) || undefined,
  };
}
