import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Pressable,
  Platform,
  TextInput,
  Modal,
} from 'react-native';

import { timeFromDate, dateFromIsoAndTime } from '@/src/utils/date';
import { localDayKey } from '@/src/utils/dateKey';
import { useLocale } from '@/src/i18n/useLocale';
import { colors } from '@/src/theme/colors';

interface TimeFieldProps {
  value: string | undefined;
  onChange: (next: string) => void;
  label?: string;
  dateIso?: string;
}

function useDateTimePicker() {
  try {
    return require('@react-native-community/datetimepicker');
  } catch {
    return null;
  }
}

export function TimeField({
  value,
  onChange,
  label,
  dateIso,
}: TimeFieldProps) {
  const { t } = useLocale();
  const displayLabel = label ?? t('form.timeLabel');
  const [open, setOpen] = useState(false);
  const todayKey = localDayKey(new Date());
  const baseDate = dateIso ?? todayKey;
  const [tempDate, setTempDate] = useState<Date>(() =>
    value
      ? dateFromIsoAndTime(baseDate, value)
      : new Date(baseDate + 'T09:00:00')
  );
  const date = value
    ? dateFromIsoAndTime(baseDate, value)
    : new Date(baseDate + 'T09:00:00');
  const Picker = useDateTimePicker();

  const handleOpen = () => {
    setTempDate(
      value
        ? dateFromIsoAndTime(baseDate, value)
        : new Date(baseDate + 'T09:00:00')
    );
    setOpen(true);
  };

  const handleChange = Picker
    ? (e: { type: string }, selected?: Date) => {
        if (Platform.OS === 'android') {
          setOpen(false);
          if (e.type === 'set' && selected) {
            onChange(timeFromDate(selected));
          }
        } else {
          if (selected) setTempDate(selected);
        }
      }
    : undefined;

  const handleConfirm = () => {
    onChange(timeFromDate(tempDate));
    setOpen(false);
  };

  if (Picker) {
    return (
      <View style={styles.container}>
        {displayLabel ? <Text style={styles.label}>{displayLabel}</Text> : null}
        <Pressable style={styles.button} onPress={handleOpen}>
          <Text style={styles.buttonText}>{value || '09:00'}</Text>
        </Pressable>
        {open && Platform.OS === 'android' && (
          <Picker.default
            value={tempDate}
            mode="time"
            display="default"
            onChange={handleChange}
          />
        )}
        {open && Platform.OS === 'ios' && (
          <Modal transparent animationType="slide" visible={open}>
            <Pressable style={styles.iosOverlay} onPress={() => setOpen(false)}>
              <Pressable style={styles.iosContent} onPress={(e) => e.stopPropagation()}>
                <View style={styles.iosHeader}>
                  <Pressable onPress={() => setOpen(false)}>
                    <Text style={styles.iosCancel}>{t('common.cancel')}</Text>
                  </Pressable>
                  <Pressable onPress={handleConfirm}>
                    <Text style={styles.iosOk}>{t('common.ok')}</Text>
                  </Pressable>
                </View>
                <Picker.default
                  value={tempDate}
                  mode="time"
                  display="spinner"
                  onChange={handleChange}
                />
              </Pressable>
            </Pressable>
          </Modal>
        )}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {displayLabel ? <Text style={styles.label}>{displayLabel}</Text> : null}
      <TextInput
        style={styles.input}
        value={value || ''}
        onChangeText={(text) => {
          const cleaned = text.replace(/\D/g, '');
          let f = '';
          if (cleaned.length > 0) f = cleaned.slice(0, 2);
          if (cleaned.length > 2) f += ':' + cleaned.slice(2, 4);
          if (f.length >= 5) onChange(f);
        }}
        placeholder="HH:mm"
        placeholderTextColor={colors.textSecondary}
        keyboardType="number-pad"
        maxLength={5}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: 16 },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  button: {
    backgroundColor: colors.card,
    borderRadius: 8,
    padding: 12,
  },
  buttonText: { fontSize: 16, color: colors.text },
  input: {
    backgroundColor: colors.card,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: colors.text,
  },
  iosOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  iosContent: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  iosHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  iosCancel: { fontSize: 16, color: colors.textSecondary },
  iosOk: { fontSize: 16, fontWeight: '600', color: colors.primary },
});
