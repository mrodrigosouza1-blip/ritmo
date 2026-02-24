import { generateDayItems } from '@/src/features/today/generateDayItems';
import { getRoutinesWithTimesForDay } from '@/src/features/today/generateDayItems';
import { getActiveDaysInWeek, getWeeklyDoneCountsByCategory } from '@/src/services/goalsProgress';
import { listGoalsWeekly } from '@/src/services/goalsWeekly';
import { getMonthlyActiveDaysTotal } from '@/src/services/reports';
import { getMonthlyActiveDaysByCategory } from '@/src/services/reports';
import { getStreakCurrent } from '@/src/services/premiumIntelligenceStorage';
import { getWeekRangeISO } from '@/src/utils/weekRange';
import { localDayKey } from '@/src/utils/dateKey';

export interface TodaySummary {
  totalItems: number;
  doneItems: number;
  progressPercent: number;
}

export async function getTodaySummary(dateIso?: string): Promise<TodaySummary> {
  const today = dateIso ?? localDayKey(new Date());
  const [items, routinesWithTimes] = await Promise.all([
    generateDayItems(today),
    getRoutinesWithTimesForDay(today),
  ]);

  let total = items.length;
  let done = items.filter((i) => i.status === 'done').length;
  for (const rwt of routinesWithTimes) {
    for (const drt of rwt.dayRoutineTimes) {
      total += 1;
      if (drt.status === 'done') done += 1;
    }
  }

  const progressPercent = total > 0 ? Math.round((done / total) * 100) : 0;
  return { totalItems: total, doneItems: done, progressPercent };
}

export interface WeekSummary {
  activeDays: number;
  totalDays: number;
  goalsMet: number;
  goalsTotal: number;
  goalsPercent: number;
  streak: number;
}

export async function getWeekSummary(dateIso?: string): Promise<WeekSummary> {
  const today = dateIso ?? localDayKey(new Date());
  const { start, end } = getWeekRangeISO(new Date(today + 'T12:00:00'));
  const [activeDays, goals, doneByCat, streak] = await Promise.all([
    getActiveDaysInWeek(start, end),
    listGoalsWeekly(),
    getWeeklyDoneCountsByCategory(start, end),
    getStreakCurrent(),
  ]);

  let goalsMet = 0;
  for (const g of goals) {
    const count = doneByCat.get(g.category_id) ?? 0;
    if (count >= g.target_count) goalsMet += 1;
  }

  const goalsTotal = goals.length;
  const goalsPercent =
    goalsTotal > 0 ? Math.round((goalsMet / goalsTotal) * 100) : 0;

  return {
    activeDays,
    totalDays: 7,
    goalsMet,
    goalsTotal,
    goalsPercent,
    streak: streak ?? 0,
  };
}

export interface MonthSummary {
  activeDays: number;
  daysInMonth: number;
  consistencyPercent: number;
  avgCompletionPercent: number;
  bestWeekPercent: number;
}

export async function getMonthSummary(
  year: number,
  monthIndex0: number
): Promise<MonthSummary> {
  const daysInMonth = new Date(year, monthIndex0 + 1, 0).getDate();
  const activeDays = await getMonthlyActiveDaysTotal(year, monthIndex0);

  const monthStr = String(monthIndex0 + 1).padStart(2, '0');
  const lastDay = new Date(year, monthIndex0 + 1, 0).getDate();
  const startIso = `${year}-${monthStr}-01`;
  const endIso = `${year}-${monthStr}-${String(lastDay).padStart(2, '0')}`;

  let bestWeekPercent = 0;
  let totalDayCompletion = 0;
  let daysWithItems = 0;

  const d = new Date(year, monthIndex0, 1);
  while (d.getMonth() === monthIndex0) {
    const dateIso = d.toISOString().slice(0, 10);
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
    if (total > 0) {
      daysWithItems += 1;
      const pct = Math.round((done / total) * 100);
      totalDayCompletion += pct;
    }
    d.setDate(d.getDate() + 1);
  }

  const avgCompletionPercent =
    daysWithItems > 0 ? Math.round(totalDayCompletion / daysWithItems) : 0;

  const weekStarts: string[] = [];
  let wd = new Date(year, monthIndex0, 1);
  while (wd.getMonth() === monthIndex0) {
    const { start } = getWeekRangeISO(wd);
    if (!weekStarts.includes(start)) weekStarts.push(start);
    wd.setDate(wd.getDate() + 7);
  }

  for (const weekStart of weekStarts) {
    const weekEnd = new Date(weekStart + 'T12:00:00');
    weekEnd.setDate(weekEnd.getDate() + 6);
    const weekEndIso = weekEnd.toISOString().slice(0, 10);
    const filteredStart =
      weekStart < startIso ? startIso : weekStart;
    const filteredEnd =
      weekEndIso > endIso ? endIso : weekEndIso;
    if (filteredStart <= filteredEnd) {
      const ad = await getActiveDaysInWeek(filteredStart, filteredEnd);
      const denom = 7;
      const pct = Math.round((ad / denom) * 100);
      if (pct > bestWeekPercent) bestWeekPercent = pct;
    }
  }

  const consistencyPercent =
    daysInMonth > 0 ? Math.round((activeDays / daysInMonth) * 100) : 0;

  return {
    activeDays,
    daysInMonth,
    consistencyPercent,
    avgCompletionPercent,
    bestWeekPercent,
  };
}

export interface CategoryStat {
  category_id: string;
  category_name: string;
  color_hex: string;
  active_days: number;
  completion_percent: number;
  target?: number;
}

export async function getCategoryStats(
  period: 'week' | 'month',
  dateIso?: string
): Promise<CategoryStat[]> {
  const today = dateIso ?? localDayKey(new Date());
  const now = new Date(today + 'T12:00:00');

  if (period === 'week') {
    const { start, end } = getWeekRangeISO(now);
    const { getAllCategories } = await import('@/src/services/categories');
    const { getCategoryDisplayName } = await import('@/src/services/categoryDisplay');
    const [doneByCat, goals, categories] = await Promise.all([
      getWeeklyDoneCountsByCategory(start, end),
      listGoalsWeekly(),
      getAllCategories(),
    ]);
    const result: CategoryStat[] = [];
    const seen = new Set<string>();
    for (const [catId, count] of doneByCat) {
      if (!catId || seen.has(catId)) continue;
      seen.add(catId);
      const cat = categories.find((c) => c.id === catId) ?? null;
      const goal = goals.find((g) => g.category_id === catId);
      const target = goal?.target_count ?? 7;
      const completionPercent = Math.min(100, Math.round((count / target) * 100));
      result.push({
        category_id: catId,
        category_name: getCategoryDisplayName(cat ?? undefined) || catId,
        color_hex: cat?.color_hex ?? '#888',
        active_days: count,
        completion_percent: completionPercent,
        target,
      });
    }
    return result.sort((a, b) => b.active_days - a.active_days);
  }

  const year = now.getFullYear();
  const monthIndex0 = now.getMonth();
  const categoriesData = await getMonthlyActiveDaysByCategory(year, monthIndex0);
  const goals = await listGoalsWeekly();
  const daysInMonth = new Date(year, monthIndex0 + 1, 0).getDate();

  return categoriesData
    .map((c) => {
      const goal = goals.find((g) => g.category_id === c.category_id);
      const target = goal?.target_count ?? Math.ceil(daysInMonth / 2);
      const completionPercent = Math.min(
        100,
        Math.round((c.active_days / target) * 100)
      );
      return {
        category_id: c.category_id,
        category_name: c.category_name,
        color_hex: c.color_hex,
        active_days: c.active_days,
        completion_percent: completionPercent,
        target,
      };
    })
    .sort((a, b) => b.active_days - a.active_days);
}
