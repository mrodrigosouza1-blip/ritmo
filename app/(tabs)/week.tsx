import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  StyleSheet,
  ScrollView,
  View,
  Text,
  Pressable,
  RefreshControl,
} from 'react-native';
import { router } from 'expo-router';

import { ensureDefaultCategories, getAllCategories } from '@/src/services/categories';
import { getWeekCategoryFilter, setWeekCategoryFilter } from '@/src/services/uiState';
import { localDayKey } from '@/src/utils/dateKey';
import { getWeekdayHeadersMondayFirst } from '@/src/utils/i18nDate';
import { getLocale } from '@/src/i18n';
import { useLocale } from '@/src/i18n/useLocale';
import { getCategoryDisplayName } from '@/src/services/categoryDisplay';
import { colors } from '@/src/theme/colors';
import { ChipsRow, type ChipItem } from '@/src/components/ChipsRow';
import { SkeletonGrid } from '@/src/components/skeleton/SkeletonGrid';

function getWeekDates(date: Date): Date[] {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d);
  monday.setDate(diff);
  const week: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const dayDate = new Date(monday);
    dayDate.setDate(monday.getDate() + i);
    week.push(dayDate);
  }
  return week;
}

interface DayData {
  date: string;
  items: Array<{ color_hex?: string; category_id?: string }>;
}

interface DaySummary {
  date: string;
  count: number;
  colors: string[];
}

export default function WeekScreen() {
  const { t, locale } = useLocale();
  const [dayData, setDayData] = useState<DayData[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [categoryFilter, setCategoryFilterState] = useState<string>('all');
  const [categories, setCategories] = useState<ChipItem[]>([]);

  useEffect(() => {
    (async () => {
      const cat = await getWeekCategoryFilter();
      setCategoryFilterState(cat);
    })();
  }, []);

  useEffect(() => {
    ensureDefaultCategories().then(() =>
      getAllCategories().then((list) => {
        setCategories([
          { id: 'all', label: t('common.all') },
          ...list.map((c) => ({ id: c.id, label: getCategoryDisplayName(c), colorHex: c.color_hex })),
        ]);
      })
    );
  }, [t, locale]);

  const setCategoryFilter = useCallback(async (v: string) => {
    setCategoryFilterState(v);
    await setWeekCategoryFilter(v);
  }, []);

  const loadWeek = useCallback(async () => {
    try {
      await ensureDefaultCategories();
      const week = getWeekDates(new Date());
      const dateStrs = week.map((d) => localDayKey(d));

      const { generateDayItems } = await import('@/src/features/today/generateDayItems');
      const withItems = await Promise.all(
        dateStrs.map(async (dateStr) => {
          const items = await generateDayItems(dateStr);
          return { date: dateStr, items };
        })
      );

      setDayData(withItems);
    } catch (e) {
      if (__DEV__) console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [t]);

  const dayNames = useMemo(
    () => getWeekdayHeadersMondayFirst(getLocale()),
    [locale]
  );

  const days: DaySummary[] = useMemo(
    () =>
      dayData.map(({ date, items }) => {
        const filtered =
          categoryFilter === 'all'
            ? items
            : items.filter((i) => i.category_id === categoryFilter);
        const categoryColors = [
          ...new Set(filtered.map((i) => i.color_hex).filter(Boolean)),
        ] as string[];
        return {
          date,
          count: filtered.length,
          colors: categoryColors.length ? categoryColors : [colors.textSecondary],
        };
      }),
    [dayData, categoryFilter]
  );

  useEffect(() => {
    loadWeek();
  }, [loadWeek]);

  if (loading) {
    return (
      <ScrollView style={styles.container}>
        <View style={styles.header}>
          <SkeletonGrid columns={7} rows={1} variant="week" />
        </View>
      </ScrollView>
    );
  }

  const weekDays = getWeekDates(new Date());

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={loadWeek} />
      }>
      <View style={styles.header}>
        <Text style={styles.title}>{t('week.title')}</Text>
        {categories.length > 0 && (
          <View style={styles.chipsWrapper}>
            <ChipsRow
              items={categories}
              selectedId={categoryFilter}
              onSelect={setCategoryFilter}
            />
          </View>
        )}
      </View>

      <View style={styles.grid}>
        {weekDays.map((day, i) => {
          const summary = days[i];
          const count = summary?.count ?? 0;
          const dotColors = summary?.colors ?? [colors.textSecondary];
          const dayIso = localDayKey(day);
          const dayIdx = day.getDay() === 0 ? 6 : day.getDay() - 1;
          return (
            <Pressable
              key={i}
              style={styles.dayCard}
              onPress={() =>
                router.push({
                  pathname: '/day/[date]',
                  params: { date: dayIso },
                })
              }>
              <Text style={styles.dayName}>{dayNames[dayIdx]}</Text>
              <Text style={styles.dayNumber}>{day.getDate()}</Text>
              <View style={styles.dots}>
                {dotColors.slice(0, 3).map((c, j) => (
                  <View
                    key={j}
                    style={[styles.dot, { backgroundColor: c }]}
                  />
                ))}
              </View>
              <Text style={styles.countText}>{count} {t('common.items')}</Text>
            </Pressable>
          );
        })}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  loadingText: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  header: {
    padding: 16,
    backgroundColor: colors.card,
  },
  chipsWrapper: {
    marginTop: 8,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 12,
    gap: 8,
  },
  dayCard: {
    width: '31%',
    backgroundColor: colors.card,
    padding: 12,
    borderRadius: 12,
  },
  dayName: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  dayNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    marginVertical: 4,
  },
  dots: {
    flexDirection: 'row',
    gap: 4,
    marginBottom: 4,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  countText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
});
