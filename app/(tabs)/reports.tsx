import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  Pressable,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import FontAwesome from '@expo/vector-icons/FontAwesome';

import {
  getMonthlyActiveDaysByCategory,
  getMonthComparison,
  type CategoryActiveDays,
  type MonthComparison,
} from '@/src/services/reports';
import { getSubscriptionStatus } from '@/src/services/subscription';
import { ensureDefaultCategories } from '@/src/services/categories';
import { PremiumModal } from '@/src/components/PremiumModal';
import { useLocale } from '@/src/i18n/useLocale';
import { formatMonthYear } from '@/src/utils/formatDate';
import { colors } from '@/src/theme/colors';

const MAX_BAR_WIDTH = 180;
const BAR_HEIGHT = 24;

export default function ReportsScreen() {
  const { t, locale } = useLocale();
  const [data, setData] = useState<CategoryActiveDays[]>([]);
  const [comparison, setComparison] = useState<MonthComparison | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPremium, setIsPremium] = useState(false);
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [current, setCurrent] = useState(() => {
    const d = new Date();
    return { year: d.getFullYear(), month: d.getMonth() };
  });

  const currentMonthLabel = useMemo(
    () => formatMonthYear({ year: current.year, month: current.month }, locale),
    [current.month, current.year, locale]
  );

  const prevMonthIndex = current.month === 0 ? 11 : current.month - 1;
  const prevYear = current.month === 0 ? current.year - 1 : current.year;
  const previousMonthLabel = useMemo(
    () => formatMonthYear({ year: prevYear, month: prevMonthIndex }, locale),
    [prevMonthIndex, prevYear, locale]
  );

  useEffect(() => {
    getSubscriptionStatus().then((s) => setIsPremium(s.isPremium));
  }, []);

  const isCurrentMonth =
    current.year === new Date().getFullYear() &&
    current.month === new Date().getMonth();

  const loadData = useCallback(async () => {
    try {
      await ensureDefaultCategories();
      const [result, comp] = await Promise.all([
        getMonthlyActiveDaysByCategory(current.year, current.month),
        getMonthComparison(current.year, current.month),
      ]);
      setData(result);
      setComparison(comp);
    } catch (e) {
      if (__DEV__) console.error(e);
    } finally {
      setLoading(false);
    }
  }, [current.year, current.month]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      loadData();
    }, [loadData])
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

  const maxDays = data.length > 0 ? Math.max(...data.map((d) => d.active_days)) : 1;
  const showPremiumOverlay = !isPremium && !isCurrentMonth;

  if (loading) {
    return (
      <View style={styles.center}>
        <Text style={styles.loadingText}>{t('common.loading')}</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {showPremiumOverlay && (
        <Pressable
          style={styles.premiumOverlay}
          onPress={() => setShowPremiumModal(true)}>
          <View style={styles.premiumBadgeWrap}>
            <Text style={styles.premiumBadge}>{t('premium.unlock')}</Text>
          </View>
          <FontAwesome name="lock" size={32} color={colors.textSecondary} />
          <Text style={styles.premiumOverlayTitle}>
            {t('reports.premiumOverlayTitle')}
          </Text>
          <Text style={styles.premiumOverlayDesc}>
            {t('reports.premiumOverlayDesc')}
          </Text>
          <Text style={styles.premiumOverlayCta}>{t('reports.premiumCta')}</Text>
        </Pressable>
      )}

      <View style={styles.header}>
        <Text style={styles.title}>{t('reports.title')}</Text>
        <Text style={styles.subtitle}>{t('reports.subtitle')}</Text>
      </View>

      <View style={styles.selector}>
        <Pressable style={styles.navBtn} onPress={prevMonth}>
          <FontAwesome name="chevron-left" size={20} color={colors.primary} />
        </Pressable>
        <Text style={styles.monthLabel}>{currentMonthLabel}</Text>
        <Pressable style={styles.navBtn} onPress={nextMonth}>
          <FontAwesome name="chevron-right" size={20} color={colors.primary} />
        </Pressable>
      </View>

      {showPremiumOverlay ? null : (
        <>
          {comparison && (
            <View style={styles.comparisonCard}>
              <Text style={styles.comparisonTitle}>{t('reports.compareTitle')}</Text>
              <Text style={styles.comparisonMonths}>
                {currentMonthLabel} {t('reports.compareVs')} {previousMonthLabel}
              </Text>
              <View style={styles.comparisonMain}>
                <Text style={styles.comparisonValue}>
                  <Text style={styles.comparisonLabel}>{t('reports.activeDaysLabel')}: </Text>
                  {comparison.current.totalDays}
                  {comparison.delta.totalDaysDiff > 0 && (
                    <Text style={styles.comparisonDeltaUp}>
                      {' '}(↑ +{comparison.delta.totalDaysDiff}
                      {comparison.delta.totalDaysPct === null
                        ? ` ${t('reports.new')}`
                        : ` | +${Math.round(comparison.delta.totalDaysPct)}%`}
                      )
                    </Text>
                  )}
                  {comparison.delta.totalDaysDiff < 0 && (
                    <Text style={styles.comparisonDeltaDown}>
                      {' '}(↓ {comparison.delta.totalDaysDiff} |{' '}
                      {Math.round(comparison.delta.totalDaysPct ?? 0)}%)
                    </Text>
                  )}
                  {comparison.delta.totalDaysDiff === 0 && (
                    <Text style={styles.comparisonDeltaNeutral}>
                      {' '}(=
                      {comparison.delta.totalDaysPct !== null &&
                        ` ${Math.round(comparison.delta.totalDaysPct)}%`}
                      )
                    </Text>
                  )}
                </Text>
              </View>
              {comparison.topCategories.length > 0 && (
                <View style={styles.comparisonTopSection}>
                  <Text style={styles.comparisonTopTitle}>{t('reports.topCategories')}</Text>
                  {comparison.topCategories.map((tc) => (
                    <View key={tc.id} style={styles.comparisonTopRow}>
                      <View
                        style={[
                          styles.comparisonDot,
                          { backgroundColor: tc.color },
                        ]}
                      />
                      <Text style={styles.comparisonTopText}>
                        {tc.name}: {tc.currentDays} ({t('reports.before')} {tc.previousDays})
                        {tc.diff > 0 && (
                          <Text style={styles.comparisonTopDiffUp}> ↑ +{tc.diff}</Text>
                        )}
                        {tc.diff < 0 && (
                          <Text style={styles.comparisonTopDiffDown}> {tc.diff}</Text>
                        )}
                        {tc.diff === 0 && (
                          <Text style={styles.comparisonTopDiffNeutral}> =</Text>
                        )}
                      </Text>
                    </View>
                  ))}
                </View>
              )}
              <Text style={styles.comparisonInsight}>
                {comparison.delta.totalDaysDiff > 0 && t('reports.insightUp')}
                {comparison.delta.totalDaysDiff < 0 && t('reports.insightDown')}
                {comparison.delta.totalDaysDiff === 0 && t('reports.insightEqual')}
              </Text>
            </View>
          )}
          {data.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>{t('reports.empty')}</Text>
            </View>
          ) : (
            <>
              <View style={styles.chartSection}>
                <Text style={styles.sectionTitle}>{t('reports.sectionByCategory')}</Text>
                <View style={styles.chart}>
                  {data.map((item) => {
                    const width = (item.active_days / maxDays) * MAX_BAR_WIDTH;
                    return (
                      <View key={item.category_id} style={styles.barRow}>
                        <Text style={styles.barLabel} numberOfLines={1}>
                          {item.category_name}
                        </Text>
                        <View style={styles.barTrack}>
                          <View
                            style={[
                              styles.barFill,
                              {
                                width: Math.max(width, 4),
                                backgroundColor: item.color_hex,
                              },
                            ]}
                          />
                        </View>
                        <Text style={styles.barValue}>
                      {item.active_days} {t('reports.daysActive')}
                    </Text>
                      </View>
                    );
                  })}
                </View>
              </View>

              <View style={styles.listSection}>
                <Text style={styles.sectionTitle}>{t('reports.sectionSummary')}</Text>
                {data.map((item) => (
                  <View key={item.category_id} style={styles.listRow}>
                    <View
                      style={[styles.dot, { backgroundColor: item.color_hex }]}
                    />
                    <Text style={styles.listName}>{item.category_name}</Text>
                    <Text style={styles.listCount}>
                      {item.active_days}{' '}
                  {item.active_days === 1
                    ? t('reports.dayActiveInMonth')
                    : t('reports.daysActiveInMonth')}
                    </Text>
                  </View>
                ))}
              </View>
            </>
          )}
        </>
      )}
      <PremiumModal
        visible={showPremiumModal}
        onClose={() => setShowPremiumModal(false)}
        message={t('premium.history')}
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
  premiumOverlay: {
    margin: 16,
    padding: 32,
    backgroundColor: colors.card,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  premiumBadgeWrap: {
    marginBottom: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: colors.primary + '25',
    borderRadius: 6,
  },
  premiumBadge: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
    textTransform: 'uppercase',
  },
  premiumOverlayTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginTop: 16,
    textAlign: 'center',
  },
  premiumOverlayDesc: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 8,
    textAlign: 'center',
  },
  premiumOverlayCta: {
    marginTop: 16,
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
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
  selector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    backgroundColor: colors.card,
    marginBottom: 8,
    gap: 16,
  },
  navBtn: {
    padding: 8,
  },
  monthLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    minWidth: 160,
    textAlign: 'center',
  },
  comparisonCard: {
    margin: 16,
    marginBottom: 8,
    padding: 16,
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  comparisonTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  comparisonMonths: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 12,
  },
  comparisonMain: {
    marginBottom: 12,
  },
  comparisonLabel: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  comparisonValue: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  comparisonDeltaUp: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.success,
  },
  comparisonDeltaDown: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.error,
  },
  comparisonDeltaNeutral: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  comparisonTopSection: {
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  comparisonTopTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 8,
  },
  comparisonTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  comparisonDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  comparisonTopText: {
    fontSize: 14,
    color: colors.text,
  },
  comparisonTopDiffUp: {
    color: colors.success,
    fontWeight: '600',
  },
  comparisonTopDiffDown: {
    color: colors.error,
    fontWeight: '600',
  },
  comparisonTopDiffNeutral: {
    color: colors.textSecondary,
  },
  comparisonInsight: {
    fontSize: 13,
    color: colors.textSecondary,
    fontStyle: 'italic',
    marginTop: 12,
  },
  empty: {
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  chartSection: {
    padding: 16,
    backgroundColor: colors.card,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 16,
  },
  chart: {
    gap: 12,
  },
  barRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  barLabel: {
    fontSize: 14,
    color: colors.text,
    width: 90,
  },
  barTrack: {
    width: MAX_BAR_WIDTH,
    height: BAR_HEIGHT,
    backgroundColor: colors.background,
    borderRadius: 4,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 4,
  },
  barValue: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    width: 56,
  },
  listSection: {
    padding: 16,
    backgroundColor: colors.card,
    marginBottom: 24,
  },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: 12,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  listName: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  listCount: {
    fontSize: 14,
    color: colors.textSecondary,
  },
});
