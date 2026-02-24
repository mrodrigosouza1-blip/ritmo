import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  Switch,
  Pressable,
} from 'react-native';
import { Stack } from 'expo-router';

import { colors } from '@/src/theme/colors';
import { useLocale } from '@/src/i18n/useLocale';
import { useToast } from '@/src/components/toast';
import { TimeField } from '@/src/components/TimeField';
import {
  getNotificationEnabled,
  setNotificationEnabled,
  getNotificationOffsetMinutes,
  setNotificationOffsetMinutes,
  getNotificationApplyTo,
  setNotificationApplyTo,
  getQuietHoursEnabled,
  setQuietHoursEnabled,
  getQuietHoursStart,
  setQuietHoursStart,
  getQuietHoursEnd,
  setQuietHoursEnd,
  getSmartBasicEnabled,
  setSmartBasicEnabled,
  getSmartPremiumEnabled,
  setSmartPremiumEnabled,
  getSmartFrequency,
  setSmartFrequency,
  getSmartDefaultHour,
  setSmartDefaultHour,
  type NotificationApplyTo,
  type SmartFrequency,
} from '@/src/services/notificationSettings';
import { getSubscriptionStatus } from '@/src/services/subscription';
import { applyNotificationSettings } from '@/src/services/notificationSettingsApply';
import { PremiumModal } from '@/src/components/PremiumModal';
import { localDayKey } from '@/src/utils/dateKey';
import {
  debugEvaluateSmartRules,
  debugSendTestSmartNotification,
} from '@/src/services/smartNotifications';

const OFFSET_OPTIONS = [
  { value: 0, labelKey: 'notifications.offset.onTime' },
  { value: 5, labelKey: 'notifications.offset.5min' },
  { value: 10, labelKey: 'notifications.offset.10min' },
  { value: 15, labelKey: 'notifications.offset.15min' },
  { value: 30, labelKey: 'notifications.offset.30min' },
  { value: 60, labelKey: 'notifications.offset.1h' },
  { value: 120, labelKey: 'notifications.offset.2h' },
] as const;

const FREQUENCY_OPTIONS: { value: SmartFrequency; labelKey: string }[] = [
  { value: 'never', labelKey: 'notifications.frequencyNever' },
  { value: 'once_per_day', labelKey: 'notifications.frequencyDaily' },
  { value: 'only_near_goal', labelKey: 'notifications.frequencyNearGoal' },
];

export default function NotificationSettingsScreen() {
  const { t } = useLocale();
  const { showToast } = useToast();
  const [enabled, setEnabled] = useState(true);
  const [offset, setOffsetState] = useState(30);
  const [applyTo, setApplyToState] = useState<NotificationApplyTo>({
    events: true,
    tasks: true,
    routines: true,
  });
  const [quietEnabled, setQuietEnabled] = useState(false);
  const [quietStart, setQuietStart] = useState('22:00');
  const [quietEnd, setQuietEnd] = useState('08:00');
  const [smartBasic, setSmartBasic] = useState(true);
  const [smartPremium, setSmartPremium] = useState(false);
  const [smartFrequency, setSmartFrequencyState] = useState<SmartFrequency>('once_per_day');
  const [smartTime, setSmartTime] = useState('19:30');
  const [isPremium, setIsPremium] = useState(false);
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [debugRule, setDebugRule] = useState<string | null>(null);
  const [debugLoading, setDebugLoading] = useState(false);

  const load = useCallback(async () => {
    const [e, o, a, qe, qs, qend, sb, sp, freq, st, sub] = await Promise.all([
      getNotificationEnabled(),
      getNotificationOffsetMinutes(),
      getNotificationApplyTo(),
      getQuietHoursEnabled(),
      getQuietHoursStart(),
      getQuietHoursEnd(),
      getSmartBasicEnabled(),
      getSmartPremiumEnabled(),
      getSmartFrequency(),
      getSmartDefaultHour(),
      getSubscriptionStatus(),
    ]);
    setEnabled(e);
    setOffsetState(o);
    setApplyToState(a);
    setQuietEnabled(qe);
    setQuietStart(qs);
    setQuietEnd(qend);
    setSmartBasic(sb);
    setSmartPremium(sp);
    setSmartFrequencyState(freq);
    setSmartTime(st);
    setIsPremium(sub.isPremium);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const onConfigChange = useCallback(async () => {
    try {
      await applyNotificationSettings();
      showToast({ message: t('toast.notificationsUpdated'), type: 'success' });
    } catch {
      showToast({ message: t('toast.configApplied'), type: 'info' });
    }
  }, [showToast]);

  const handleEnabledChange = async (v: boolean) => {
    setEnabled(v);
    await setNotificationEnabled(v);
    onConfigChange();
  };

  const handleOffsetChange = async (v: number) => {
    setOffsetState(v);
    await setNotificationOffsetMinutes(v);
    onConfigChange();
  };

  const handleApplyToChange = async (key: keyof NotificationApplyTo, v: boolean) => {
    const next = { ...applyTo, [key]: v };
    setApplyToState(next);
    await setNotificationApplyTo(next);
    onConfigChange();
  };

  const handleQuietEnabledChange = async (v: boolean) => {
    setQuietEnabled(v);
    await setQuietHoursEnabled(v);
    onConfigChange();
  };

  const handleQuietStartChange = async (v: string) => {
    setQuietStart(v);
    await setQuietHoursStart(v);
    onConfigChange();
  };

  const handleQuietEndChange = async (v: string) => {
    setQuietEnd(v);
    await setQuietHoursEnd(v);
    onConfigChange();
  };

  const handleSmartBasicChange = async (v: boolean) => {
    setSmartBasic(v);
    await setSmartBasicEnabled(v);
    onConfigChange();
  };

  const handleSmartPremiumChange = async (v: boolean) => {
    if (v && !isPremium) {
      setShowPremiumModal(true);
      return;
    }
    setSmartPremium(v);
    await setSmartPremiumEnabled(v);
    onConfigChange();
  };

  const handleSmartFrequencyChange = async (v: SmartFrequency) => {
    setSmartFrequencyState(v);
    await setSmartFrequency(v);
    onConfigChange();
  };

  const handleSmartTimeChange = async (v: string) => {
    setSmartTime(v);
    await setSmartDefaultHour(v);
    onConfigChange();
  };

  const handleDebugTest = async () => {
    setDebugLoading(true);
    setDebugRule(null);
    try {
      const todayIso = localDayKey(new Date());
      const { result, canSend } = await debugEvaluateSmartRules(todayIso);
      if (result) {
        setDebugRule(`${result.ruleId}: ${result.title}${canSend ? ' ' + t('smartNotif.debugOkToSend') : ' ' + t('smartNotif.debugAlreadySent')}`);
        await debugSendTestSmartNotification();
      } else {
        setDebugRule(t('smartNotif.debugRule') + ': ' + t('smartNotif.debugNoRule'));
      }
    } catch (e) {
      setDebugRule(String(e));
    } finally {
      setDebugLoading(false);
    }
  };

  const todayIso = localDayKey(new Date());

  return (
    <>
      <Stack.Screen options={{ title: t('notifications.title') }} />
      <ScrollView style={styles.container}>
        {/* 1) Ativar */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('notifications.enable')}</Text>
          <View style={styles.row}>
            <View style={styles.rowContent}>
              <Text style={styles.rowTitle}>{t('notifications.remindersActive')}</Text>
              <Text style={styles.rowSubtitle}>{t('notifications.remindersSubtitle')}</Text>
            </View>
            <Switch
              value={enabled}
              onValueChange={handleEnabledChange}
              trackColor={{ false: colors.border, true: colors.primary + '80' }}
              thumbColor={enabled ? colors.primary : colors.textSecondary}
            />
          </View>
        </View>

        {/* 2) Lembretes - offset */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('notifications.reminders')}</Text>
          {OFFSET_OPTIONS.map((opt) => (
            <Pressable
              key={opt.value}
              style={[
                styles.offsetRow,
                offset === opt.value && styles.offsetRowActive,
              ]}
              onPress={() => handleOffsetChange(opt.value)}>
              <Text
                style={[
                  styles.offsetLabel,
                  offset === opt.value && styles.offsetLabelActive,
                ]}>
                {t(opt.labelKey)}
              </Text>
              {offset === opt.value && (
                <Text style={styles.check}>✓</Text>
              )}
            </Pressable>
          ))}
          <Text style={styles.helper}>{t('notifications.helperExample')}</Text>
        </View>

        {/* 3) Aplicar para */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('notifications.applyTo')}</Text>
          <View style={styles.row}>
            <View style={styles.rowContent}>
              <Text style={styles.rowTitle}>{t('today.events')}</Text>
            </View>
            <Switch
              value={applyTo.events}
              onValueChange={(v) => handleApplyToChange('events', v)}
              trackColor={{ false: colors.border, true: colors.primary + '80' }}
              thumbColor={applyTo.events ? colors.primary : colors.textSecondary}
            />
          </View>
          <View style={styles.row}>
            <View style={styles.rowContent}>
              <Text style={styles.rowTitle}>{t('today.routines')}</Text>
            </View>
            <Switch
              value={applyTo.routines}
              onValueChange={(v) => handleApplyToChange('routines', v)}
              trackColor={{ false: colors.border, true: colors.primary + '80' }}
              thumbColor={applyTo.routines ? colors.primary : colors.textSecondary}
            />
          </View>
          <View style={styles.row}>
            <View style={styles.rowContent}>
              <Text style={styles.rowTitle}>{t('today.tasks')}</Text>
            </View>
            <Switch
              value={applyTo.tasks}
              onValueChange={(v) => handleApplyToChange('tasks', v)}
              trackColor={{ false: colors.border, true: colors.primary + '80' }}
              thumbColor={applyTo.tasks ? colors.primary : colors.textSecondary}
            />
          </View>
        </View>

        {/* 4) Horário silencioso */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('notifications.quietHours')}</Text>
          <View style={styles.row}>
            <View style={styles.rowContent}>
              <Text style={styles.rowTitle}>{t('notifications.enableShort')}</Text>
              <Text style={styles.rowSubtitle}>
                {t('notifications.quietHoursSubtitle')}
              </Text>
            </View>
            <Switch
              value={quietEnabled}
              onValueChange={handleQuietEnabledChange}
              trackColor={{ false: colors.border, true: colors.primary + '80' }}
              thumbColor={quietEnabled ? colors.primary : colors.textSecondary}
            />
          </View>
          {quietEnabled && (
            <>
              <View style={styles.quietRow}>
                <Text style={styles.quietLabel}>{t('notifications.quietStart')}</Text>
                <TimeField
                  value={quietStart}
                  onChange={handleQuietStartChange}
                  label=""
                  dateIso={todayIso}
                />
              </View>
              <View style={styles.quietRow}>
                <Text style={styles.quietLabel}>{t('notifications.quietEnd')}</Text>
                <TimeField
                  value={quietEnd}
                  onChange={handleQuietEndChange}
                  label=""
                  dateIso={todayIso}
                />
              </View>
            </>
          )}
        </View>

        {/* 5) Inteligentes */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('notifications.smart')}</Text>
          <View style={styles.row}>
            <View style={styles.rowContent}>
              <Text style={styles.rowTitle}>{t('notifications.emptyDay')}</Text>
              <Text style={styles.rowSubtitle}>{t('notifications.emptyDaySubtitle')}</Text>
            </View>
            <Switch
              value={smartBasic}
              onValueChange={handleSmartBasicChange}
              trackColor={{ false: colors.border, true: colors.primary + '80' }}
              thumbColor={smartBasic ? colors.primary : colors.textSecondary}
            />
          </View>
          <View style={styles.row}>
            <View style={styles.rowContent}>
              <Text style={styles.rowTitle}>{t('notifications.coachPremium')}</Text>
              <Text style={styles.rowSubtitle}>
                {t('notifications.coachPremiumSubtitle')}
                {!isPremium && t('notifications.premiumBadge')}
              </Text>
            </View>
            <Switch
              value={smartPremium}
              onValueChange={handleSmartPremiumChange}
              trackColor={{ false: colors.border, true: colors.primary + '80' }}
              thumbColor={smartPremium ? colors.primary : colors.textSecondary}
            />
          </View>
          {smartPremium && isPremium && (
            <>
              <Text style={styles.frequencyLabel}>{t('notifications.frequency')}</Text>
              {FREQUENCY_OPTIONS.map((opt) => (
                <Pressable
                  key={opt.value}
                  style={[
                    styles.offsetRow,
                    smartFrequency === opt.value && styles.offsetRowActive,
                  ]}
                  onPress={() => handleSmartFrequencyChange(opt.value)}>
                  <Text
                    style={[
                      styles.offsetLabel,
                      smartFrequency === opt.value && styles.offsetLabelActive,
                    ]}>
                    {t(opt.labelKey)}
                  </Text>
                  {smartFrequency === opt.value && (
                    <Text style={styles.check}>✓</Text>
                  )}
                </Pressable>
              ))}
              <View style={styles.quietRow}>
                <Text style={styles.quietLabel}>{t('notifications.smartTime')}</Text>
                <TimeField
                  value={smartTime}
                  onChange={handleSmartTimeChange}
                  label=""
                  dateIso={todayIso}
                />
              </View>
            </>
          )}
        </View>

        {__DEV__ && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('settings.debug')}</Text>
            <Pressable
              style={styles.offsetRow}
              onPress={handleDebugTest}
              disabled={debugLoading}>
              <Text style={styles.offsetLabel}>
                {t('smartNotif.debugTest')}
                {debugLoading ? '...' : ''}
              </Text>
            </Pressable>
            {debugRule != null && (
              <Text style={styles.helper}>{debugRule}</Text>
            )}
          </View>
        )}

        <View style={styles.bottomSpacer} />
      </ScrollView>

      <PremiumModal
        visible={showPremiumModal}
        onClose={() => setShowPremiumModal(false)}
        message={t('notifications.premiumCoachMessage')}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  section: {
    paddingHorizontal: 16,
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  row: {
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
  offsetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.card,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 14,
    marginBottom: 8,
  },
  offsetRowActive: {
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
  },
  offsetLabel: {
    fontSize: 16,
    color: colors.text,
  },
  offsetLabelActive: {
    fontWeight: '600',
    color: colors.primary,
  },
  check: {
    fontSize: 16,
    color: colors.primary,
    fontWeight: 'bold',
  },
  helper: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
    marginBottom: 8,
  },
  quietRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 14,
    marginBottom: 8,
  },
  quietLabel: {
    fontSize: 16,
    color: colors.text,
    marginRight: 16,
    width: 60,
  },
  frequencyLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.textSecondary,
    marginTop: 12,
    marginBottom: 8,
  },
  bottomSpacer: {
    height: 32,
  },
});
