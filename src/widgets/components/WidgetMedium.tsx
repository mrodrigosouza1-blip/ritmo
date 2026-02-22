import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { useLocale } from '@/src/i18n/useLocale';
import type { WidgetSnapshot } from '@/src/widgets/widgetSnapshot';

const WIDGET_BG = '#F2F2F7';
const WIDGET_WIDTH = 338;
const WIDGET_HEIGHT = 158;

interface WidgetMediumProps {
  snapshot: WidgetSnapshot;
}

export function WidgetMedium({ snapshot }: WidgetMediumProps) {
  const { t } = useLocale();
  const progress = snapshot.today.progressPercent ?? 0;
  const nextItem = snapshot.today.nextItem;
  const streak = snapshot.streak?.current ?? 0;
  const weekly = snapshot.weekly;
  const isDone = progress >= 100;
  const hasNext = !!nextItem;

  const renderLeftBottom = () => {
    if (isDone) {
      return (
        <View style={styles.messageSection}>
          <Text style={styles.messageTitle}>{t('widget.doneTitle')}</Text>
          <Text style={styles.messageBody} numberOfLines={2}>
            {t('widget.doneBody')}
          </Text>
        </View>
      );
    }
    if (!hasNext) {
      return (
        <View style={styles.messageSection}>
          <Text style={styles.messageTitle}>{t('widget.noNextTitle')}</Text>
          <Text style={styles.messageBody} numberOfLines={2}>
            {t('widget.noNextBody')}
          </Text>
        </View>
      );
    }
    return (
      <View style={styles.nextSection}>
        {nextItem!.time && (
          <Text style={styles.nextTime}>{nextItem!.time}</Text>
        )}
        <Text style={styles.nextTitle} numberOfLines={1}>
          {nextItem!.title}
        </Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.left}>
        <View style={styles.progressSection}>
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
        {renderLeftBottom()}
      </View>
      <View style={styles.right}>
        {streak > 0 && (
          <View style={styles.streakBlock}>
            <Text style={styles.emoji}>🔥</Text>
            <View style={styles.labelBlock}>
              <Text style={styles.streakLabel}>{t('widget.streak')}</Text>
              <Text style={styles.streakValue}>
                {streak} {t('widget.days')}
              </Text>
            </View>
          </View>
        )}
        {weekly != null && (
          <View style={styles.weeklyBlock}>
            <Text style={styles.emoji}>🎯</Text>
            <View style={styles.labelBlock}>
              <Text style={styles.weeklyLabel}>{t('widget.weeklyGoal')}</Text>
              <Text style={styles.weeklyValue}>
                {weekly.activeDays} / {weekly.target} {t('widget.days')}
              </Text>
              <Text style={styles.remaining}>
                {t('widget.remaining')} {weekly.remaining}
              </Text>
            </View>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: WIDGET_WIDTH,
    height: WIDGET_HEIGHT,
    backgroundColor: WIDGET_BG,
    borderRadius: 20,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  left: {
    flex: 1,
    justifyContent: 'space-between',
    minWidth: 0,
  },
  right: {
    flex: 0.9,
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  progressSection: {
    marginBottom: 8,
  },
  percent: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1C1C1E',
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
    marginTop: 4,
  },
  messageSection: {
    marginTop: 4,
  },
  messageTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1C1C1E',
    marginBottom: 2,
  },
  messageBody: {
    fontSize: 11,
    color: '#8E8E93',
    lineHeight: 14,
  },
  nextTime: {
    fontSize: 11,
    fontWeight: '600',
    color: '#8E8E93',
  },
  nextTitle: {
    fontSize: 13,
    fontWeight: '500',
    color: '#1C1C1E',
  },
  streakBlock: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  weeklyBlock: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  emoji: {
    fontSize: 18,
    marginRight: 8,
  },
  labelBlock: {
    flex: 1,
  },
  streakLabel: {
    fontSize: 10,
    color: '#8E8E93',
    fontWeight: '500',
    textTransform: 'uppercase',
  },
  streakValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1C1C1E',
  },
  weeklyLabel: {
    fontSize: 9,
    color: '#8E8E93',
    fontWeight: '500',
    textTransform: 'uppercase',
  },
  weeklyValue: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1C1C1E',
  },
  remaining: {
    fontSize: 10,
    color: '#8E8E93',
    marginTop: 2,
  },
});
