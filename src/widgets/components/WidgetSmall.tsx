import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { useLocale } from '@/src/i18n/useLocale';
import type { WidgetSnapshot } from '@/src/widgets/widgetSnapshot';

const WIDGET_BG = '#F2F2F7';
const WIDGET_SIZE = 158;

interface WidgetSmallProps {
  snapshot: WidgetSnapshot;
}

export function WidgetSmall({ snapshot }: WidgetSmallProps) {
  const { t } = useLocale();
  const progress = snapshot.today.progressPercent ?? 0;
  const nextItem = snapshot.today.nextItem;
  const isDone = progress >= 100;
  const hasNext = !!nextItem;

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.progressSection}>
          <Text style={styles.label}>{t('widget.todayProgress')}</Text>
          <Text style={styles.percent}>{progress}%</Text>
          <View style={styles.barTrack}>
            <View
              style={[
                styles.barFill,
                { width: `${Math.min(100, Math.max(0, progress))}%` },
              ]}
            />
          </View>
        </View>

        {isDone ? (
          <View style={styles.messageSection}>
            <Text style={styles.messageTitle}>{t('widget.doneTitle')}</Text>
            <Text style={styles.messageBody} numberOfLines={2}>
              {t('widget.doneBody')}
            </Text>
          </View>
        ) : !hasNext ? (
          <View style={styles.messageSection}>
            <Text style={styles.messageTitle}>{t('widget.noNextTitle')}</Text>
            <Text style={styles.messageBody} numberOfLines={2}>
              {t('widget.noNextBody')}
            </Text>
          </View>
        ) : (
          <View style={styles.nextSection}>
            {(nextItem!.time || nextItem!.categoryColor) ? (
              <View style={styles.nextRow}>
                {nextItem!.time ? (
                  <Text style={styles.nextTime}>{nextItem!.time}</Text>
                ) : null}
                {nextItem!.categoryColor ? (
                  <View
                    style={[
                      styles.categoryDot,
                      { backgroundColor: nextItem!.categoryColor },
                    ]}
                  />
                ) : null}
              </View>
            ) : null}
            <Text style={styles.nextTitle} numberOfLines={1}>
              {nextItem!.title}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: WIDGET_SIZE,
    height: WIDGET_SIZE,
    backgroundColor: WIDGET_BG,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    width: '100%',
    padding: 10,
    justifyContent: 'space-between',
    flex: 1,
  },
  progressSection: {
    marginBottom: 4,
  },
  label: {
    fontSize: 10,
    color: '#8E8E93',
    fontWeight: '500',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  percent: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1C1C1E',
    marginBottom: 6,
  },
  barTrack: {
    height: 6,
    backgroundColor: '#E5E5EA',
    borderRadius: 3,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    backgroundColor: '#7C4DFF',
    borderRadius: 3,
  },
  nextSection: {
    marginTop: 8,
  },
  nextRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  nextTime: {
    fontSize: 11,
    fontWeight: '600',
    color: '#8E8E93',
    marginRight: 6,
  },
  categoryDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  nextTitle: {
    fontSize: 13,
    fontWeight: '500',
    color: '#1C1C1E',
  },
  messageSection: {
    marginTop: 8,
    alignItems: 'center',
  },
  messageTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1C1C1E',
    marginBottom: 4,
    textAlign: 'center',
  },
  messageBody: {
    fontSize: 11,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 14,
  },
});
