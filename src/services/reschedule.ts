import { getDatabase } from '@/src/db/database';
import { getEventById, updateEvent } from '@/src/services/events';
import { getTaskById, updateTask } from '@/src/services/tasks';
import {
  scheduleItemNotification,
  cancelItemNotification,
} from '@/src/services/notificationEngine';
import { setMove, setSkip, clearException } from '@/src/services/routineExceptions';
import { ensureDayItem } from '@/src/features/today/ensureDayItem';
import { isoFromDate } from '@/src/utils/date';

/**
 * Reagenda task para outra data.
 * Atualiza task.date. Remove day_item do dia antigo.
 */
export async function rescheduleTask(
  taskId: string,
  fromDate: string,
  toDate: string
): Promise<void> {
  const task = await getTaskById(taskId);
  if (!task) return;

  const toOnly = toDate.includes('T') ? toDate.split('T')[0]! : toDate;

  await updateTask(taskId, { ...task, date: toOnly });

  if (task.time) {
    const notifyId = await scheduleItemNotification({
      id: taskId,
      title: task.title,
      date: toOnly,
      time: task.time,
      type: 'task',
    });
    if (notifyId) {
      await updateTask(taskId, { ...task, date: toOnly, notify_id: notifyId });
    }
  }

  const db = await getDatabase();
  const fromOnly = fromDate.includes('T') ? fromDate.split('T')[0]! : fromDate;
  const oldId = `di-t-${taskId}-${fromOnly}`;
  await db.runAsync('DELETE FROM day_items WHERE id = ?', oldId);

  await ensureDayItem(toOnly, 'task', taskId);
}

/**
 * Reagenda event para outra data.
 * Atualiza date. Reprograma notificação -30min.
 */
export async function rescheduleEvent(
  eventId: string,
  fromDate: string,
  toDate: string
): Promise<void> {
  const evt = await getEventById(eventId);
  if (!evt) return;

  const toOnly = toDate.includes('T') ? toDate.split('T')[0]! : toDate;

  await updateEvent({
    ...evt,
    date: toOnly,
  });

  const notifyId = await scheduleItemNotification({
    id: eventId,
    title: evt.title,
    date: toOnly,
    time: evt.start_at ?? '09:00',
    type: 'event',
  });
  if (notifyId) {
    await updateEvent({ ...evt, date: toOnly, notify_id: notifyId });
  }

  const db = await getDatabase();
  const fromOnly = fromDate.includes('T') ? fromDate.split('T')[0]! : fromDate;
  const oldId = `di-e-${eventId}-${fromOnly}`;
  await db.runAsync('DELETE FROM day_items WHERE id = ?', oldId);
}

/**
 * Reagenda ocorrência de rotina para outro dia (exceção move).
 * NÃO altera a regra base.
 * @param routineId ID da rotina
 * @param exceptionDate Data original da exceção (onde a ocorrência seria; para rotina movida = movedFromDate)
 * @param toDate Data destino
 * @param currentDisplayDate Data onde o item está atualmente (para deletar o day_item correto)
 */
export async function rescheduleRoutineOccurrence(
  routineId: string,
  exceptionDate: string,
  toDate: string,
  currentDisplayDate?: string
): Promise<void> {
  const fromOnly = exceptionDate.includes('T') ? exceptionDate.split('T')[0]! : exceptionDate;
  const toOnly = toDate.includes('T') ? toDate.split('T')[0]! : toDate;
  const currentOnly =
    (currentDisplayDate ?? exceptionDate).includes('T')
      ? (currentDisplayDate ?? exceptionDate).split('T')[0]!
      : (currentDisplayDate ?? exceptionDate);

  await setMove(routineId, fromOnly, toOnly);
  await cancelItemNotification({ type: 'routine', id: routineId, occurrenceDate: fromOnly });

  const db = await getDatabase();
  const oldId = `di-r-${routineId}-${currentOnly}`;
  await db.runAsync('DELETE FROM day_items WHERE id = ?', oldId);
}

/**
 * Pula ocorrência da rotina na data (não exibir, não contar).
 */
export async function skipRoutineForDate(routineId: string, date: string): Promise<void> {
  const dateOnly = date.includes('T') ? date.split('T')[0]! : date;
  await cancelItemNotification({ type: 'routine', id: routineId, occurrenceDate: dateOnly });
  await setSkip(routineId, dateOnly);
  const db = await getDatabase();
  const dayItemId = `di-r-${routineId}-${dateOnly}`;
  await db.runAsync('DELETE FROM day_items WHERE id = ?', dayItemId);
}

/** Retorna data de amanhã (YYYY-MM-DD). */
export function getTomorrowIso(fromDate: string): string {
  const d = new Date(fromDate + 'T12:00:00');
  d.setDate(d.getDate() + 1);
  return isoFromDate(d);
}

/** Retorna mesma semana que a data + 7 dias (YYYY-MM-DD). */
export function getNextWeekSameDayIso(fromDate: string): string {
  const d = new Date(fromDate + 'T12:00:00');
  d.setDate(d.getDate() + 7);
  return isoFromDate(d);
}

/**
 * Desfaz reagendamento de rotina (move a ocorrência de volta para a data original).
 */
export async function undoRoutineReschedule(
  routineId: string,
  fromDate: string,
  originalDate: string
): Promise<void> {
  const fromOnly = fromDate.includes('T') ? fromDate.split('T')[0]! : fromDate;
  const origOnly = originalDate.includes('T') ? originalDate.split('T')[0]! : originalDate;

  await clearException(routineId, origOnly);
  const db = await getDatabase();
  const oldId = `di-r-${routineId}-${fromOnly}`;
  await db.runAsync('DELETE FROM day_items WHERE id = ?', oldId);
  await ensureDayItem(origOnly, 'routine', routineId);
}
