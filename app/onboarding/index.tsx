import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  Pressable,
} from 'react-native';
import { router } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';

import { setOnboardingGoal } from '@/src/services/onboardingStorage';
import { colors } from '@/src/theme/colors';
import { useLocale } from '@/src/i18n/useLocale';

const GOALS = [
  { id: 'work', labelKey: 'category.work', icon: 'briefcase' as const, color: '#5C6BC0' },
  { id: 'health', labelKey: 'category.fitness', icon: 'heart' as const, color: '#66BB6A' },
  { id: 'studies', labelKey: 'category.study', icon: 'book' as const, color: '#26A69A' },
  { id: 'home', labelKey: 'category.home', icon: 'home' as const, color: '#FF7043' },
  { id: 'other', labelKey: 'onboarding.other', icon: 'ellipsis-h' as const, color: '#78909C' },
];

export default function OnboardingGoalScreen() {
  const { t } = useLocale();
  const [selected, setSelected] = useState<string | null>(null);

  const handleContinue = async () => {
    if (selected) {
      await setOnboardingGoal(selected);
    }
    router.push('/onboarding/templates');
  };

  const handleSkip = () => {
    router.push('/onboarding/templates');
  };

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>{t('onboarding.welcome')}</Text>
        <Text style={styles.subtitle}>{t('onboarding.chooseFocus')}</Text>

        <View style={styles.cards}>
          {GOALS.map((g) => (
            <Pressable
              key={g.id}
              style={[
                styles.card,
                { borderLeftColor: g.color },
                selected === g.id && styles.cardSelected,
              ]}
              onPress={() => setSelected(g.id)}>
              <FontAwesome
                name={g.icon}
                size={28}
                color={selected === g.id ? g.color : colors.textSecondary}
              />
              <Text
                style={[
                  styles.cardLabel,
                  selected === g.id && { color: g.color, fontWeight: '600' },
                ]}>
                {t(g.labelKey)}
              </Text>
            </Pressable>
          ))}
        </View>

        <Pressable style={styles.primaryBtn} onPress={handleContinue}>
          <Text style={styles.primaryBtnText}>{t('common.continue')}</Text>
        </Pressable>
      </ScrollView>

      <Pressable style={styles.skipBtn} onPress={handleSkip}>
        <Text style={styles.skipBtnText}>{t('common.skip')}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: 24,
    paddingTop: 48,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 8,
  },
  cards: {
    marginTop: 32,
    gap: 12,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    padding: 18,
    borderRadius: 14,
    borderLeftWidth: 4,
    gap: 16,
  },
  cardSelected: {
    backgroundColor: colors.primary + '12',
  },
  cardLabel: {
    fontSize: 17,
    fontWeight: '500',
    color: colors.text,
  },
  primaryBtn: {
    marginTop: 32,
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  primaryBtnText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#fff',
  },
  skipBtn: {
    padding: 20,
    alignItems: 'center',
  },
  skipBtnText: {
    fontSize: 15,
    color: colors.textSecondary,
  },
});
