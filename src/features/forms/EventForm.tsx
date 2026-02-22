import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  Alert,
} from 'react-native';

import { getEventById, createEvent, updateEvent } from '@/src/services/events';
import { scheduleItemNotification } from '@/src/services/notificationEngine';
import { getAllCategories } from '@/src/services/categories';
import { ensureDefaultCategories } from '@/src/services/categories';
import { getCategoryDisplayName } from '@/src/services/categoryDisplay';
import { DateField } from '@/src/components/DateField';
import { TimeField } from '@/src/components/TimeField';
import { localDayKey } from '@/src/utils/dateKey';
import { debouncedSyncWidgets } from '@/src/services/widgetsSync';
import type { Event, Category } from '@/src/types';
import { colors } from '@/src/theme/colors';
import { useLocale } from '@/src/i18n/useLocale';

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

interface EventFormProps {
  mode: 'create' | 'edit';
  id?: string;
  initialDate?: string;
  onClose: () => void;
}

export function EventForm({ mode, id, initialDate, onClose }: EventFormProps) {
  const { t } = useLocale();
  const todayIso = localDayKey(new Date());
  const defaultDate =
    initialDate && /^\d{4}-\d{2}-\d{2}$/.test(initialDate) ? initialDate : todayIso;
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(defaultDate);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:00');
  const [location, setLocation] = useState('');
  const [notes, setNotes] = useState('');
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(mode === 'edit');

  useEffect(() => {
    (async () => {
      await ensureDefaultCategories();
      const cats = await getAllCategories();
      setCategories(cats);

      if (mode === 'edit' && id) {
        const evt = await getEventById(id);
        if (evt) {
          setTitle(evt.title);
          setDate(evt.date || todayIso);
          setStartTime(evt.start_at?.slice(0, 5) ?? '09:00');
          setEndTime(evt.end_at?.slice(0, 5) ?? '10:00');
          setLocation(evt.location ?? '');
          setNotes(evt.notes ?? '');
          setCategoryId(evt.category_id ?? null);
        }
        setLoading(false);
      } else {
        setLoading(false);
      }
    })();
  }, [mode, id, todayIso]);

  useEffect(() => {
    if (mode === 'create' && initialDate && /^\d{4}-\d{2}-\d{2}$/.test(initialDate)) {
      setDate(initialDate);
    }
  }, [mode, initialDate]);

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert(t('form.error'), t('form.enterTitle'));
      return;
    }

    const eventId = mode === 'edit' && id ? id : generateId();
    const evt: Event = {
      id: eventId,
      title: title.trim(),
      date,
      start_at: startTime,
      end_at: endTime || startTime,
      location: location.trim() || undefined,
      notes: notes.trim() || undefined,
      category_id: categoryId ?? undefined,
    };

    try {
      if (mode === 'create') {
        await createEvent(evt);
      } else {
        await updateEvent(evt);
      }

      const notifyId = await scheduleItemNotification({
        id: eventId,
        title: evt.title,
        date,
        time: startTime,
        type: 'event',
      });
      if (notifyId) {
        await updateEvent({ ...evt, notify_id: notifyId });
      }

      debouncedSyncWidgets(todayIso);
      onClose();
    } catch (e) {
      if (__DEV__) console.error(e);
      Alert.alert(t('form.error'), t('form.errorSave'));
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <Text style={styles.loadingText}>{t('common.loading')}</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.form}>
        <Text style={styles.label}>{t('form.title')}</Text>
        <TextInput
          style={styles.input}
          value={title}
          onChangeText={setTitle}
          placeholder={t('form.eventTitlePlaceholder')}
          placeholderTextColor={colors.textSecondary}
        />

        <DateField value={date} onChange={setDate} label={t('form.date')} />
        <TimeField
          value={startTime}
          onChange={setStartTime}
          label={t('form.startTime')}
          dateIso={date}
        />
        <TimeField
          value={endTime}
          onChange={setEndTime}
          label={t('form.endTime')}
          dateIso={date}
        />

        <Text style={styles.label}>{t('form.location')}</Text>
        <TextInput
          style={styles.input}
          value={location}
          onChangeText={setLocation}
          placeholder={t('form.locationPlaceholder')}
          placeholderTextColor={colors.textSecondary}
        />

        {categories.length > 0 && (
          <>
            <Text style={styles.label}>{t('form.category')}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catScroll}>
              <Pressable
                style={[styles.catBtn, !categoryId && styles.catBtnActive]}
                onPress={() => setCategoryId(null)}>
                <Text style={styles.catBtnText}>{t('form.noCategory')}</Text>
              </Pressable>
              {categories.map((c) => (
                <Pressable
                  key={c.id}
                  style={[
                    styles.catBtn,
                    { borderColor: c.color_hex },
                    categoryId === c.id && { backgroundColor: c.color_hex + '30' },
                  ]}
                  onPress={() =>
                    setCategoryId(categoryId === c.id ? null : c.id)
                  }>
                  <View style={[styles.catDot, { backgroundColor: c.color_hex }]} />
                  <Text style={styles.catBtnText}>{getCategoryDisplayName(c)}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </>
        )}

        <Text style={styles.label}>{t('form.notes')}</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={notes}
          onChangeText={setNotes}
          placeholder={t('form.notesPlaceholder')}
          placeholderTextColor={colors.textSecondary}
          multiline
        />
      </View>

      {!title.trim() && (
        <Text style={styles.disabledHint}>{t('form.saveHint')}</Text>
      )}
      <View style={styles.buttons}>
        <Pressable style={styles.cancelBtn} onPress={onClose}>
          <Text style={styles.cancelText}>{t('common.cancel')}</Text>
        </Pressable>
        <Pressable
          style={[styles.submitBtn, !title.trim() && styles.submitBtnDisabled]}
          onPress={handleSave}
          disabled={!title.trim()}>
          <Text style={styles.submitText}>{t('common.save')}</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: { fontSize: 16, color: colors.textSecondary },
  form: { padding: 16 },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  input: {
    backgroundColor: colors.card,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: colors.text,
    marginBottom: 16,
  },
  textArea: { minHeight: 60 },
  catScroll: { marginBottom: 16 },
  catBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: colors.border,
    marginRight: 8,
  },
  catBtnActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '20',
  },
  catDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 6,
  },
  catBtnText: { fontSize: 14, color: colors.text },
  buttons: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
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
  submitBtn: {
    flex: 1,
    padding: 16,
    backgroundColor: colors.primary,
    borderRadius: 12,
  },
  submitBtnDisabled: {
    opacity: 0.5,
  },
  disabledHint: {
    fontSize: 12,
    color: colors.textSecondary,
    marginHorizontal: 16,
    marginBottom: -8,
  },
  submitText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
});
