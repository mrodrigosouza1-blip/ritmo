import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { Stack } from 'expo-router';

import { colors } from '@/src/theme/colors';
import { useLocale } from '@/src/i18n/useLocale';
import { loadWidgetSnapshot } from '@/src/widgets/widgetService';
import { syncWidgetSnapshot } from '@/src/widgets/useWidgetSync';
import { WidgetSmall } from '@/src/widgets/components/WidgetSmall';
import { WidgetMedium } from '@/src/widgets/components/WidgetMedium';
import { localDayKey } from '@/src/utils/dateKey';
import type { WidgetSnapshot } from '@/src/widgets/widgetSnapshot';

export default function WidgetPreviewScreen() {
  const { t, locale } = useLocale();
  const [snapshot, setSnapshot] = useState<WidgetSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const s = await loadWidgetSnapshot();
      setSnapshot(s);
    } catch (e) {
      if (__DEV__) console.warn(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await syncWidgetSnapshot();
      await load();
    } finally {
      setRefreshing(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const displaySnapshot: WidgetSnapshot = snapshot ?? {
    generatedAt: new Date().toISOString(),
    locale: ((locale ?? 'pt') as 'pt' | 'en' | 'it'),
    today: {
      date: localDayKey(new Date()),
      totalItems: 0,
      doneItems: 0,
      progressPercent: 0,
    },
  };

  return (
    <>
      <Stack.Screen options={{ title: t('settings.widgetPreview') }} />
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Text style={styles.sectionTitle}>Widget Small (preview)</Text>
        <View style={styles.widgetPreview}>
          <WidgetSmall snapshot={displaySnapshot} />
        </View>

        <Text style={[styles.sectionTitle, { marginTop: 24 }]}>
          Widget Medium (preview)
        </Text>
        <View style={styles.widgetPreview}>
          <WidgetMedium snapshot={displaySnapshot} />
        </View>

        <Text style={[styles.sectionTitle, { marginTop: 32 }]}>
          Snapshot raw (opcional)
        </Text>
        <Text style={styles.label}>{t('widget.updatedAt')}</Text>
        <Text style={styles.value}>
          {snapshot?.generatedAt
            ? new Date(snapshot.generatedAt).toLocaleString()
            : '—'}
        </Text>

        {snapshot && (
          <View style={styles.block}>
            <Text style={styles.blockTitle}>{'today'}</Text>
            <Text style={styles.line}>
              {'date: '}{snapshot.today.date}
            </Text>
            <Text style={styles.line}>
              {'totalItems: '}{snapshot.today.totalItems}
            </Text>
            <Text style={styles.line}>
              {'doneItems: '}{snapshot.today.doneItems}
            </Text>
            {typeof snapshot.today.progressPercent === 'number' && (
              <Text style={styles.line}>
                {'progressPercent: '}{snapshot.today.progressPercent}%
              </Text>
            )}
            {snapshot.today.nextItem && (
              <>
                <Text style={styles.line}>{'nextItem:'}</Text>
                <Text style={styles.lineIndent}>
                  {'type: '}{snapshot.today.nextItem.type}
                </Text>
                <Text style={styles.lineIndent}>
                  {'title: '}{snapshot.today.nextItem.title}
                </Text>
                <Text style={styles.lineIndent}>
                  {'time: '}{snapshot.today.nextItem.time ?? '—'}
                </Text>
                <Text style={styles.lineIndent}>
                  {'date: '}{snapshot.today.nextItem.date}
                </Text>
                {snapshot.today.nextItem.categoryColor && (
                  <Text style={styles.lineIndent}>
                    {'categoryColor: '}{snapshot.today.nextItem.categoryColor}
                  </Text>
                )}
              </>
            )}
          </View>
        )}

        {snapshot?.streak != null && (
          <View style={styles.block}>
            <Text style={styles.blockTitle}>{'streak'}</Text>
            <Text style={styles.line}>
              {'current: '}{snapshot.streak.current}
            </Text>
          </View>
        )}

        {snapshot?.weekly != null && (
          <View style={styles.block}>
            <Text style={styles.blockTitle}>{'weekly'}</Text>
            <Text style={styles.line}>
              {'activeDays: '}{snapshot.weekly.activeDays}
            </Text>
            <Text style={styles.line}>
              {'target: '}{snapshot.weekly.target}
            </Text>
            <Text style={styles.line}>
              {'remaining: '}{snapshot.weekly.remaining}
            </Text>
          </View>
        )}

        {!snapshot && (
          <Text style={styles.empty}>{t('widget.noSnapshot')}</Text>
        )}

        <Pressable
          style={[styles.btn, refreshing && styles.btnDisabled]}
          onPress={handleRefresh}
          disabled={refreshing}>
          {refreshing ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.btnText}>{t('widget.refresh')}</Text>
          )}
        </Pressable>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 20 },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textSecondary,
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  widgetPreview: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    backgroundColor: '#E5E5EA',
    borderRadius: 16,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  value: {
    fontSize: 14,
    color: colors.text,
    marginBottom: 24,
  },
  block: {
    backgroundColor: colors.card,
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
  },
  blockTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: 12,
  },
  line: {
    fontSize: 13,
    color: colors.text,
    fontFamily: 'monospace',
    marginBottom: 4,
  },
  lineIndent: {
    fontSize: 13,
    color: colors.text,
    fontFamily: 'monospace',
    marginBottom: 4,
    marginLeft: 12,
  },
  empty: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 24,
  },
  btn: {
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  btnDisabled: { opacity: 0.6 },
  btnText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});
