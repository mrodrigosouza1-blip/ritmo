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

import { isoFromDate, isoToDate } from '@/src/utils/date';
import { formatDate } from '@/src/utils/formatDate';
import { colors } from '@/src/theme/colors';
import { useLocale } from '@/src/i18n/useLocale';

interface DateFieldProps {
  value: string | undefined;
  onChange: (nextIsoDate: string) => void;
  label?: string;
}

function useDateTimePicker() {
  try {
    return require('@react-native-community/datetimepicker');
  } catch {
    return null;
  }
}

export function DateField({ value, onChange, label }: DateFieldProps) {
  const { t, locale } = useLocale();
  const resolvedLabel = label ?? t('form.date');
  const [open, setOpen] = useState(false);
  const [local, setLocal] = useState('');
  const [tempDate, setTempDate] = useState<Date>(() =>
    value ? isoToDate(value) : new Date()
  );
  const date = value ? isoToDate(value) : new Date();
  const displayVal = value || local;
  const Picker = useDateTimePicker();

  const handleOpen = () => {
    setTempDate(value ? isoToDate(value) : new Date());
    setOpen(true);
  };

  const handleChange = Picker
    ? (e: { type: string }, selected?: Date) => {
        if (Platform.OS === 'android') {
          setOpen(false);
          if (e.type === 'set' && selected) {
            onChange(isoFromDate(selected));
          }
        } else {
          if (selected) setTempDate(selected);
        }
      }
    : undefined;

  const handleConfirm = () => {
    onChange(isoFromDate(tempDate));
    setOpen(false);
  };

  if (Picker) {
    return (
      <View style={styles.container}>
        {resolvedLabel ? <Text style={styles.label}>{resolvedLabel}</Text> : null}
        <Pressable style={styles.button} onPress={handleOpen}>
          <Text style={styles.buttonText}>
            {value ? formatDate(value, locale) : t('modal.selectDate')}
          </Text>
        </Pressable>
        {open && Platform.OS === 'android' && (
          <Picker.default
            value={tempDate}
            mode="date"
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
                  mode="date"
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
      {resolvedLabel ? <Text style={styles.label}>{resolvedLabel}</Text> : null}
      <TextInput
        style={styles.input}
        value={displayVal}
        onChangeText={(text) => {
          const cleaned = text.replace(/\D/g, '');
          let f = '';
          if (cleaned.length > 0) f = cleaned.slice(0, 4);
          if (cleaned.length > 4) f += '-' + cleaned.slice(4, 6);
          if (cleaned.length > 6) f += '-' + cleaned.slice(6, 8);
          setLocal(f);
          if (f.length === 10 || f.length === 0) onChange(f);
        }}
        placeholder="AAAA-MM-DD"
        placeholderTextColor={colors.textSecondary}
        keyboardType="number-pad"
        maxLength={10}
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
