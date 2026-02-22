import { getDatabase } from '@/src/db/database';
import {
  scheduleNotification,
  cancelNotification,
  minutesBefore,
} from '@/src/services/notifications';
import {
  getNotificationEnabled,
  getNotificationOffsetMinutes,
  getNotificationApplyTo,
  getQuietHoursEnabled,
  getQuietHoursStart,
  getQuietHoursEnd,
} from '@/src/services/notificationSettings';
import { isWithinQuietHours } from '@/src/utils/timeWindow';
import { listRoutineTimes } from '@/src/services/routineTimes';
import { ensureDayRoutineTimes } from '@/src/services/dayRoutineTimes';

export type NotificationItemType = 'event' | 'task' | 'routine';

export interface ScheduleItemNotificationParams {
  id: string;
  title: string;
  date: string;
  time: string;
  type: NotificationItemType;
  /** Para routines: data da ocorrência. Para event/task: undefined (usa id próprio). */
  occurrenceDate?: string;
}

/**
 * Identificador único para a notificação.
 * Para routine, usamos routineId+occurrenceDate para permitir cancel/reschedule por ocorrência.
 */
function notificationIdentifier(params: ScheduleItemNotificationParams): string {
  const { id, type, occurrenceDate } = params;
  if (type === 'routine' && occurrenceDate) {
    return `routine-${id}-${occurrenceDate}`;
  }
  if (type === 'event') return `evt-${id}`;
  if (type === 'task') return `task-${id}`;
  return `evt-${id}`;
}

/**
 * Agenda lembrete antes de compromissos/tarefas/rotinas.
 * Respeita notification_enabled, notification_offset_minutes e notification_apply_to.
 */
export async function scheduleItemNotification(
  params: ScheduleItemNotificationParams
): Promise<string | null> {
  const { date, time, type } = params;
  const enabled = await getNotificationEnabled();
  if (!enabled) return null;

  const applyTo = await getNotificationApplyTo();
  if (type === 'event' && !applyTo.events) return null;
  if (type === 'task' && !applyTo.tasks) return null;
  if (type === 'routine' && !applyTo.routines) return null;

  const offsetMinutes = await getNotificationOffsetMinutes();
  const dateOnly = date.includes('T') ? date.split('T')[0]! : date;
  const timeStr = time ?? '09:00';
  const notifyAt = new Date(`${dateOnly}T${timeStr}:00`);
  const triggerDate = minutesBefore(notifyAt, offsetMinutes);

  if (triggerDate <= new Date()) return null;

  const [quietEnabled, quietStart, quietEnd] = await Promise.all([
    getQuietHoursEnabled(),
    getQuietHoursStart(),
    getQuietHoursEnd(),
  ]);
  if (quietEnabled) {
    const triggerHHmm = `${String(triggerDate.getHours()).padStart(2, '0')}:${String(triggerDate.getMinutes()).padStart(2, '0')}`;
    if (isWithinQuietHours(triggerHHmm, quietStart, quietEnd)) return null;
  }

  const identifier = notificationIdentifier(params);
  const offsetLabel =
    offsetMinutes === 0
      ? 'agora'
      : offsetMinutes === 60
        ? '1 hora'
        : offsetMinutes === 120
          ? '2 horas'
          : `${offsetMinutes} min`;

  const body = offsetMinutes === 0 ? params.title : `Em ${offsetLabel}: ${params.title}`;

  const notificationId = await scheduleNotification(
    identifier,
    params.title,
    body,
    triggerDate
  );

  return notificationId;
}

/**
 * Agenda notificações por horário para rotina com routine_times.
 * MVP: HOJE e AMANHÃ apenas.
 * Respeita offset e quiet hours. Salva notification_id em day_routine_times.
 */
export async function scheduleRoutineTimeNotifications(
  routineId: string,
  title: string
): Promise<void> {
  const enabled = await getNotificationEnabled();
  if (!enabled) return;

  const applyTo = await getNotificationApplyTo();
  if (!applyTo.routines) return;

  const times = await listRoutineTimes(routineId);
  const enabledTimes = times.filter((t) => t.enabled === 1);
  if (enabledTimes.length === 0) return;

  const offsetMinutes = await getNotificationOffsetMinutes();
  const [quietEnabled, quietStart, quietEnd] = await Promise.all([
    getQuietHoursEnabled(),
    getQuietHoursStart(),
    getQuietHoursEnd(),
  ]);

  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const dates = [
    today.toISOString().slice(0, 10)!,
    tomorrow.toISOString().slice(0, 10)!,
  ];

  const db = await getDatabase();

  for (const dateOnly of dates) {
    await ensureDayRoutineTimes(dateOnly, routineId);
  }

  for (const dateOnly of dates) {
    for (const rt of enabledTimes) {
      const notifyAt = new Date(`${dateOnly}T${rt.time}:00`);
      const triggerDate = minutesBefore(notifyAt, offsetMinutes);

      if (triggerDate <= new Date()) continue;

      const triggerHHmm = `${String(triggerDate.getHours()).padStart(2, '0')}:${String(triggerDate.getMinutes()).padStart(2, '0')}`;
      if (quietEnabled && isWithinQuietHours(triggerHHmm, quietStart, quietEnd)) continue;

      const identifier = `routine-time-${routineId}-${dateOnly}-${rt.time.replace(':', '-')}`;

      const notificationId = await scheduleNotification(
        identifier,
        title,
        `Horário: ${rt.time} - ${title}`,
        triggerDate
      );

      if (notificationId) {
        const drtId = `drt-${dateOnly}-${routineId}-${rt.time.replace(':', '-')}`;
        await db.runAsync(
          'UPDATE day_routine_times SET notification_id = ? WHERE id = ?',
          notificationId,
          drtId
        );
      }
    }
  }
}

/**
 * Cancela notificação de um item.
 * Para event/task: pode receber notify_id do banco ou usar o id do item.
 * Para routine: usa routineId + occurrenceDate.
 */
export async function cancelItemNotification(
  params:
    | { type: 'event'; id: string; notifyId?: string }
    | { type: 'task'; id: string; notifyId?: string }
    | { type: 'routine'; id: string; occurrenceDate: string }
): Promise<void> {
  if (params.type === 'event' || params.type === 'task') {
    if (params.notifyId) {
      await cancelNotification(params.notifyId);
      return;
    }
    const identifier = params.type === 'event' ? `evt-${params.id}` : `task-${params.id}`;
    try {
      await cancelNotification(identifier);
    } catch {
      // Pode não existir
    }
    return;
  }
  const identifier = `routine-${params.id}-${params.occurrenceDate}`;
  try {
    await cancelNotification(identifier);
  } catch {
    // Pode não existir
  }
}
