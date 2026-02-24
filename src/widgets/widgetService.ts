import { generateDayItems } from '@/src/features/today/generateDayItems';
import { getRoutinesWithTimesForDay } from '@/src/features/today/generateDayItems';
import { localDayKey } from '@/src/utils/dateKey';
import { getLocale } from '@/src/i18n';
import { getSetting, setSetting } from '@/src/services/appSettings';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { getStreakCurrent, getStreakBest } from '@/src/services/premiumIntelligenceStorage';
import { listGoalsWeekly } from '@/src/services/goalsWeekly';
import { getWeeklyDoneCountsByCategory } from '@/src/services/goalsProgress';
import { getWeekRangeISO } from '@/src/utils/weekRange';
import { getCategoryById } from '@/src/services/categories';
import { getCategoryDisplayName } from '@/src/services/categoryDisplay';
import type { WidgetSnapshot, WeeklyBar, FocusCategoryBar } from '@/src/widgets/widgetSnapshot';

const STORAGE_KEY = 'ritmo_widget_snapshot_v1';

function addDays(iso: string, days: number): string {
  const d = new Date(iso + 'T12:00:00');
  d.setDate(d.getDate() + days);
  return localDayKey(d);
}

/**
 * Calcula percentual do dia (done/planned * 100).
 * Inclui eventos, rotinas (1x sem times, cada slot com times), tarefas.
 */
async function getDayProgress(dateIso: string): Promise<{ total: number; done: number }> {
  const [items, routinesWithTimes] = await Promise.all([
    generateDayItems(dateIso),
    getRoutinesWithTimesForDay(dateIso),
  ]);

  let total = items.length;
  let done = items.filter((i) => i.status === 'done').length;

  for (const rwt of routinesWithTimes) {
    for (const drt of rwt.dayRoutineTimes) {
      total += 1;
      if (drt.status === 'done') done += 1;
    }
  }

  return { total, done };
}

/**
 * Constrói 7 barras (Seg–Dom) com percentual por dia.
 * Se planned=0, percent=0 (barra neutra).
 */
export async function buildWeeklyBars(
  referenceDate: Date
): Promise<WeeklyBar[]> {
  const { start, end } = getWeekRangeISO(referenceDate);
  const bars: WeeklyBar[] = [];
  const startDate = new Date(start + 'T12:00:00');

  for (let i = 0; i < 7; i++) {
    const d = new Date(startDate);
    d.setDate(startDate.getDate() + i);
    const dateIso = localDayKey(d);
    const { total, done } = await getDayProgress(dateIso);
    const percent =
      total > 0 ? Math.min(100, Math.round((done / total) * 100)) : 0;
    bars.push({ date: dateIso, percent });
  }

  return bars;
}

/**
 * Constrói barras de foco por categoria (7 dias).
 * doneCount = 1 se o dia teve atividade na categoria, 0 caso contrário.
 */
async function buildFocusCategoryBars(
  categoryId: string,
  weekStart: string,
  weekEnd: string
): Promise<FocusCategoryBar[]> {
  const goals = await listGoalsWeekly();
  const goal = goals.find((g) => g.category_id === categoryId);
  const targetCount = goal?.target_count ?? 0;

  const startDate = new Date(weekStart + 'T12:00:00');
  const bars: FocusCategoryBar[] = [];

  for (let i = 0; i < 7; i++) {
    const d = new Date(startDate);
    d.setDate(startDate.getDate() + i);
    const dateIso = localDayKey(d);
    const dayRange = { start: dateIso, end: dateIso };
    const doneByDay = await getWeeklyDoneCountsByCategory(
      dayRange.start,
      dayRange.end
    );
    const doneCount = doneByDay.get(categoryId) ?? 0;
    const hit = doneCount >= 1;
    bars.push({
      date: dateIso,
      doneCount,
      targetCount,
      hit,
    });
  }

  return bars;
}

/**
 * Encontra o próximo item pendente (hoje ou futuro).
 * Prioridade: evento com horário > rotina com horário > tarefa com horário.
 */
async function findNextUpcomingItem(
  todayLocal: string
): Promise<WidgetSnapshot['today']['nextItem'] | undefined> {
  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  // Busca hoje e amanhã
  const [todayItems, tomorrowItems, routinesWithTimesToday, routinesWithTimesTomorrow] =
    await Promise.all([
      generateDayItems(todayLocal),
      generateDayItems(addDays(todayLocal, 1)),
      getRoutinesWithTimesForDay(todayLocal),
      getRoutinesWithTimesForDay(addDays(todayLocal, 1)),
    ]);

  // Flatten: day_items + routine times (cada drt = um item)
  type FlatItem = {
    date: string;
    time: string;
    title: string;
    type: 'event' | 'routine' | 'task';
    status: string;
    color_hex?: string;
  };

  const flat: FlatItem[] = [];

  for (const it of todayItems) {
    flat.push({
      date: todayLocal,
      time: it.start_at ?? '00:00',
      title: it.title,
      type: it.source_type,
      status: it.status,
      color_hex: it.color_hex,
    });
  }
  for (const it of tomorrowItems) {
    flat.push({
      date: addDays(todayLocal, 1),
      time: it.start_at ?? '00:00',
      title: it.title,
      type: it.source_type,
      status: it.status,
      color_hex: it.color_hex,
    });
  }

  // Rotinas com horários fixos (day_routine_times)
  for (const rwt of routinesWithTimesToday) {
    for (const drt of rwt.dayRoutineTimes) {
      if (drt.status === 'done') continue;
      flat.push({
        date: todayLocal,
        time: drt.time,
        title: rwt.routine.title,
        type: 'routine',
        status: 'pending',
        color_hex: rwt.color_hex,
      });
    }
  }
  for (const rwt of routinesWithTimesTomorrow) {
    for (const drt of rwt.dayRoutineTimes) {
      if (drt.status === 'done') continue;
      flat.push({
        date: addDays(todayLocal, 1),
        time: drt.time,
        title: rwt.routine.title,
        type: 'routine',
        status: 'pending',
        color_hex: rwt.color_hex,
      });
    }
  }

  const pending = flat.filter((f) => f.status === 'pending');
  pending.sort((a, b) => {
    const cmpDate = a.date.localeCompare(b.date);
    if (cmpDate !== 0) return cmpDate;
    return (a.time ?? '00:00').localeCompare(b.time ?? '00:00');
  });

  for (const it of pending) {
    const isToday = it.date === todayLocal;
    if (isToday) {
      const [h, m] = it.time.split(':').map(Number);
      const itemMinutes = h * 60 + m;
      if (itemMinutes < nowMinutes) continue;
    }
    return {
      type: it.type,
      title: it.title,
      time: it.time.slice(0, 5),
      date: it.date,
      categoryColor: it.color_hex,
    };
  }
  return undefined;
}

/**
 * Constrói o snapshot do widget com dados do dia.
 * Inclui day_items + rotinas com horários fixos (day_routine_times) para total/done.
 * Novos campos: progressPercent, streak, weekly (retrocompatíveis).
 */
export async function buildWidgetSnapshot(): Promise<WidgetSnapshot> {
  const todayLocal = localDayKey(new Date());
  const refDate = new Date(todayLocal + 'T12:00:00');
  const { start: weekStart, end: weekEnd } = getWeekRangeISO(refDate);

  const [
    items,
    nextItem,
    routinesWithTimes,
    streakCurrent,
    streakBest,
    weeklyBars,
  ] = await Promise.all([
    generateDayItems(todayLocal),
    findNextUpcomingItem(todayLocal),
    getRoutinesWithTimesForDay(todayLocal),
    getStreakCurrent(),
    getStreakBest(),
    buildWeeklyBars(refDate),
  ]);

  let totalItems = items.length;
  let doneItems = items.filter((i) => i.status === 'done').length;
  for (const rwt of routinesWithTimes) {
    for (const drt of rwt.dayRoutineTimes) {
      totalItems += 1;
      if (drt.status === 'done') doneItems += 1;
    }
  }

  const progressPercent =
    totalItems > 0 ? Math.round((doneItems / totalItems) * 100) : 0;

  const locale = getLocale();

  const base: WidgetSnapshot = {
    generatedAt: new Date().toISOString(),
    locale: locale as 'pt' | 'en' | 'it',
    today: {
      date: todayLocal,
      totalItems,
      doneItems,
      progressPercent,
      nextItem: nextItem ?? undefined,
    },
    streak: {
      current: streakCurrent || 0,
    },
    weeklyBars,
    weeklyBestStreak: streakBest > 0 ? streakBest : undefined,
  };

  const goals = await listGoalsWeekly();
  if (goals.length > 0) {
    const doneByCat = await getWeeklyDoneCountsByCategory(weekStart, weekEnd);
    const goal = goals.reduce((a, b) =>
      (a.target_count >= b.target_count ? a : b)
    );
    const activeDays = doneByCat.get(goal.category_id) ?? 0;
    const remaining = Math.max(0, goal.target_count - activeDays);

    base.weekly = {
      activeDays,
      target: goal.target_count,
      remaining,
    };

    if (goals.length === 1) {
      const cat = await getCategoryById(goal.category_id);
      if (cat) {
        base.focusCategory = {
          id: cat.id,
          name: getCategoryDisplayName(cat),
          color_hex: cat.color_hex ?? '#7C4DFF',
        };
        base.focusCategoryBars = await buildFocusCategoryBars(
          goal.category_id,
          weekStart,
          weekEnd
        );
      }
    }
  }

  return base;
}

/**
 * Salva o snapshot no storage.
 * Em iOS (Dev Build): também grava JSON no App Group e dispara reload dos widgets.
 */
export async function saveWidgetSnapshot(snapshot: WidgetSnapshot): Promise<void> {
  await setSetting(STORAGE_KEY, snapshot);

  if (Platform.OS === 'android' && Constants.executionEnvironment !== 'storeClient') {
    try {
      const { writeSnapshotAndroid, reloadAndroidWidget } = await import(
        'ritmo-widget-bridge'
      );
      const json = JSON.stringify(snapshot);
      await writeSnapshotAndroid(json);
      reloadAndroidWidget();
      if (__DEV__) {
        console.log(
          `[widgetService] Widget snapshot written Android (bytes=${new TextEncoder().encode(json).length})`
        );
      }
    } catch (e) {
      if (__DEV__) {
        console.warn('[widgetService] Android widget write failed:', e);
      }
    }
  } else if (Platform.OS === 'ios' && Constants.executionEnvironment !== 'storeClient') {
    const json = JSON.stringify(snapshot);
    const bytes = new TextEncoder().encode(json).length;

    try {
      const { writeSnapshotAndReload } = await import('ritmo-widget-bridge');
      await writeSnapshotAndReload(json);
      if (__DEV__) {
        console.log(`[widgetService] Widget snapshot written (bytes=${bytes})`);
      }
    } catch (e) {
      if (__DEV__) {
        console.warn('[widgetService] writeSnapshotAndReload failed:', e);
      }
      try {
        const bridge = await import('ritmo-widget-bridge');
        const path = await bridge.getAppGroupPath();
        if (path) {
          const { writeAsStringAsync } = await import('expo-file-system');
          const fileUri = `file://${path}/ritmo_widget_snapshot_v1.json`;
          await writeAsStringAsync(fileUri, json, { encoding: 'utf8' });
          bridge.reloadWidgets();
          if (__DEV__) {
            console.log(`[widgetService] Widget snapshot written via fallback (bytes=${bytes}, path=${path})`);
          }
        } else {
          if (__DEV__) {
            console.warn('[widgetService] getAppGroupPath returned empty');
          }
        }
      } catch (fallback) {
        if (__DEV__) {
          console.warn('[widgetService] App Group write failed:', fallback);
        }
      }
    }
  }
}

/**
 * Carrega o snapshot do storage.
 */
export async function loadWidgetSnapshot(): Promise<WidgetSnapshot | null> {
  const raw = await getSetting<WidgetSnapshot | null>(STORAGE_KEY, null);
  if (!raw || typeof raw !== 'object') return null;
  const s = raw as unknown as WidgetSnapshot;
  if (!s.generatedAt || !s.today) return null;
  return s;
}
