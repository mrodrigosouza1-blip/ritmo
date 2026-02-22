import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  Switch,
  Alert,
  Modal,
} from 'react-native';

import { getRoutineById, createRoutine, updateRoutine } from '@/src/services/routines';
import { getAllCategories } from '@/src/services/categories';
import { ensureDefaultCategories } from '@/src/services/categories';
import { listRoutineTimes, setRoutineTimes } from '@/src/services/routineTimes';
import { getCategoryDisplayName } from '@/src/services/categoryDisplay';
import { TimeField } from '@/src/components/TimeField';
import { localDayKey } from '@/src/utils/dateKey';
import { debouncedSyncWidgets } from '@/src/services/widgetsSync';
import { scheduleRoutineTimeNotifications } from '@/src/services/notificationEngine';
import type { Routine, Category } from '@/src/types';
import { colors } from '@/src/theme/colors';
import { useLocale } from '@/src/i18n/useLocale';

type BlockType = 'morning' | 'afternoon' | 'evening' | 'none';

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

interface RoutineFormProps {
  mode: 'create' | 'edit';
  id?: string;
  initialDate?: string;
  onClose: () => void;
}

const BLOCKS: { value: BlockType; key: string }[] = [
  { value: 'morning', key: 'form.blockMorning' },
  { value: 'afternoon', key: 'form.blockAfternoon' },
  { value: 'evening', key: 'form.blockEvening' },
  { value: 'none', key: 'form.blockNone' },
];

export function RoutineForm({ mode, id, initialDate: _initialDate, onClose }: RoutineFormProps) {
  const { t } = useLocale();
  const [title, setTitle] = useState('');
  const [block, setBlock] = useState<BlockType>('morning');
  const [defaultTime, setDefaultTime] = useState<string | undefined>('09:00');
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [isActive, setIsActive] = useState(true);
  const [location, setLocation] = useState('');
  const [notes, setNotes] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(mode === 'edit');
  const [useTimes, setUseTimes] = useState(false);
  const [times, setTimes] = useState<string[]>([]);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [tempTime, setTempTime] = useState('09:00');

  useEffect(() => {
    (async () => {
      await ensureDefaultCategories();
      const cats = await getAllCategories();
      setCategories(cats);

      if (mode === 'edit' && id) {
        const [routine, routineTimes] = await Promise.all([
          getRoutineById(id),
          listRoutineTimes(id),
        ]);
        if (routine) {
          setTitle(routine.title);
          setBlock((routine.block as BlockType) || 'morning');
          setDefaultTime(routine.default_time ?? '09:00');
          setCategoryId(routine.category_id ?? null);
          setIsActive(routine.is_active === 1);
          setLocation(routine.location ?? '');
          setNotes(routine.notes ?? '');
        }
        if (routineTimes.length > 0) {
          setUseTimes(true);
          setTimes(routineTimes.filter((t) => t.enabled).map((t) => t.time));
        }
        setLoading(false);
      } else {
        setLoading(false);
      }
    })();
  }, [mode, id]);

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert(t('form.error'), t('form.enterTitle'));
      return;
    }

    const routineId = mode === 'edit' && id ? id : generateId();
    const routine: Routine = {
      id: routineId,
      title: title.trim(),
      block: block === 'none' ? 'morning' : block,
      default_time: defaultTime || '09:00',
      category_id: categoryId ?? undefined,
      is_active: isActive ? 1 : 0,
      location: location.trim() || undefined,
      notes: notes.trim() || undefined,
    };

    try {
      if (mode === 'create') {
        await createRoutine(routine, [{ freq: 'daily' }]);
      } else {
        await updateRoutine(routine);
      }

      if (useTimes && times.length > 0) {
        await setRoutineTimes(routineId, times);
        scheduleRoutineTimeNotifications(routineId, routine.title).catch(() => {});
      } else if (mode === 'edit' && id) {
        await setRoutineTimes(routineId, []);
      }

      debouncedSyncWidgets(localDayKey(new Date()));
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
          placeholder={t('form.routineTitlePlaceholder')}
          placeholderTextColor={colors.textSecondary}
        />

        <Text style={styles.label}>{t('form.blocks')}</Text>
        <View style={styles.blockRow}>
          {BLOCKS.map((b) => (
            <Pressable
              key={b.value}
              style={[styles.blockBtn, block === b.value && styles.blockBtnActive]}
              onPress={() => setBlock(b.value)}>
              <Text
                style={[
                  styles.blockBtnText,
                  block === b.value && styles.blockBtnTextActive,
                ]}>
                {t(b.key)}
              </Text>
            </Pressable>
          ))}
        </View>

        <TimeField
          value={defaultTime}
          onChange={(v) => setDefaultTime(v)}
          label={t('form.defaultTime')}
        />

        <View style={styles.switchRow}>
          <Text style={styles.label}>{t('form.useFixedTimes')}</Text>
          <Switch
            value={useTimes}
            onValueChange={(v) => {
              setUseTimes(v);
              if (!v) setTimes([]);
            }}
            trackColor={{ false: colors.border, true: colors.primary + '80' }}
            thumbColor={useTimes ? colors.primary : '#f4f3f4'}
          />
        </View>

        {useTimes && (
          <View style={styles.timesSection}>
            <Text style={styles.label}>{t('form.dayTimes')}</Text>
            <View style={styles.timesRow}>
              {times.map((t) => (
                <View key={t} style={styles.timeChipWrap}>
                  <Text style={styles.timeChip}>{t}</Text>
                  <Pressable
                    style={styles.timeChipRemove}
                    onPress={() => setTimes((prev) => prev.filter((x) => x !== t))}>
                    <Text style={styles.timeChipRemoveText}>×</Text>
                  </Pressable>
                </View>
              ))}
            </View>
            <Pressable
              style={styles.addTimeBtn}
              onPress={() => {
                setTempTime(times.length ? times[times.length - 1]! : '09:00');
                setShowTimePicker(true);
              }}>
              <Text style={styles.addTimeBtnText}>{t('form.addTime')}</Text>
            </Pressable>
            {showTimePicker && (
              <Modal transparent animationType="fade" visible={showTimePicker}>
                <Pressable style={styles.timePickerOverlay} onPress={() => setShowTimePicker(false)}>
                  <Pressable style={styles.timePickerContent} onPress={(e) => e.stopPropagation()}>
                    <Text style={styles.timePickerTitle}>{t('form.timeLabel')}</Text>
                    <TimeField
                      value={tempTime}
                      onChange={(v) => setTempTime(v)}
                      label=""
                    />
                    <View style={styles.timePickerActions}>
                      <Pressable style={styles.cancelBtn} onPress={() => setShowTimePicker(false)}>
                        <Text style={styles.cancelText}>{t('common.cancel')}</Text>
                      </Pressable>
                      <Pressable
                        style={styles.submitBtn}
                        onPress={() => {
                          const normalized = tempTime.length === 5 ? tempTime : tempTime.padStart(5, '0');
                          if (!times.includes(normalized)) {
                            setTimes((prev) => [...prev, normalized].sort());
                          }
                          setShowTimePicker(false);
                        }}>
                        <Text style={styles.submitText}>{t('common.ok')}</Text>
                      </Pressable>
                    </View>
                  </Pressable>
                </Pressable>
              </Modal>
            )}
          </View>
        )}

        <Text style={styles.label}>{t('form.location')}</Text>
        <TextInput
          style={styles.input}
          value={location}
          onChangeText={setLocation}
          placeholder={t('form.locationPlaceholderRoutine')}
          placeholderTextColor={colors.textSecondary}
        />

        <Text style={styles.label}>{t('form.notes')}</Text>
        <TextInput
          style={[styles.input, styles.notesInput]}
          value={notes}
          onChangeText={setNotes}
          placeholder={t('form.notesPlaceholderRoutine')}
          placeholderTextColor={colors.textSecondary}
          multiline
          numberOfLines={3}
        />

        <View style={styles.switchRow}>
          <Text style={styles.label}>{t('form.active')}</Text>
          <Switch
            value={isActive}
            onValueChange={setIsActive}
            trackColor={{ false: colors.border, true: colors.primary + '80' }}
            thumbColor={isActive ? colors.primary : '#f4f3f4'}
          />
        </View>

        {categories.length > 0 && (
          <>
            <Text style={styles.label}>{t('form.category')}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
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
                  <Text style={styles.catBtnText}>{getCategoryDisplayName(c)}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </>
        )}
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
  notesInput: {
    minHeight: 72,
    textAlignVertical: 'top',
  },
  blockRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  blockBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: colors.card,
  },
  blockBtnActive: {
    backgroundColor: colors.primary + '30',
    borderWidth: 2,
    borderColor: colors.primary,
  },
  blockBtnText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  blockBtnTextActive: {
    color: colors.primary,
    fontWeight: '600',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  catBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: colors.border,
    marginRight: 8,
  },
  catBtnActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '20',
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
  timesSection: {
    marginBottom: 16,
  },
  timesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  timeChipWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary + '20',
    borderRadius: 20,
    paddingLeft: 12,
    paddingRight: 4,
    paddingVertical: 6,
  },
  timeChip: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '600',
  },
  timeChipRemove: {
    padding: 4,
  },
  timeChipRemoveText: {
    fontSize: 18,
    color: colors.textSecondary,
    fontWeight: '700',
  },
  addTimeBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: colors.primary,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  addTimeBtnText: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '600',
  },
  timePickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  timePickerContent: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 320,
  },
  timePickerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 16,
  },
  timePickerActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  submitText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
});
