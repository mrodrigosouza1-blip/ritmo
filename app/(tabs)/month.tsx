import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  StyleSheet,
  ScrollView,
  View,
  Text,
  Pressable,
  RefreshControl,
  FlatList,
} from 'react-native';
import { router } from 'expo-router';

import { generateDayItems } from '@/src/features/today/generateDayItems';
import { ensureDefaultCategories } from '@/src/services/categories';
import { makeMonthGrid, localDayKey } from '@/src/utils/dateGrid';
import { formatMonthYear, getWeekdayHeadersMondayFirst } from '@/src/utils/i18nDate';
import { getLocale } from '@/src/i18n';
import { useLocale } from '@/src/i18n/useLocale';
import { colors } from '@/src/theme/colors';
import { SkeletonGrid } from '@/src/components/skeleton/SkeletonGrid';

export default function MonthScreen() {
  const { t, locale } = useLocale();
  const [monthData, setMonthData] = useState<Record<string, number>>({});
  const [current, setCurrent] = useState(() => {
    const d = new Date();
    return { year: d.getFullYear(), month: d.getMonth() };
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadMonth = useCallback(async () => {
    try {
      await ensureDefaultCategories();
      const cells = makeMonthGrid(current.year, current.month);
      const data: Record<string, number> = {};

      for (const { date } of cells) {
        const dateStr = localDayKey(date);
        const items = await generateDayItems(dateStr);
        data[dateStr] = items.length;
      }

      setMonthData(data);
    } catch (e) {
      if (__DEV__) console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [current.year, current.month]);

  useEffect(() => {
    loadMonth();
  }, [loadMonth]);

  const weekDayHeaders = useMemo(
    () => getWeekdayHeadersMondayFirst(getLocale()),
    [locale]
  );

  const monthTitle = useMemo(
    () => formatMonthYear(new Date(current.year, current.month, 1), getLocale()),
    [current.year, current.month, locale]
  );

  const prevMonth = () => {
    setCurrent((c) =>
      c.month === 0 ? { year: c.year - 1, month: 11 } : { year: c.year, month: c.month - 1 }
    );
  };

  const nextMonth = () => {
    setCurrent((c) =>
      c.month === 11 ? { year: c.year + 1, month: 0 } : { year: c.year, month: c.month + 1 }
    );
  };

  if (loading) {
    return (
      <ScrollView style={styles.container}>
        <SkeletonGrid columns={7} rows={6} variant="month" />
      </ScrollView>
    );
  }

  const cells = makeMonthGrid(current.year, current.month);
  const todayKey = localDayKey(new Date());

  const renderCell = ({ item, index }: { item: { date: Date; isCurrentMonth: boolean }; index: number }) => {
    const { date, isCurrentMonth } = item;
    const dateStr = localDayKey(date);
    const count = monthData[dateStr] ?? 0;
    const isToday = dateStr === todayKey;

    return (
      <Pressable
        style={[
          styles.cell,
          !isCurrentMonth && styles.cellFaded,
          isToday && styles.cellToday,
        ]}
        onPress={() =>
          router.push({
            pathname: '/day/[date]',
            params: { date: dateStr },
          })
        }>
        <Text
          style={[
            styles.cellNumber,
            !isCurrentMonth && styles.cellNumberFaded,
            isToday && styles.cellNumberToday,
          ]}>
          {date.getDate()}
        </Text>
        {count > 0 && (
          <View style={styles.countBadge}>
            <Text style={styles.countText}>{count}</Text>
          </View>
        )}
      </Pressable>
    );
  };

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={loadMonth} />
      }>
      <View style={styles.header}>
        <Text style={styles.title}>{monthTitle}</Text>
        <View style={styles.nav}>
          <Pressable onPress={prevMonth} accessibilityLabel={t('month.prevMonth')}>
            <Text style={styles.navBtn}>←</Text>
          </Pressable>
          <Pressable onPress={nextMonth} accessibilityLabel={t('month.nextMonth')}>
            <Text style={styles.navBtn}>→</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.weekRow}>
        {weekDayHeaders.map((d, i) => (
          <Text key={`${d}-${i}`} style={styles.weekDay}>
            {d}
          </Text>
        ))}
      </View>

      <FlatList
        data={cells}
        numColumns={7}
        scrollEnabled={false}
        keyExtractor={(item, idx) => localDayKey(item.date) + ':' + idx}
        renderItem={renderCell}
        columnWrapperStyle={styles.columnWrapper}
        contentContainerStyle={styles.gridContent}
        key={`month-${current.year}-${current.month}`}
      />
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: colors.card,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
  },
  nav: {
    flexDirection: 'row',
    gap: 16,
  },
  navBtn: {
    fontSize: 24,
    color: colors.primary,
    fontWeight: 'bold',
  },
  weekRow: {
    flexDirection: 'row',
    paddingHorizontal: 8,
    paddingVertical: 8,
    backgroundColor: colors.card,
  },
  weekDay: {
    flex: 1,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  gridContent: {
    paddingHorizontal: 8,
    paddingBottom: 16,
  },
  columnWrapper: {
    marginBottom: 4,
  },
  cell: {
    flex: 1,
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.card,
    marginHorizontal: 3,
    borderRadius: 14,
  },
  cellFaded: {
    opacity: 0.4,
  },
  cellToday: {
    backgroundColor: colors.primary + '30',
    borderWidth: 2,
    borderColor: colors.primary,
  },
  cellNumber: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  cellNumberFaded: {
    color: colors.textSecondary,
  },
  cellNumberToday: {
    color: colors.primary,
    fontWeight: '700',
  },
  countBadge: {
    position: 'absolute',
    bottom: 4,
    backgroundColor: colors.primary,
    borderRadius: 10,
    minWidth: 20,
    alignItems: 'center',
  },
  countText: {
    fontSize: 10,
    color: '#fff',
    fontWeight: '700',
    paddingHorizontal: 4,
  },
});
