import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  Alert,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { closeOrNavigateBack } from '@/src/utils/navigation';

import { getTaskById, updateTask } from '@/src/services/tasks';
import { debouncedSyncWidgets } from '@/src/services/widgetsSync';
import { localDayKey } from '@/src/utils/dateKey';
import { DateField } from '@/src/components/DateField';
import type { Task } from '@/src/types';
import { colors } from '@/src/theme/colors';
import { useLocale } from '@/src/i18n/useLocale';

export default function EditTaskScreen() {
  const { t } = useLocale();
  const { id } = useLocalSearchParams<{ id: string }>();
  const taskId = typeof id === 'string' ? id : '';

  const [title, setTitle] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [dueTime, setDueTime] = useState('09:00');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      if (!taskId) return;
      const task = await getTaskById(taskId);
      if (task) {
        setTitle(task.title);
        setDueDate(task.due_date ?? task.due_at?.split('T')[0] ?? '');
        setDueTime(task.due_at?.slice(11, 16) ?? '09:00');
      }
      setLoading(false);
    })();
  }, [taskId]);

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert(t('form.error'), t('form.enterTitle'));
      return;
    }
    const dueAt = dueDate ? `${dueDate}T${dueTime}:00` : undefined;

    try {
      const task: Task = {
        id: taskId,
        title: title.trim(),
        due_at: dueAt,
        due_date: dueDate || undefined,
      };
      await updateTask(task);
      debouncedSyncWidgets(localDayKey(new Date()));
      closeOrNavigateBack();
    } catch (e) {
      if (__DEV__) console.error(e);
      Alert.alert(t('form.error'), t('form.errorSave'));
    }
  };

  if (!taskId || loading) {
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
          placeholder={t('form.taskTitle')}
          placeholderTextColor={colors.textSecondary}
        />
        <DateField value={dueDate} onChange={setDueDate} label={t('form.date')} />
        <Text style={styles.label}>{t('form.timeLabel')}</Text>
        <TextInput
          style={styles.input}
          value={dueTime}
          onChangeText={setDueTime}
          placeholder="09:00"
          placeholderTextColor={colors.textSecondary}
        />
      </View>
      <Pressable style={styles.submitBtn} onPress={handleSave}>
        <Text style={styles.submitText}>{t('common.save')}</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
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
  submitBtn: {
    margin: 16,
    padding: 16,
    backgroundColor: colors.primary,
    borderRadius: 12,
  },
  submitText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
});
