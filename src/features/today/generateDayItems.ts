import { getDatabase } from '@/src/db/database';
import { getEventsByDate } from '@/src/services/events';
import { getActiveRoutines, getRoutineRules, routineOccursOnDate } from '@/src/services/routines';
import { listRoutineTimes } from '@/src/services/routineTimes';
import { getTasksByDate } from '@/src/services/tasks';
import { getCategoryById } from '@/src/services/categories';
import { ensureDefaultCategories } from '@/src/services/categories';
import { ensureDayItem } from '@/src/features/today/ensureDayItem';
import { scheduleItemNotification } from '@/src/services/notificationEngine';
import { scheduleDailyCheck } from '@/src/services/dailyCheck';
import { runPremiumIntelligence } from '@/src/services/premiumIntelligence';
import {
  getExceptionsForDate,
  getMovedToDate,
} from '@/src/services/routineExceptions';
import { ensureDayRoutineTimes } from '@/src/services/dayRoutineTimes';
import { getCategoryDisplayName } from '@/src/services/categoryDisplay';
import { t } from '@/src/i18n';
import type { DayItem, DayItemWithDetails } from '@/src/types';
import type { Routine } from '@/src/types';
import type { TimeBlock } from '@/src/types';

function getBlockFromTime(timeStr: string | undefined): TimeBlock {
  if (!timeStr) return 'morning';
  const [h] = timeStr.split(':').map(Number);
  if (h >= 5 && h < 12) return 'morning';
  if (h >= 12 && h < 18) return 'afternoon';
  return 'evening';
}

export interface RoutineWithTimesItem {
  routine: Routine;
  dayRoutineTimes: Array<{ id: string; time: string; status: string; notification_id: string | null }>;
  category_id?: string;
  category_name?: string;
  color_hex?: string;
}

/**
 * Retorna rotinas que ocorrem na data E têm routine_times.
 * Chama ensureDayRoutineTimes para cada uma.
 */
export async function getRoutinesWithTimesForDay(
  dateStr: string
): Promise<RoutineWithTimesItem[]> {
  await ensureDefaultCategories();

  const date = new Date(dateStr);
  const dateOnly = dateStr.includes('T') ? dateStr.split('T')[0]! : dateStr;

  const [routines, exceptions, movedTo] = await Promise.all([
    getActiveRoutines(),
    getExceptionsForDate(dateOnly),
    getMovedToDate(dateOnly),
  ]);

  const routineIdsOnDate = new Set<string>();

  for (const routine of routines) {
    const ex = exceptions.get(routine.id);
    if (ex) continue;
    const rules = await getRoutineRules(routine.id);
    if (routineOccursOnDate(routine, rules, date)) {
      routineIdsOnDate.add(routine.id);
    }
  }
  for (const m of movedTo) {
    routineIdsOnDate.add(m.routine_id);
  }

  const result: RoutineWithTimesItem[] = [];

  for (const routine of routines) {
    if (!routineIdsOnDate.has(routine.id)) continue;
    const times = await listRoutineTimes(routine.id);
    if (times.filter((t) => t.enabled === 1).length === 0) continue;

    const dayRoutineTimes = await ensureDayRoutineTimes(dateOnly, routine.id);

    let category_name: string | undefined;
    let color_hex: string | undefined;
    if (routine.category_id) {
      const cat = await getCategoryById(routine.category_id);
      category_name = getCategoryDisplayName(cat ?? undefined);
      color_hex = cat?.color_hex;
    }

    result.push({
      routine,
      dayRoutineTimes: dayRoutineTimes.map((d) => ({
        id: d.id,
        time: d.time,
        status: d.status,
        notification_id: d.notification_id,
      })),
      category_id: routine.category_id ?? undefined,
      category_name,
      color_hex,
    });
  }

  result.sort((a, b) => {
    const timeA = a.dayRoutineTimes[0]?.time ?? '00:00';
    const timeB = b.dayRoutineTimes[0]?.time ?? '00:00';
    return timeA.localeCompare(timeB);
  });

  return result;
}

export async function generateDayItems(dateStr: string): Promise<DayItemWithDetails[]> {
  await ensureDefaultCategories();

  const db = await getDatabase();
  const date = new Date(dateStr);
  const dateOnly = dateStr.includes('T') ? dateStr.split('T')[0]! : dateStr;

  const [events, routines, tasks, exceptions, movedTo] = await Promise.all([
    getEventsByDate(dateOnly),
    getActiveRoutines(),
    getTasksByDate(dateOnly),
    getExceptionsForDate(dateOnly),
    getMovedToDate(dateOnly),
  ]);

  for (const routine of routines) {
    const ex = exceptions.get(routine.id);
    if (ex) continue;
    const rules = await getRoutineRules(routine.id);
    if (!routineOccursOnDate(routine, rules, date)) continue;
    const routineTimes = await listRoutineTimes(routine.id);
    const hasTimes = routineTimes.some((t) => t.enabled === 1);
    if (hasTimes) continue;
    await ensureDayItem(dateOnly, 'routine', routine.id);
    await scheduleItemNotification({
      id: routine.id,
      title: routine.title,
      date: dateOnly,
      time: routine.default_time ?? '09:00',
      type: 'routine',
      occurrenceDate: dateOnly,
    });
  }

  for (const moved of movedTo) {
    const routine = routines.find((r) => r.id === moved.routine_id);
    const routineTimes = routine ? await listRoutineTimes(routine.id) : [];
    const hasTimes = routineTimes.some((t) => t.enabled === 1);
    if (hasTimes) continue;
    await ensureDayItem(dateOnly, 'routine', moved.routine_id);
    if (routine) {
      await scheduleItemNotification({
        id: routine.id,
        title: routine.title,
        date: dateOnly,
        time: routine.default_time ?? '09:00',
        type: 'routine',
        occurrenceDate: dateOnly,
      });
    }
  }

  const movedFromMap = new Map<string, string>();
  for (const m of movedTo) {
    movedFromMap.set(m.routine_id, m.date);
  }

  for (const evt of events) {
    await ensureDayItem(dateOnly, 'event', evt.id);
  }

  for (const task of tasks) {
    await ensureDayItem(dateOnly, 'task', task.id);
  }

  const allDayItems = await db.getAllAsync<DayItem>(
    'SELECT * FROM day_items WHERE date = ?',
    dateOnly
  );

  const result: DayItemWithDetails[] = [];

  for (const item of allDayItems) {
    let title = t('form.untitled');
    let start_at: string | undefined;
    let end_at: string | undefined;
    let block: string | undefined;
    let category_id: string | undefined;
    let color_hex: string | undefined;
    let due_at: string | undefined;
    let due_date: string | undefined;

    let location: string | undefined;
    let notes: string | undefined;

    if (item.source_type === 'event') {
      const evt = events.find((e) => e.id === item.source_id);
      if (evt) {
        title = evt.title;
        start_at = evt.start_at;
        end_at = evt.end_at;
        location = evt.location;
        notes = evt.notes;
        category_id = evt.category_id ?? undefined;
      }
    } else if (item.source_type === 'routine') {
      const routine = routines.find((r) => r.id === item.source_id);
      if (routine) {
        title = routine.title;
        start_at = routine.default_time ?? '09:00';
        end_at = routine.default_time ?? '09:00';
        block = routine.block;
        category_id = routine.category_id;
        location = routine.location;
        notes = routine.notes;
      }
    } else if (item.source_type === 'task') {
      const task = tasks.find((t) => t.id === item.source_id);
      if (task) {
        title = task.title;
        start_at = task.time ?? '09:00';
        category_id = task.category_id;
        location = task.location;
        notes = task.notes;
        due_at = task.due_at;
        due_date = task.due_date ?? task.date;
      }
    }

    let category_name: string | undefined;
    if (category_id) {
      const cat = await getCategoryById(category_id);
      color_hex = cat?.color_hex;
      category_name = getCategoryDisplayName(cat);
    }

    const resolvedBlock: TimeBlock =
      block && block !== 'none' ? (block as TimeBlock) : getBlockFromTime(start_at ?? undefined);
    const movedFromDate = item.source_type === 'routine' ? movedFromMap.get(item.source_id) : undefined;

    result.push({
      ...item,
      title,
      start_at,
      end_at,
      block: resolvedBlock,
      category_id,
      category_name,
      color_hex,
      location,
      notes,
      movedFromDate,
      ...(item.source_type === 'task' && { due_at, due_date }),
    });
  }

  result.sort((a, b) => {
    const timeA = a.start_at ?? '00:00';
    const timeB = b.start_at ?? '00:00';
    return timeA.localeCompare(timeB);
  });

  return result;
}

export async function markDayItemDone(
  id: string,
  done: boolean,
  dateIso?: string
): Promise<void> {
  const db = await getDatabase();
  const done_at = done ? new Date().toISOString() : null;
  const status = done ? 'done' : 'pending';
  await db.runAsync(
    'UPDATE day_items SET status = ?, done_at = ? WHERE id = ?',
    status,
    done_at,
    id
  );
  if (done) {
    scheduleDailyCheck().catch(() => {});
    const resolvedDate =
      dateIso ??
      (await db.getFirstAsync<{ date: string }>('SELECT date FROM day_items WHERE id = ?', id))
        ?.date ??
      new Date().toISOString().slice(0, 10);
    runPremiumIntelligence(resolvedDate).catch(() => {});
  }
}
