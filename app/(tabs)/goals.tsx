import React, { useState, useCallback, useEffect } from 'react';
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
import { getAllCategories } from '@/src/services/categories';
import { getSubscriptionStatus } from '@/src/services/subscription';
import { PremiumModal } from '@/src/components/PremiumModal';
import { ensureDefaultCategories } from '@/src/services/categories';
import { getCategoryDisplayName } from '@/src/services/categoryDisplay';
import { getWeeklyDoneCountsByCategory } from '@/src/services/goalsProgress';
import { getWeekRangeISO } from '@/src/utils/weekRange';
import { formatDate } from '@/src/utils/formatDate';
import { useLocale } from '@/src/i18n/useLocale';
import type { Category, GoalWeekly } from '@/src/types';

type GoalWithCategory = GoalWeekly & { category?: Category; completed?: number };
import { colors } from '@/src/theme/colors';

export default function GoalsScreen() {
  const { t, locale } = useLocale();
  const [goals, setGoals] = useState<GoalWithCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [weekRange, setWeekRange] = useState<{ start: string; end: string } | null>(null);
  const [isPremium, setIsPremium] = useState(false);
  const [showPremiumModal, setShowPremiumModal] = useState(false);

  useEffect(() => {
    getSubscriptionStatus().then((s) => setIsPremium(s.isPremium));
  }, []);

  const loadGoals = useCallback(async () => {
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
      loadGoals();
    }, [loadGoals])
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
        <View>
          <Text style={styles.title}>{t('goals.title')}</Text>
          <Text style={styles.subtitle}>{t('goals.subtitle')}</Text>
          {weekRange && (
            <Text style={styles.weekPeriod}>
              {t('goals.week')}: {formatDate(weekRange.start, locale)} – {formatDate(weekRange.end, locale)}
            </Text>
          )}
        </View>
        <View style={styles.headerButtons}>
          <Pressable
            style={styles.summaryBtn}
            onPress={() => router.push('/summary')}>
            <Text style={styles.summaryBtnText}>{t('goals.viewSummary')}</Text>
          </Pressable>
          <Pressable
            style={[styles.createBtn, !isPremium && goals.length >= 3 && styles.createBtnLocked]}
            onPress={() => {
              if (!isPremium && goals.length >= 3) {
                setShowPremiumModal(true);
              } else {
                router.push('/modal/goal');
              }
            }}>
            {!isPremium && goals.length >= 3 && (
              <View style={styles.premiumBadgeWrap}>
                <Text style={styles.premiumBadge}>{t('premium.unlock')}</Text>
              </View>
            )}
            <Text style={styles.createBtnText}>{t('goals.createGoal')}</Text>
          </Pressable>
        </View>
      </View>

      {goals.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>{t('goals.emptyTitle')}</Text>
          <Text style={styles.emptyHint}>{t('goals.emptyHint')}</Text>
          <View style={styles.emptyActions}>
            <Pressable
              style={styles.emptyCtaSecondary}
              onPress={() => router.push('/templates')}>
              <Text style={styles.emptyCtaSecondaryText}>{t('common.templates')}</Text>
            </Pressable>
            <Pressable
              style={styles.emptyCta}
              onPress={() => router.push('/modal/goal')}>
              <Text style={styles.emptyCtaText}>{t('goals.createGoal')}</Text>
            </Pressable>
          </View>
        </View>
      ) : (
        goals.map((g: GoalWithCategory) => (
          <Pressable
            key={g.id}
            style={[
              styles.goalCard,
              { borderLeftColor: g.category?.color_hex ?? colors.primary },
            ]}
            onPress={() => router.push(`/modal/goal?id=${g.id}`)}>
            <View style={styles.goalHeader}>
              <View
                style={[
                  styles.goalDot,
                  { backgroundColor: g.category?.color_hex ?? colors.primary },
                ]}
              />
              <Text style={styles.goalCategory}>
                {getCategoryDisplayName(g.category) || t('form.noCategory')}
              </Text>
            </View>
            <Text style={styles.goalTarget}>
              {t('goals.progress')}: {g.completed ?? 0}/{g.target_count}
            </Text>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${Math.min(100, g.target_count > 0 ? ((g.completed ?? 0) / g.target_count) * 100 : 0)}%`,
                    backgroundColor: g.category?.color_hex ?? colors.primary,
                  },
                ]}
              />
            </View>
            <Text style={styles.goalHint} numberOfLines={1}>
              {t('goals.hintPerDay')}
            </Text>
          </Pressable>
        ))
      )}

      <PremiumModal
        visible={showPremiumModal}
        onClose={() => setShowPremiumModal(false)}
        message={t('premium.limitGoals')}
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
    flexWrap: 'wrap',
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  summaryBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: colors.card,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  summaryBtnText: {
    fontSize: 13,
    color: colors.primary,
    fontWeight: '600',
  },
  createBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: colors.primary,
    borderRadius: 8,
  },
  createBtnLocked: {
    opacity: 0.9,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  premiumBadgeWrap: {
    marginRight: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 4,
  },
  premiumBadge: {
    fontSize: 10,
    fontWeight: '700',
    color: '#fff',
    textTransform: 'uppercase',
  },
  createBtnText: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '600',
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
  empty: {
    padding: 24,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  emptyHint: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 8,
    textAlign: 'center',
  },
  emptyActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  emptyCtaSecondary: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: colors.card,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  emptyCtaSecondaryText: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '600',
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
  goalCard: {
    margin: 16,
    marginTop: 0,
    padding: 16,
    backgroundColor: colors.card,
    borderRadius: 12,
    borderLeftWidth: 4,
  },
  goalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  goalDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  goalCategory: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  goalTarget: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 4,
  },
  weekPeriod: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
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
  goalHint: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 6,
  },
});
