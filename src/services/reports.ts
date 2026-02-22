import { getDatabase } from '@/src/db/database';
import { getFullyDoneRoutineCategoryDaysInRange } from '@/src/services/routinesDailyStatus';
import { getCategoryDisplayName } from '@/src/services/categoryDisplay';

/**
 * Retorna o total de dias ativos no mês (DISTINCT di.date onde status='done').
 * Conta 1 por dia no máximo, independente de categoria.
 * Considera todos os source_type: event, routine, task.
 */
export async function getMonthlyActiveDaysTotal(
  year: number,
  monthIndex0: number
): Promise<number> {
  const monthStr = String(monthIndex0 + 1).padStart(2, '0');
  const lastDay = new Date(year, monthIndex0 + 1, 0).getDate();
  const startIso = `${year}-${monthStr}-01`;
  const endIso = `${year}-${monthStr}-${String(lastDay).padStart(2, '0')}`;

  const db = await getDatabase();
  const dayItemsDates = await db.getAllAsync<{ date: string }>(
    'SELECT DISTINCT date FROM day_items WHERE status = ? AND date >= ? AND date <= ?',
    'done',
    startIso,
    endIso
  );
  const fullyDone = await getFullyDoneRoutineCategoryDaysInRange(startIso, endIso);
  const allDates = new Set([
    ...dayItemsDates.map((r) => r.date),
    ...fullyDone.map((f) => f.date),
  ]);
  return allDates.size;
}

export interface CategoryActiveDays {
  category_id: string;
  category_name: string;
  color_hex: string;
  active_days: number;
}

/**
 * Retorna dias ativos por categoria no mês.
 * Rotinas SEM times: day_items. Rotinas COM times: só quando fully done.
 */
export async function getMonthlyActiveDaysByCategory(
  year: number,
  monthIndex0: number
): Promise<CategoryActiveDays[]> {
  const monthStr = String(monthIndex0 + 1).padStart(2, '0');
  const lastDay = new Date(year, monthIndex0 + 1, 0).getDate();
  const startIso = `${year}-${monthStr}-01`;
  const endIso = `${year}-${monthStr}-${String(lastDay).padStart(2, '0')}`;

  const db = await getDatabase();

  const dayItemsRows = await db.getAllAsync<{ category_id: string; date: string }>(
    `WITH daily AS (
      SELECT r.category_id, di.date
      FROM day_items di
      JOIN routines r ON r.id = di.source_id
      WHERE di.source_type = 'routine' AND di.status = 'done'
        AND di.date >= ? AND di.date <= ?
        AND r.category_id IS NOT NULL AND r.category_id <> ''
        AND NOT EXISTS (SELECT 1 FROM routine_times rt WHERE rt.routine_id = r.id AND rt.enabled = 1)
      UNION
      SELECT t.category_id, di.date FROM day_items di JOIN tasks t ON t.id = di.source_id
      WHERE di.source_type = 'task' AND di.status = 'done' AND di.date >= ? AND di.date <= ?
        AND t.category_id IS NOT NULL AND t.category_id <> ''
      UNION
      SELECT e.category_id, di.date FROM day_items di JOIN events e ON e.id = di.source_id
      WHERE di.source_type = 'event' AND di.status = 'done' AND di.date >= ? AND di.date <= ?
        AND e.category_id IS NOT NULL AND e.category_id <> ''
    )
    SELECT category_id, date FROM daily`,
    startIso,
    endIso,
    startIso,
    endIso,
    startIso,
    endIso
  );

  const fullyDone = await getFullyDoneRoutineCategoryDaysInRange(startIso, endIso);

  const combined = new Map<string, Set<string>>();
  for (const r of dayItemsRows) {
    if (!combined.has(r.category_id)) combined.set(r.category_id, new Set());
    combined.get(r.category_id)!.add(r.date);
  }
  for (const { date, category_id } of fullyDone) {
    if (!category_id) continue;
    if (!combined.has(category_id)) combined.set(category_id, new Set());
    combined.get(category_id)!.add(date);
  }

  const categories = await db.getAllAsync<{ id: string; name: string; color_hex: string; slug?: string | null; is_system?: number }>(
    'SELECT id, name, color_hex, slug, is_system FROM categories'
  );
  const catMap = new Map(categories.map((c) => [c.id, c]));

  return Array.from(combined.entries())
    .filter(([, dates]) => dates.size > 0)
    .map(([category_id, dates]) => {
      const cat = catMap.get(category_id);
      return {
        category_id,
        category_name: getCategoryDisplayName(cat ?? undefined) || category_id,
        color_hex: cat?.color_hex ?? '#888',
        active_days: dates.size,
      };
    })
    .sort((a, b) => b.active_days - a.active_days);
}

export interface MonthComparisonCategory {
  id: string;
  name: string;
  color: string;
  days: number;
}

export interface MonthComparisonTopCategory {
  id: string;
  name: string;
  color: string;
  currentDays: number;
  previousDays: number;
  diff: number;
}

export interface MonthComparison {
  current: {
    totalDays: number;
    byCategory: MonthComparisonCategory[];
  };
  previous: {
    totalDays: number;
    byCategory: MonthComparisonCategory[];
  };
  delta: {
    totalDaysDiff: number;
    totalDaysPct: number | null;
  };
  topCategories: MonthComparisonTopCategory[];
}

/**
 * Compara mês atual vs mês anterior.
 * previous: se monthIndex0=0, usa dezembro do ano anterior.
 */
export async function getMonthComparison(
  year: number,
  monthIndex0: number
): Promise<MonthComparison> {
  const prevMonth = monthIndex0 === 0 ? 11 : monthIndex0 - 1;
  const prevYear = monthIndex0 === 0 ? year - 1 : year;

  const [currentTotal, currentByCat, previousTotal, previousByCat] = await Promise.all([
    getMonthlyActiveDaysTotal(year, monthIndex0),
    getMonthlyActiveDaysByCategory(year, monthIndex0),
    getMonthlyActiveDaysTotal(prevYear, prevMonth),
    getMonthlyActiveDaysByCategory(prevYear, prevMonth),
  ]);

  const byCategoryMap = (rows: CategoryActiveDays[]): MonthComparisonCategory[] =>
    rows.map((r) => ({
      id: r.category_id,
      name: r.category_name,
      color: r.color_hex,
      days: r.active_days,
    }));

  const currentCat = byCategoryMap(currentByCat);
  const previousCat = byCategoryMap(previousByCat);

  const totalDaysDiff = currentTotal - previousTotal;

  let totalDaysPct: number | null;
  if (previousTotal === 0 && currentTotal > 0) {
    totalDaysPct = null;
  } else if (previousTotal === 0 && currentTotal === 0) {
    totalDaysPct = 0;
  } else {
    totalDaysPct = previousTotal > 0 ? (totalDaysDiff / previousTotal) * 100 : 0;
  }

  const prevByCatMap = new Map(previousCat.map((c) => [c.id, c.days]));
  const allCategoryIds = new Set([
    ...currentCat.map((c) => c.id),
    ...previousCat.map((c) => c.id),
  ]);

  const topCategories: MonthComparisonTopCategory[] = Array.from(allCategoryIds)
    .map((id) => {
      const cur = currentCat.find((c) => c.id === id);
      const prev = previousCat.find((c) => c.id === id);
      const currentDays = cur?.days ?? 0;
      const previousDays = prev?.days ?? prevByCatMap.get(id) ?? 0;
      return {
        id,
        name: cur?.name ?? prev?.name ?? id,
        color: cur?.color ?? prev?.color ?? '#888',
        currentDays,
        previousDays,
        diff: currentDays - previousDays,
      };
    })
    .sort((a, b) => b.currentDays - a.currentDays)
    .slice(0, 3);

  return {
    current: { totalDays: currentTotal, byCategory: currentCat },
    previous: { totalDays: previousTotal, byCategory: previousCat },
    delta: { totalDaysDiff, totalDaysPct },
    topCategories,
  };
}
