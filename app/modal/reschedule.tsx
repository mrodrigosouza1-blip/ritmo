import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Pressable,
  Alert,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';

import { DateField } from '@/src/components/DateField';
import { rescheduleTask, rescheduleEvent, rescheduleRoutineOccurrence } from '@/src/services/reschedule';
import { debouncedSyncWidgets } from '@/src/services/widgetsSync';
import { localDayKey } from '@/src/utils/dateKey';
import { colors } from '@/src/theme/colors';
import { useLocale } from '@/src/i18n/useLocale';

export default function RescheduleModalScreen() {
  const { t } = useLocale();
  const params = useLocalSearchParams<{
    type: string;
    id: string;
    fromDate: string;
    currentDate?: string;
  }>();
  const type = params.type;
  const id = params.id;
  const fromDate = params.fromDate ?? localDayKey(new Date());
  const currentDate = params.currentDate;

  const [date, setDate] = useState(fromDate);

  const handleConfirm = async () => {
    if (!id || !type) return;
    if (date === fromDate) {
      Alert.alert(t('modal.warning'), t('modal.chooseDifferentDate'));
      return;
    }
    try {
      if (type === 'event') {
        await rescheduleEvent(id, fromDate, date);
      } else if (type === 'task') {
        await rescheduleTask(id, fromDate, date);
      } else if (type === 'routine') {
        await rescheduleRoutineOccurrence(id, fromDate, date, currentDate);
      }
      debouncedSyncWidgets(localDayKey(new Date()));
      router.back();
    } catch (e) {
      if (__DEV__) console.error(e);
      Alert.alert(t('form.error'), t('form.errorReschedule'));
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t('modal.reschedule')}</Text>
      <DateField value={date} onChange={setDate} />
      <View style={styles.buttons}>
        <Pressable style={styles.cancelBtn} onPress={() => router.back()}>
          <Text style={styles.cancelText}>{t('common.cancel')}</Text>
        </Pressable>
        <Pressable style={styles.confirmBtn} onPress={handleConfirm}>
          <Text style={styles.confirmText}>{t('modal.confirm')}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 24 },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 16,
  },
  buttons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  cancelBtn: {
    flex: 1,
    padding: 16,
    backgroundColor: colors.border,
    borderRadius: 12,
  },
  cancelText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  confirmBtn: {
    flex: 1,
    padding: 16,
    backgroundColor: colors.primary,
    borderRadius: 12,
  },
  confirmText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
});
