import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  Pressable,
} from 'react-native';
import { router } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';

import { setOnboardingCompleted, setNotificationsEnabled } from '@/src/services/onboardingStorage';
import { requestPermissions } from '@/src/services/notifications';
import { colors } from '@/src/theme/colors';
import { useLocale } from '@/src/i18n/useLocale';

export default function OnboardingNotificationsScreen() {
  const { t } = useLocale();
  const handleEnable = async () => {
    const granted = await requestPermissions();
    await setNotificationsEnabled(granted);
    await setOnboardingCompleted(true);
    router.replace('/');
  };

  const handleSkip = async () => {
    await setNotificationsEnabled(false);
    await setOnboardingCompleted(true);
    router.replace('/');
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.iconWrap}>
          <FontAwesome name="bell" size={48} color={colors.primary} />
        </View>
        <Text style={styles.title}>{t('onboarding.reminders')}</Text>
        <Text style={styles.subtitle}>{t('onboarding.remindersSubtitle')}</Text>
        <Text style={styles.hint}>{t('onboarding.remindersHint')}</Text>

        <Pressable style={styles.primaryBtn} onPress={handleEnable}>
          <Text style={styles.primaryBtnText}>{t('onboarding.activateNotifications')}</Text>
        </Pressable>
        <Pressable style={styles.secondaryBtn} onPress={handleSkip}>
          <Text style={styles.secondaryBtnText}>{t('onboarding.notNow')}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    padding: 24,
  },
  content: {
    alignItems: 'center',
  },
  iconWrap: {
    marginBottom: 24,
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
    lineHeight: 24,
  },
  hint: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 32,
  },
  primaryBtn: {
    width: '100%',
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
  secondaryBtn: {
    marginTop: 12,
    paddingVertical: 12,
  },
  secondaryBtnText: {
    fontSize: 16,
    color: colors.textSecondary,
  },
});
