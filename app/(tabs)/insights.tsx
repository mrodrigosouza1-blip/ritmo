import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

import { colors } from '@/src/theme/colors';
import { useLocale } from '@/src/i18n/useLocale';
import { ensureDefaultCategories } from '@/src/services/categories';
import {
  getTodaySummary,
  getWeekSummary,
  getMonthSummary,
  getCategoryStats,
  type TodaySummary,
  type WeekSummary,
  type MonthSummary,
  type CategoryStat,
} from '@/src/services/insights';
import { localDayKey } from '@/src/utils/dateKey';

function getMotivationText(avgPct: number): string {
  if (avgPct < 40) return 'insights.motivationLow';
  if (avgPct < 70) return 'insights.motivationMid';
  return 'insights.motivationHigh';
}

export default function InsightsScreen() {
  const { t } = useLocale();
  const todayIso = useMemo(() => localDayKey(new Date()), []);
  const [today, setToday] = useState<TodaySummary | null>(null);
  const [week, setWeek] = useState<WeekSummary | null>(null);
  const [month, setMonth] = useState<MonthSummary | null>(null);
  const [categories, setCategories] = useState<CategoryStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      await ensureDefaultCategories();
      const now = new Date();
      const [todayData, weekData, monthData, catData] = await Promise.all([
        getTodaySummary(todayIso),
        getWeekSummary(todayIso),
        getMonthSummary(now.getFullYear(), now.getMonth()),
        getCategoryStats('month', todayIso),
      ]);
      setToday(todayData);
      setWeek(weekData);
      setMonth(monthData);
      setCategories(catData);
    } catch (e) {
      if (__DEV__) console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [todayIso]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      loadData();
    }, [loadData])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData();
  }, [loadData]);

  if (loading && !today) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>{t('insights.loading')}</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }>
      {/* Hoje */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('insights.todayTitle')}</Text>
        <View style={styles.card}>
          {today && today.totalItems > 0 ? (
            <>
              <Text style={styles.cardTitle}>
                {t('insights.todayCompleted', {
                  done: String(today.doneItems),
                  total: String(today.totalItems),
                })}
              </Text>
              <View style={styles.progressBarBg}>
                <View
                  style={[
                    styles.progressBarFill,
                    { width: `${today.progressPercent}%` },
                  ]}
                />
              </View>
            </>
          ) : (
            <Text style={styles.cardEmpty}>{t('insights.todayEmpty')}</Text>
          )}
        </View>
      </View>

      {/* Semana */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('insights.weekTitle')}</Text>
        <View style={styles.card}>
          {week ? (
            <>
              <Text style={styles.cardTitle}>
                {t('insights.weekActiveDays', {
                  count: String(week.activeDays),
                })}
              </Text>
              {week.goalsTotal > 0 && (
                <Text style={styles.cardSub}>
                  {t('insights.weekGoals', {
                    met: String(week.goalsMet),
                    total: String(week.goalsTotal),
                  })}
                </Text>
              )}
              {week.streak > 0 && (
                <Text style={styles.streakBadge}>
                  {t('insights.streak', { count: String(week.streak) })}
                </Text>
              )}
              {week.goalsPercent >= 70 && week.goalsTotal > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>✓ 70%+</Text>
                </View>
              )}
            </>
          ) : (
            <Text style={styles.cardEmpty}>{t('insights.weekEmpty')}</Text>
          )}
        </View>
      </View>

      {/* Mês */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('insights.monthTitle')}</Text>
        <View style={styles.card}>
          {month ? (
            <>
              <Text style={styles.cardTitle}>
                {t('insights.monthConsistent', { count: String(month.activeDays) })}
              </Text>
              <Text style={styles.cardSub}>
                {t('insights.monthAvg', {
                  pct: String(month.avgCompletionPercent),
                })}
              </Text>
              {month.bestWeekPercent > 0 && (
                <Text style={styles.cardSub}>
                  {t('insights.monthBestWeek', {
                    pct: String(month.bestWeekPercent),
                  })}
                </Text>
              )}
              <Text style={styles.motivationText}>
                {t(getMotivationText(month.avgCompletionPercent))}
              </Text>
            </>
          ) : (
            <Text style={styles.cardEmpty}>{t('insights.monthEmpty')}</Text>
          )}
        </View>
      </View>

      {/* Por Categoria */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('insights.categoriesTitle')}</Text>
        {categories.length > 0 ? (
          categories.map((c) => (
            <View key={c.category_id} style={styles.categoryRow}>
              <View
                style={[styles.categoryDot, { backgroundColor: c.color_hex }]}
              />
              <View style={styles.categoryContent}>
                <Text style={styles.categoryName}>{c.category_name}</Text>
                <Text style={styles.categoryMeta}>
                  {t('insights.categoryDays', { days: String(c.active_days) })}{' '}
                  • {t('insights.categoryPct', { pct: String(c.completion_percent) })}
                </Text>
              </View>
              <View style={styles.categoryPctBar}>
                <View
                  style={[
                    styles.categoryPctFill,
                    {
                      width: `${Math.min(100, c.completion_percent)}%`,
                      backgroundColor: c.color_hex,
                    },
                  ]}
                />
              </View>
            </View>
          ))
        ) : (
          <View style={styles.card}>
            <Text style={styles.cardEmpty}>{t('insights.categoriesEmpty')}</Text>
          </View>
        )}
      </View>

      <View style={styles.bottomSpacer} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: 16,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: colors.textSecondary,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
    marginHorizontal: 4,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.text,
  },
  cardSub: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 4,
  },
  cardEmpty: {
    fontSize: 15,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
  progressBarBg: {
    height: 8,
    backgroundColor: colors.border,
    borderRadius: 4,
    marginTop: 12,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 4,
  },
  streakBadge: {
    fontSize: 13,
    color: colors.primary,
    fontWeight: '600',
    marginTop: 8,
  },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.success + '20',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginTop: 8,
  },
  badgeText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.success,
  },
  motivationText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    marginTop: 12,
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  categoryDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 12,
  },
  categoryContent: {
    flex: 1,
  },
  categoryName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  categoryMeta: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  categoryPctBar: {
    width: 48,
    height: 6,
    backgroundColor: colors.border,
    borderRadius: 3,
    overflow: 'hidden',
  },
  categoryPctFill: {
    height: '100%',
    borderRadius: 3,
  },
  bottomSpacer: {
    height: 24,
  },
});
