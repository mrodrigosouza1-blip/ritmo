import React from 'react';
import { StyleSheet, View } from 'react-native';

import { SkeletonBlock } from './SkeletonBlock';
import { colors } from '@/src/theme/colors';

interface SkeletonGridProps {
  /** Número de colunas (ex: 7 para semana) */
  columns: number;
  /** Número de linhas (ex: 6 para mês) */
  rows: number;
  /** Layout: 'week' = 7 cards horizontais | 'month' = grid 7x6 */
  variant?: 'week' | 'month';
}

export function SkeletonGrid({ columns, rows, variant = 'month' }: SkeletonGridProps) {
  if (variant === 'week') {
    return (
      <View style={styles.weekContainer}>
        <SkeletonBlock height={24} width={120} style={styles.titleSkeleton} />
        <View style={styles.weekGrid}>
          {Array.from({ length: columns }).map((_, i) => (
            <View key={i} style={styles.weekCard}>
              <SkeletonBlock height={12} width={32} style={styles.cardTop} />
              <SkeletonBlock height={28} width={40} style={styles.cardMid} />
              <View style={styles.cardDots}>
                <SkeletonBlock height={8} width={8} borderRadius={4} />
                <SkeletonBlock height={8} width={8} borderRadius={4} />
                <SkeletonBlock height={8} width={8} borderRadius={4} />
              </View>
              <SkeletonBlock height={10} width={48} />
            </View>
          ))}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.monthContainer}>
      <View style={styles.monthHeader}>
        <SkeletonBlock height={22} width={180} />
        <View style={styles.navSkeleton}>
          <SkeletonBlock height={24} width={32} />
          <SkeletonBlock height={24} width={32} />
        </View>
      </View>
      <View style={styles.weekRow}>
        {Array.from({ length: 7 }).map((_, i) => (
          <SkeletonBlock key={i} height={14} width={36} style={styles.weekDay} />
        ))}
      </View>
      <View style={styles.monthGrid}>
        {Array.from({ length: rows }).map((_, rowIdx) => (
          <View key={rowIdx} style={styles.monthRow}>
            {Array.from({ length: columns }).map((_, colIdx) => (
              <View key={colIdx} style={styles.cell}>
                <SkeletonBlock height={14} width={20} borderRadius={8} />
              </View>
            ))}
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  weekContainer: {
    padding: 16,
  },
  titleSkeleton: {
    marginBottom: 16,
  },
  weekGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 12,
    gap: 8,
  },
  weekCard: {
    width: '31%',
    backgroundColor: colors.card,
    padding: 12,
    borderRadius: 12,
  },
  cardTop: {
    marginBottom: 6,
  },
  cardMid: {
    marginBottom: 8,
  },
  cardDots: {
    flexDirection: 'row',
    gap: 4,
    marginBottom: 6,
  },
  monthContainer: {
    flex: 1,
  },
  monthHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: colors.card,
  },
  navSkeleton: {
    flexDirection: 'row',
    gap: 16,
  },
  weekRow: {
    flexDirection: 'row',
    paddingHorizontal: 8,
    paddingVertical: 8,
    backgroundColor: colors.card,
    gap: 4,
  },
  weekDay: {
    flex: 1,
  },
  monthGrid: {
    paddingHorizontal: 8,
    paddingBottom: 16,
  },
  monthRow: {
    flexDirection: 'row',
    marginBottom: 4,
    gap: 6,
  },
  cell: {
    flex: 1,
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 14,
  },
});
