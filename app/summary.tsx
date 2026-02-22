import React, { useState, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  Pressable,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { router } from 'expo-router';

import { getDatabase } from '@/src/db/database';
import { getCategoryDisplayName } from '@/src/services/categoryDisplay';
import { getAllCategories } from '@/src/services/categories';
import { ensureDefaultCategories } from '@/src/services/categories';
import { getWeeklyDoneCountsByCategory } from '@/src/services/goalsProgress';
import { getWeekRangeISO } from '@/src/utils/weekRange';
import { formatDate } from '@/src/utils/formatDate';
import { useLocale } from '@/src/i18n/useLocale';
import type { Category, GoalWeekly } from '@/src/types';
import { colors } from '@/src/theme/colors';

type GoalWithCategory = GoalWeekly & { category?: Category; completed?: number };

export default function SummaryScreen() {
  const { t, locale } = useLocale();
  const [goals, setGoals] = useState<GoalWithCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [weekRange, setWeekRange] = useState<{ start: string; end: string } | null>(null);

  const loadData = useCallback(async () => {
    try {
      await ensureDefaultCategories();
      const { start, end } = getWeekRangeISO(new Date());
      setWeekRange({ start, end });

      const db = await getDatabase();
      const cats = await getAllCategories();
      const doneCounts = await getWeeklyDoneCountsByCategory(start, end);

      const goalRows = await db.getAllAsync<GoalWeekly>('SELECT * FROM goals_weekly ORDER BY category_id');
      const withCat = goalRows.map((g) => ({
        ...g,
        category: cats.find((c) => c.id === g.category_id),
        completed: doneCounts.get(g.category_id) ?? 0,
      }));
      setGoals(withCat);
    } catch (e) {
      if (__DEV__) console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      loadData();
    }, [loadData])
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <Text style={styles.loadingText}>{t('common.loading')}</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('summary.title')}</Text>
        <Text style={styles.subtitle}>{t('summary.subtitle')}</Text>
        {weekRange && (
          <Text style={styles.weekPeriod}>
            {t('goals.week')}: {formatDate(weekRange.start, locale)} – {formatDate(weekRange.end, locale)}
          </Text>
        )}
      </View>

      {goals.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>{t('summary.empty')}</Text>
          <Pressable
            style={styles.emptyCta}
            onPress={() => router.push('/modal/goal')}>
            <Text style={styles.emptyCtaText}>{t('summary.createGoal')}</Text>
          </Pressable>
        </View>
      ) : (
        goals.map((g: GoalWithCategory) => {
          const completed = g.completed ?? 0;
          const target = g.target_count;
          const isReached = completed >= target;
          const progress = target > 0 ? Math.min(1, completed / target) : 0;

          return (
            <View
              key={g.id}
              style={[
                styles.card,
                { borderLeftColor: g.category?.color_hex ?? colors.primary },
              ]}>
              <View style={styles.cardHeader}>
                <View
                  style={[
                    styles.cardDot,
                    { backgroundColor: g.category?.color_hex ?? colors.primary },
                  ]}
                />
                <Text style={styles.cardCategory}>
                  {getCategoryDisplayName(g.category) || t('form.noCategory')}
                </Text>
                <Text style={[styles.cardStatus, isReached ? styles.statusReached : styles.statusNotReached]}>
                  {isReached ? '✅ Meta atingida' : '⚠️ Meta não atingida'}
                </Text>
              </View>
              <Text style={styles.cardProgress}>
                Dias ativos: {completed} / {target}
              </Text>
              <View style={styles.progressBar}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      width: `${progress * 100}%`,
                      backgroundColor: g.category?.color_hex ?? colors.primary,
                    },
                  ]}
                />
              </View>
              <Text style={styles.cardHint} numberOfLines={1}>
                Contagem por dia (máx. 1/dia)
              </Text>
            </View>
          );
        })
      )}
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
    marginBottom: 8,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 4,
  },
  weekPeriod: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
  },
  empty: {
    padding: 24,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  emptyCta: {
    marginTop: 16,
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: colors.primary,
    borderRadius: 8,
  },
  emptyCtaText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
  },
  card: {
    margin: 16,
    marginTop: 0,
    padding: 16,
    backgroundColor: colors.card,
    borderRadius: 12,
    borderLeftWidth: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  cardDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  cardCategory: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    flex: 1,
  },
  cardStatus: {
    fontSize: 13,
    fontWeight: '600',
  },
  statusReached: {
    color: colors.success,
  },
  statusNotReached: {
    color: '#F57C00',
  },
  cardProgress: {
    fontSize: 15,
    color: colors.text,
    marginTop: 8,
    fontWeight: '600',
  },
  progressBar: {
    height: 8,
    backgroundColor: colors.border,
    borderRadius: 4,
    marginTop: 8,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  cardHint: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 6,
  },
});
