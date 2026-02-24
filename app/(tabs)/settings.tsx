import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Image,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Alert,
  Switch,
  Linking,
} from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { router } from 'expo-router';
import Constants from 'expo-constants';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

import { colors } from '@/src/theme/colors';
import { useToast } from '@/src/components/toast';
import { useLocale } from '@/src/i18n/useLocale';
import { getSubscriptionStatus, setPremiumLocal } from '@/src/services/subscription';
import { PremiumModal } from '@/src/components/PremiumModal';
import { exportBackupJson } from '@/src/services/backup';
import { exportWeeklyPdf } from '@/src/services/pdfExport';
import { clearAllData } from '@/src/services/clearAllData';
import { getWeekRangeISO } from '@/src/utils/weekRange';
import { setHasSeenOnboarding } from '@/src/services/onboardingStorage';

import { SettingsSection } from '@/src/components/settings/SettingsSection';
import { SettingsRow } from '@/src/components/settings/SettingsRow';
import { SettingsCard } from '@/src/components/settings/SettingsCard';

const APP_VERSION = Constants.expoConfig?.version ?? '1.0.0';

const openUrl = (url: string) => {
  Linking.openURL(url).catch(() => {
    // opcional: mostrar toast "Não foi possível abrir o link"
  });
};

export default function SettingsScreen() {
  const { showToast } = useToast();
  const { t, locale, setLocale } = useLocale();
  const [exporting, setExporting] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [isPremium, setIsPremium] = useState(false);
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [premiumModalMessage, setPremiumModalMessage] = useState<string | undefined>();

  useEffect(() => {
    getSubscriptionStatus().then((s) => setIsPremium(s.isPremium));
  }, []);

  const refreshPremium = () => {
    getSubscriptionStatus().then((s) => setIsPremium(s.isPremium));
  };

  const openPremiumModal = (msg?: string) => {
    setPremiumModalMessage(msg);
    setShowPremiumModal(true);
  };

  const handleExportBackup = async () => {
    if (exporting) return;
    if (!isPremium) {
      openPremiumModal(t('premium.export'));
      return;
    }
    setExporting(true);
    try {
      const { filename, jsonString } = await exportBackupJson();
      const path = `${FileSystem.cacheDirectory}${filename}`;
      await FileSystem.writeAsStringAsync(path, jsonString);
      const available = await Sharing.isAvailableAsync();
      if (!available) {
        showToast({ message: t('toast.shareUnavailable'), type: 'error' });
        return;
      }
      await Sharing.shareAsync(path, {
        mimeType: 'application/json',
        UTI: 'public.json',
      });
      showToast({ message: t('toast.exportSuccess'), type: 'success' });
    } catch (e) {
      if (__DEV__) console.error(e);
      showToast({ message: t('toast.exportFailed'), type: 'error' });
    } finally {
      setExporting(false);
    }
  };

  const handleExportPdf = async () => {
    if (exportingPdf) return;
    if (!isPremium) {
      openPremiumModal(t('premium.export'));
      return;
    }
    setExportingPdf(true);
    try {
      const { start } = getWeekRangeISO(new Date());
      const uri = await exportWeeklyPdf(start);
      const available = await Sharing.isAvailableAsync();
      if (!available) {
        showToast({ message: t('toast.shareUnavailable'), type: 'error' });
        return;
      }
      await Sharing.shareAsync(uri, {
        mimeType: 'application/pdf',
        UTI: 'com.adobe.pdf',
      });
      showToast({ message: t('toast.exportSuccess'), type: 'success' });
    } catch (e) {
      if (__DEV__) console.error(e);
      showToast({ message: t('toast.exportFailed'), type: 'error' });
    } finally {
      setExportingPdf(false);
    }
  };

  const handleClearAllData = () => {
    Alert.alert(
      t('settings.clearDataConfirm'),
      t('settings.clearDataMessage'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('settings.clearAction'),
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              t('settings.confirm'),
              t('settings.confirmMessage'),
              [
                { text: t('settings.back'), style: 'cancel' },
                {
                  text: t('settings.confirmAction'),
                  style: 'destructive',
                  onPress: async () => {
                    try {
                      await clearAllData();
                      showToast({ message: t('toast.dataCleared'), type: 'success' });
                    } catch (e) {
                      if (__DEV__) console.error(e);
                      showToast({ message: t('toast.clearFailed'), type: 'error' });
                    }
                  },
                },
              ]
            );
          },
        },
      ]
    );
  };

  const handlePremiumCardPress = () => {
    if (isPremium) {
      showToast({ message: t('toast.subscriptionSoon'), type: 'info' });
    } else {
      openPremiumModal();
    }
  };

  const handleLanguageSelect = async (newLocale: 'pt' | 'en' | 'it') => {
    await setLocale(newLocale);
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('settings.title')}</Text>
        <Text style={styles.subtitle}>{t('settings.subtitle')}</Text>
      </View>

      {/* A) Card Premium */}
      <View style={styles.section}>
        <SettingsCard
          title={t('settings.premium')}
          subtitle={isPremium ? t('settings.premiumActive') : t('settings.premiumInactive')}
          icon="star"
          badge={isPremium ? t('settings.badgeActive') : t('settings.badgeFree')}
          premium={isPremium}
          onPress={handlePremiumCardPress}
        />
      </View>

      {__DEV__ && (
        <SettingsSection title={t('settings.dev')}>
          <Pressable
            style={styles.devCard}
            onPress={async () => {
              await setPremiumLocal(!isPremium);
              refreshPremium();
            }}>
            <Text style={styles.devText}>
              {t('settings.premiumToggle')}: {isPremium ? t('settings.premiumActiveShort') : t('settings.premiumInactiveShort')}
            </Text>
            <Text style={styles.devHint}>{t('settings.devHint')}</Text>
          </Pressable>
        </SettingsSection>
      )}

      {/* B) Rotinas e Metas */}
      <SettingsSection title={t('settings.routinesGoals')}>
        <SettingsRow
          title={t('settings.templates')}
          subtitle={t('settings.templatesSubtitle')}
          icon="file"
          onPress={() => router.push('/templates')}
        />
        <SettingsRow
          title={t('settings.weeklyGoals')}
          subtitle={t('settings.weeklyGoalsSubtitle')}
          icon="trophy"
          onPress={() => router.push('/goals')}
        />
        <SettingsRow
          title={t('achievements.title')}
          subtitle={t('achievements.subtitle')}
          icon="trophy"
          onPress={() => router.push('/achievements')}
        />
        <SettingsRow
          title={t('settings.weekSummary')}
          subtitle={t('settings.weekSummarySubtitle')}
          icon="calendar"
          onPress={() => router.push('/summary')}
        />
        <SettingsRow
          title={t('settings.reports')}
          subtitle={t('settings.reportsSubtitle')}
          icon="bar-chart"
          onPress={() => router.push('/reports')}
        />
      </SettingsSection>

      {/* C) Idioma */}
      <SettingsSection title={t('settings.language')}>
        <Text style={styles.languageHint}>{t('settings.languageSubtitle')}</Text>
        <View style={styles.languageOptions}>
          {(['pt', 'en', 'it'] as const).map((loc) => (
            <Pressable
              key={loc}
              style={[styles.languageOption, locale === loc && styles.languageOptionActive]}
              onPress={() => handleLanguageSelect(loc)}>
              <Text style={[styles.languageOptionText, locale === loc && styles.languageOptionTextActive]}>
                {loc === 'pt' && t('settings.languagePt')}
                {loc === 'en' && t('settings.languageEn')}
                {loc === 'it' && t('settings.languageIt')}
              </Text>
              {locale === loc && (
                <FontAwesome name="check" size={16} color={colors.primary} />
              )}
            </Pressable>
          ))}
        </View>
      </SettingsSection>

      {/* D) Notificações */}
      <SettingsSection title={t('settings.notifications')}>
        <SettingsRow
          title={t('settings.notifications')}
          subtitle={t('settings.notificationsSubtitle')}
          icon="bell"
          onPress={() => router.push('/settings/notifications')}
        />
      </SettingsSection>

      {/* E) Dados */}
      <SettingsSection title={t('settings.data')}>
        <Pressable
          style={styles.rowCard}
          onPress={handleExportBackup}
          disabled={exporting}>
          <View style={styles.rowContent}>
            {exporting ? (
              <View style={styles.rowLoading}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={styles.rowTitle}>{t('settings.exporting')}</Text>
              </View>
            ) : (
              <>
                <Text style={styles.rowTitle}>{t('settings.exportBackup')}</Text>
                <Text style={styles.rowSubtitle}>{t('settings.exportBackupSubtitle')}</Text>
              </>
            )}
          </View>
          {!exporting && <FontAwesome name="chevron-right" size={14} color={colors.textSecondary} />}
        </Pressable>
        <Pressable
          style={styles.rowCard}
          onPress={handleExportPdf}
          disabled={exportingPdf}>
          <View style={styles.rowContent}>
            {exportingPdf ? (
              <View style={styles.rowLoading}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={styles.rowTitle}>{t('settings.exporting')}</Text>
              </View>
            ) : (
              <>
                <Text style={styles.rowTitle}>{t('settings.exportPdf')}</Text>
                <Text style={styles.rowSubtitle}>{t('settings.exportPdfSubtitle')}</Text>
              </>
            )}
          </View>
          {!exportingPdf && <FontAwesome name="chevron-right" size={14} color={colors.textSecondary} />}
        </Pressable>
        <SettingsRow
          title={t('settings.importBackup')}
          subtitle={t('settings.importSoon')}
          icon="upload"
          disabled
        />
      </SettingsSection>

      {/* F) Sobre */}
      <SettingsSection title={t('settings.about')}>
        <Image
          source={require('../../assets/branding/logo-gold.png')}
          style={styles.aboutLogo}
          resizeMode="contain"
        />
        <Text style={styles.aboutAppName}>{t('common.appName')}</Text>
        <SettingsRow
          title={t('settings.version')}
          subtitle={APP_VERSION}
          icon="info-circle"
        />
        <SettingsRow
          title={t('settings.support')}
          subtitle={t('settings.supportEmail')}
          icon="envelope"
          onPress={() => Linking.openURL('mailto:suporte@locione.com')}
        />
        <SettingsRow
          title={t('settings.privacy')}
          icon="lock"
          onPress={() => openUrl('https://locione.com/privacidade-mobile')}
        />
        <SettingsRow
          title={t('settings.terms')}
          icon="file"
          onPress={() => openUrl('https://locione.com/termos')}
        />
      </SettingsSection>

      {/* G) Debug */}
      <SettingsSection title={t('settings.debug')}>
        <SettingsRow
          title={t('settings.widgetPreview')}
          subtitle={t('settings.widgetPreviewSubtitle')}
          icon="mobile"
          onPress={() => router.push('/settings/widget-preview')}
        />
        {__DEV__ && (
          <SettingsRow
            title={t('onboarding.revert')}
            subtitle={t('settings.devHint')}
            icon="refresh"
            onPress={async () => {
              await setHasSeenOnboarding(false);
              router.replace('/onboarding');
            }}
          />
        )}
      </SettingsSection>

      {/* H) Zona perigosa */}
      <SettingsSection title={t('settings.dangerZone')}>
        <Pressable style={styles.dangerCard} onPress={handleClearAllData}>
          <Text style={styles.dangerTitle}>{t('settings.clearData')}</Text>
          <Text style={styles.dangerSubtitle}>{t('settings.clearDataSubtitle')}</Text>
        </Pressable>
      </SettingsSection>

      <View style={styles.bottomSpacer} />

      <PremiumModal
        visible={showPremiumModal}
        onClose={() => setShowPremiumModal(false)}
        message={premiumModalMessage}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    padding: 16,
    backgroundColor: colors.card,
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
  section: {
    marginTop: 24,
    paddingHorizontal: 16,
  },
  devCard: {
    backgroundColor: colors.card,
    padding: 16,
    borderRadius: 14,
    marginBottom: 8,
    borderLeftWidth: 4,
    borderLeftColor: colors.border,
  },
  devText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  devHint: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 4,
  },
  rowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 14,
    marginBottom: 8,
  },
  rowContent: {
    flex: 1,
  },
  rowTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.text,
  },
  rowSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  rowLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dangerCard: {
    backgroundColor: colors.card,
    padding: 16,
    borderRadius: 14,
    marginBottom: 8,
    borderLeftWidth: 4,
    borderLeftColor: colors.error,
  },
  dangerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.error,
  },
  dangerSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 4,
  },
  languageHint: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  languageOptions: {
    gap: 4,
  },
  languageOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.card,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 14,
    marginBottom: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  languageOptionActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '10',
  },
  languageOptionText: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.text,
  },
  languageOptionTextActive: {
    fontWeight: '600',
    color: colors.primary,
  },
  bottomSpacer: {
    height: 32,
  },
  aboutLogo: {
    width: 120,
    height: 120,
    alignSelf: 'center',
    marginBottom: 12,
  },
  aboutAppName: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 8,
  },
});
