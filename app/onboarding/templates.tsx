import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  Pressable,
} from 'react-native';
import { router } from 'expo-router';

import { ROUTINE_TEMPLATES } from '@/src/data/templates';
import { applyTemplate } from '@/src/services/templates';
import { debouncedSyncWidgets } from '@/src/services/widgetsSync';
import { localDayKey } from '@/src/utils/dateKey';
import { useToast } from '@/src/components/toast';
import { useLocale } from '@/src/i18n/useLocale';
import { colors } from '@/src/theme/colors';

export default function OnboardingTemplatesScreen() {
  const { t } = useLocale();
  const { showToast } = useToast();
  const [applying, setApplying] = useState<string | null>(null);

  const handleApply = async (templateId: string) => {
    setApplying(templateId);
    try {
      await applyTemplate(templateId);
      debouncedSyncWidgets(localDayKey(new Date()));
      showToast({ message: t('toast.templateApplied'), type: 'success' });
      router.push('/onboarding/notifications');
    } catch (e) {
      if (__DEV__) console.error(e);
      showToast({ message: t('toast.templateError'), type: 'error' });
    } finally {
      setApplying(null);
    }
  };

  const handleSkip = () => {
    router.push('/onboarding/notifications');
  };

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>{t('templates.startReady')}</Text>
        <Text style={styles.subtitle}>{t('templates.startSubtitle')}</Text>

        <View style={styles.cards}>
          {ROUTINE_TEMPLATES.map((tpl) => (
            <View
              key={tpl.id}
              style={[styles.card, { borderLeftColor: tpl.color_hex ?? colors.primary }]}>
              <View style={styles.cardContent}>
                <Text style={styles.cardName}>{t(tpl.nameKey)}</Text>
                <Text style={styles.cardDesc}>{t(tpl.descriptionKey)}</Text>
              </View>
              <Pressable
                style={[
                  styles.applyBtn,
                  { backgroundColor: tpl.color_hex ?? colors.primary },
                  applying === tpl.id && styles.applyBtnDisabled,
                ]}
                onPress={() => handleApply(tpl.id)}
                disabled={!!applying}>
                <Text style={styles.applyBtnText}>
                  {applying === tpl.id ? t('templates.applying') : t('templates.apply')}
                </Text>
              </Pressable>
            </View>
          ))}
        </View>
      </ScrollView>

      <Pressable style={styles.skipBtn} onPress={handleSkip}>
        <Text style={styles.skipBtnText}>{t('templates.viewLater')}</Text>
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
    gap: 16,
  },
  card: {
    backgroundColor: colors.card,
    padding: 18,
    borderRadius: 14,
    borderLeftWidth: 4,
  },
  cardContent: {
    marginBottom: 14,
  },
  cardName: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  cardDesc: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 4,
  },
  applyBtn: {
    alignSelf: 'flex-start',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
  },
  applyBtnDisabled: {
    opacity: 0.6,
  },
  applyBtnText: {
    fontSize: 15,
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
