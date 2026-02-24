import React, { useState, useRef, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  Pressable,
  Animated,
  Switch,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';

import { colors } from '@/src/theme/colors';
import { useLocale } from '@/src/i18n/useLocale';
import { useToast } from '@/src/components/toast';
import {
  setHasSeenOnboarding,
  setNotificationsEnabled,
} from '@/src/services/onboardingStorage';
import {
  setNotificationEnabled,
  setSmartPremiumEnabled,
} from '@/src/services/notificationSettings';
import { requestPermissions } from '@/src/services/notifications';
import { applyNotificationSettings } from '@/src/services/notificationSettingsApply';
import { applyTemplate } from '@/src/services/templates';
import { getSubscriptionStatus } from '@/src/services/subscription';
import { debouncedSyncWidgets } from '@/src/services/widgetsSync';
import { localDayKey } from '@/src/utils/dateKey';
import { PremiumModal } from '@/src/components/PremiumModal';


const STEP_TEMPLATES = [
  { id: 'tpl-work', nameKey: 'templates.productiveWork.name', icon: 'briefcase' as const, color: '#5C6BC0' },
  { id: 'tpl-fitness', nameKey: 'templates.fitness.name', icon: 'heart' as const, color: '#66BB6A' },
  { id: 'tpl-studies', nameKey: 'templates.study.name', icon: 'book' as const, color: '#26A69A' },
];

function StepIndicators({ step, total }: { step: number; total: number }) {
  return (
    <View style={styles.indicators}>
      {Array.from({ length: total }, (_, i) => (
        <View
          key={i}
          style={[
            styles.dot,
            i === step ? styles.dotActive : styles.dotInactive,
          ]}
        />
      ))}
    </View>
  );
}

export default function OnboardingScreen() {
  const { t } = useLocale();
  const { showToast } = useToast();
  const [step, setStep] = useState(0);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [remindersEnabled, setRemindersEnabled] = useState(true);
  const [smartEnabled, setSmartEnabled] = useState(false);
  const [isPremium, setIsPremium] = useState(false);
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    getSubscriptionStatus().then((s) => setIsPremium(s.isPremium));
  }, []);

  const animateStep = (direction: 'in' | 'out', callback?: () => void) => {
    Animated.timing(fadeAnim, {
      toValue: direction === 'out' ? 0 : 1,
      duration: 180,
      useNativeDriver: true,
    }).start(() => {
      if (direction === 'out' && callback) callback();
      else if (direction === 'in') callback?.();
    });
  };

  const handleNext = () => {
    if (step < 2) {
      animateStep('out', () => {
        setStep((s) => s + 1);
        fadeAnim.setValue(0);
        animateStep('in');
      });
    }
  };

  const handleBack = () => {
    if (step > 0) {
      animateStep('out', () => {
        setStep((s) => s - 1);
        fadeAnim.setValue(0);
        animateStep('in');
      });
    }
  };

  const handleSmartToggle = async (v: boolean) => {
    if (v && !isPremium) {
      setShowPremiumModal(true);
      return;
    }
    setSmartEnabled(v);
    await setSmartPremiumEnabled(v);
  };

  const handleFinish = async () => {
    setFinishing(true);
    try {
      const granted = await requestPermissions();
      await setNotificationEnabled(remindersEnabled || granted);
      await setNotificationsEnabled(granted);
      await setSmartPremiumEnabled(smartEnabled && isPremium ? smartEnabled : false);
      try {
        await applyNotificationSettings();
      } catch {
        // ignora
      }

      if (selectedTemplate) {
        try {
          const result = await applyTemplate(selectedTemplate);
          debouncedSyncWidgets(localDayKey(new Date()));
          showToast({
            message: t('toast.templateApplied'),
            type: 'success',
          });
        } catch {
          showToast({ message: t('toast.templateError'), type: 'error' });
        }
      }

      await setHasSeenOnboarding(true);
      router.replace('/');
    } catch (e) {
      if (__DEV__) console.error(e);
    } finally {
      setFinishing(false);
    }
  };

  const handleSkip = () => {
    if (step === 1) {
      handleNext();
    } else if (step === 2) {
      handleFinish();
    }
  };

  const handleExploreTemplates = () => {
    router.push('/templates');
  };

  return (
    <View style={styles.container}>
      {/* Header com Voltar */}
      <View style={styles.header}>
        {step > 0 ? (
          <Pressable style={styles.backBtn} onPress={handleBack}>
            <FontAwesome name="chevron-left" size={20} color={colors.primary} />
            <Text style={styles.backText}>{t('common.back')}</Text>
          </Pressable>
        ) : (
          <View style={styles.backBtn} />
        )}
        <StepIndicators step={step} total={3} />
        <View style={styles.backBtn} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled">
        <Animated.View style={[styles.stepContent, { opacity: fadeAnim }]}>
          {/* Step 1 — Ritmo é constância */}
          {step === 0 && (
            <>
              <View style={styles.iconCard}>
                <FontAwesome name="repeat" size={48} color={colors.primary} />
              </View>
              <Text style={styles.stepTitle}>{t('onboarding.step1.title')}</Text>
              <Text style={styles.stepSubtitle}>
                {t('onboarding.step1.subtitle')}
              </Text>
              <Pressable style={styles.primaryBtn} onPress={handleNext}>
                <Text style={styles.primaryBtnText}>{t('common.continue')}</Text>
              </Pressable>
            </>
          )}

          {/* Step 2 — Escolha um ponto de partida */}
          {step === 1 && (
            <>
              <Text style={styles.stepTitle}>{t('onboarding.step2.title')}</Text>
              <Text style={styles.stepSubtitle}>
                {t('onboarding.step2.subtitle')}
              </Text>
              <View style={styles.cards}>
                {STEP_TEMPLATES.map((tpl) => (
                  <Pressable
                    key={tpl.id}
                    style={[
                      styles.card,
                      { borderLeftColor: tpl.color },
                      selectedTemplate === tpl.id && styles.cardSelected,
                    ]}
                    onPress={() => setSelectedTemplate(tpl.id)}>
                    <FontAwesome
                      name={tpl.icon}
                      size={24}
                      color={selectedTemplate === tpl.id ? tpl.color : colors.textSecondary}
                    />
                    <Text
                      style={[
                        styles.cardLabel,
                        selectedTemplate === tpl.id && { color: tpl.color, fontWeight: '600' },
                      ]}>
                      {t(tpl.nameKey)}
                    </Text>
                    {selectedTemplate === tpl.id && (
                      <FontAwesome
                        name="check-circle"
                        size={20}
                        color={tpl.color}
                        style={styles.cardCheck}
                      />
                    )}
                  </Pressable>
                ))}
              </View>
              <Pressable
                style={styles.linkBtn}
                onPress={handleExploreTemplates}>
                <Text style={styles.linkText}>{t('onboarding.step2.exploreMore')}</Text>
                <FontAwesome name="external-link" size={14} color={colors.primary} />
              </Pressable>
              <Pressable style={styles.primaryBtn} onPress={handleNext}>
                <Text style={styles.primaryBtnText}>{t('common.continue')}</Text>
              </Pressable>
              <Pressable style={styles.skipBtn} onPress={handleSkip}>
                <Text style={styles.skipText}>{t('common.skip')}</Text>
              </Pressable>
            </>
          )}

          {/* Step 3 — Lembretes */}
          {step === 2 && (
            <>
              <View style={styles.iconCard}>
                <FontAwesome name="bell" size={48} color={colors.primary} />
              </View>
              <Text style={styles.stepTitle}>{t('onboarding.step3.title')}</Text>
              <Text style={styles.stepSubtitle}>
                {t('onboarding.step3.subtitle')}
              </Text>
              <View style={styles.reminderRow}>
                <Text style={styles.reminderLabel}>
                  {t('onboarding.step3.reminder30min')}
                </Text>
                <Switch
                  value={remindersEnabled}
                  onValueChange={setRemindersEnabled}
                  trackColor={{ false: colors.border, true: colors.primary + '80' }}
                  thumbColor={remindersEnabled ? colors.primary : colors.textSecondary}
                />
              </View>
              <View style={styles.reminderRow}>
                <View style={styles.reminderLabelWrap}>
                  <Text style={styles.reminderLabel}>
                    {t('onboarding.step3.smartNotifications')}
                  </Text>
                  {!isPremium && (
                    <Text style={styles.premiumBadge}>{t('notifications.premiumBadge')}</Text>
                  )}
                </View>
                <Switch
                  value={smartEnabled}
                  onValueChange={handleSmartToggle}
                  trackColor={{ false: colors.border, true: colors.primary + '80' }}
                  thumbColor={smartEnabled ? colors.primary : colors.textSecondary}
                />
              </View>
              <Pressable
                style={[styles.primaryBtn, finishing && styles.primaryBtnDisabled]}
                onPress={handleFinish}
                disabled={finishing}>
                {finishing ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.primaryBtnText}>
                    {t('onboarding.finish')}
                  </Text>
                )}
              </Pressable>
              <Pressable style={styles.skipBtn} onPress={handleSkip}>
                <Text style={styles.skipText}>{t('common.skip')}</Text>
              </Pressable>
            </>
          )}
        </Animated.View>
      </ScrollView>

      <PremiumModal
        visible={showPremiumModal}
        onClose={() => setShowPremiumModal(false)}
        message={t('notifications.premiumCoachMessage')}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 56,
    paddingBottom: 8,
    backgroundColor: colors.background,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 80,
  },
  backText: {
    fontSize: 16,
    color: colors.primary,
    marginLeft: 4,
  },
  indicators: {
    flexDirection: 'row',
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dotActive: {
    backgroundColor: colors.primary,
  },
  dotInactive: {
    backgroundColor: colors.border,
  },
  scrollContent: {
    padding: 24,
    paddingTop: 16,
  },
  stepContent: {
    minHeight: 300,
  },
  iconCard: {
    alignSelf: 'center',
    width: 100,
    height: 100,
    borderRadius: 24,
    backgroundColor: colors.primary + '18',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
  },
  stepTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 12,
  },
  stepSubtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  cards: {
    gap: 12,
    marginBottom: 16,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    padding: 18,
    borderRadius: 14,
    borderLeftWidth: 4,
  },
  cardSelected: {
    backgroundColor: colors.primary + '12',
  },
  cardLabel: {
    flex: 1,
    fontSize: 17,
    fontWeight: '500',
    color: colors.text,
    marginLeft: 14,
  },
  cardCheck: {
    marginLeft: 8,
  },
  linkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    marginBottom: 24,
  },
  linkText: {
    fontSize: 15,
    color: colors.primary,
    fontWeight: '500',
  },
  reminderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.card,
    padding: 16,
    borderRadius: 14,
    marginBottom: 12,
  },
  reminderLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.text,
  },
  reminderLabelWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  premiumBadge: {
    fontSize: 13,
    color: colors.primary,
  },
  primaryBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  primaryBtnDisabled: {
    opacity: 0.7,
  },
  primaryBtnText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#fff',
  },
  skipBtn: {
    alignItems: 'center',
    paddingVertical: 16,
    marginTop: 8,
  },
  skipText: {
    fontSize: 15,
    color: colors.textSecondary,
  },
});
