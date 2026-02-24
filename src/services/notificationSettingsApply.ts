import { localDayKey } from '@/src/utils/dateKey';
import { scheduleDailyCheck } from '@/src/services/dailyCheck';
import { scheduleSmartNotification } from '@/src/services/smartNotifications';
import { scheduleItemNotification, cancelItemNotification } from '@/src/services/notificationEngine';
import { getEventsFromDate, updateEvent } from '@/src/services/events';
import { getTasksFromDate, updateTask } from '@/src/services/tasks';

/**
 * Aplica as configurações de notificação atuais:
 * - Atualiza o daily check (18h) baseado em smart.basic
 * - Reagenda notificações de eventos e tarefas futuros
 *
 * Chamar quando o usuário alterar qualquer config de notificações.
 * No Expo Go, o scheduling real pode falhar — não propaga erro.
 */
export async function applyNotificationSettings(): Promise<void> {
  try {
    await scheduleDailyCheck();
  } catch {
    // ignora
  }

  try {
    await scheduleSmartNotification();
  } catch {
    // ignora
  }

  try {
    const todayIso = localDayKey(new Date());
    const [events, tasks] = await Promise.all([
      getEventsFromDate(todayIso),
      getTasksFromDate(todayIso),
    ]);

    for (const evt of events) {
      try {
        await cancelItemNotification({
          type: 'event',
          id: evt.id,
          notifyId: evt.notify_id,
        });
        const notifyId = await scheduleItemNotification({
          id: evt.id,
          title: evt.title,
          date: evt.date,
          time: evt.start_at ?? '09:00',
          type: 'event',
        });
        if (notifyId) {
          await updateEvent({ ...evt, notify_id: notifyId });
        }
      } catch {
        // ignora
      }
    }

    for (const task of tasks) {
      try {
        await cancelItemNotification({
          type: 'task',
          id: task.id,
          notifyId: task.notify_id,
        });
        const notifyId = await scheduleItemNotification({
          id: task.id,
          title: task.title,
          date: task.date,
          time: task.time ?? '09:00',
          type: 'task',
        });
        if (notifyId) {
          await updateTask(task.id, { notify_id: notifyId });
        }
      } catch {
        // ignora
      }
    }
  } catch {
    // ignora — Expo Go pode não suportar scheduling
  }
}
