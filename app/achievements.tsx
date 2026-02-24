import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';

import { colors } from '@/src/theme/colors';
import { useLocale } from '@/src/i18n/useLocale';
import {
  getUnlockedAchievements,
  getAchievementDefinitions,
} from '@/src/services/achievements';
import type { Achievement } from '@/src/services/achievements';

const KEY_TO_TITLE: Record<string, string> = {
  streak_3: 'achievements.streak3Title',
  streak_7: 'achievements.streak7Title',
  streak_14: 'achievements.streak14Title',
  streak_30: 'achievements.streak30Title',
  weekly_goal_complete: 'achievements.weeklyGoalTitle',
  weekly_4x: 'achievements.weekly4xTitle',
};

const KEY_TO_DESC: Record<string, string> = {
  streak_3: 'achievements.streak3Desc',
  streak_7: 'achievements.streak7Desc',
  streak_14: 'achievements.streak14Desc',
  streak_30: 'achievements.streak30Desc',
  weekly_goal_complete: 'achievements.weeklyGoalDesc',
  weekly_4x: 'achievements.weekly4xDesc',
};

function formatUnlockedDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export default function AchievementsScreen() {
  const { t } = useLocale();
  const [unlocked, setUnlocked] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getUnlockedAchievements()
      .then(setUnlocked)
      .finally(() => setLoading(false));
  }, []);

  const definitions = getAchievementDefinitions();
  const unlockedKeys = new Set(unlocked.map((a) => a.key));

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.subtitle}>{t('achievements.subtitle')}</Text>

      {definitions.map((def) => {
        const ach = unlocked.find((a) => a.key === def.key);
        const isUnlocked = !!ach;
        return (
          <View
            key={def.key}
            style={[styles.card, !isUnlocked && styles.cardLocked]}
          >
            <View style={styles.cardRow}>
              <View style={[styles.iconWrap, !isUnlocked && styles.iconLocked]}>
                <FontAwesome
                  name="trophy"
                  size={24}
                  color={isUnlocked ? colors.primary : colors.textSecondary}
                />
              </View>
              <View style={styles.cardContent}>
                <Text
                  style={[styles.cardTitle, !isUnlocked && styles.textLocked]}
                >
                  {isUnlocked ? ach!.title : t(KEY_TO_TITLE[def.key] ?? def.key)}
                </Text>
                <Text
                  style={[styles.cardDesc, !isUnlocked && styles.textLocked]}
                >
                  {isUnlocked
                    ? ach!.description
                    : t(KEY_TO_DESC[def.key] ?? def.key)}
                </Text>
                {isUnlocked && ach && (
                  <Text style={styles.unlockedAt}>
                    {t('achievements.unlockedAt')} {formatUnlockedDate(ach.unlocked_at)}
                  </Text>
                )}
                {!isUnlocked && (
                  <Text style={styles.lockedLabel}>{t('achievements.locked')}</Text>
                )}
              </View>
            </View>
          </View>
        );
      })}
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
    paddingBottom: 32,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  subtitle: {
    fontSize: 15,
    color: colors.textSecondary,
    marginBottom: 20,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
  },
  cardLocked: {
    opacity: 0.5,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  iconLocked: {
    backgroundColor: colors.border,
  },
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.text,
  },
  cardDesc: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 4,
    lineHeight: 20,
  },
  textLocked: {
    color: colors.textSecondary,
  },
  unlockedAt: {
    fontSize: 12,
    color: colors.primary,
    marginTop: 8,
  },
  lockedLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    fontStyle: 'italic',
    marginTop: 4,
  },
});
