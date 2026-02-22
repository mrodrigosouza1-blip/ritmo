import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Pressable,
  ScrollView,
  Alert,
} from 'react-native';

import {
  getGoalWeeklyById,
  upsertGoalWeekly,
  deleteGoalWeekly,
} from '@/src/services/goalsWeekly';
import { getAllCategories } from '@/src/services/categories';
import { getCategoryDisplayName } from '@/src/services/categoryDisplay';
import { ensureDefaultCategories } from '@/src/services/categories';
import type { Category, GoalWeekly } from '@/src/types';
import { colors } from '@/src/theme/colors';
import { useLocale } from '@/src/i18n/useLocale';
import { useToast } from '@/src/components/toast';

const MIN_TARGET = 1;
const MAX_TARGET = 50;

interface GoalFormProps {
  mode: 'create' | 'edit';
  id?: string;
  categoryId?: string;
  onClose: () => void;
}

export function GoalForm({ mode, id, categoryId: initialCategoryId, onClose }: GoalFormProps) {
  const { t } = useLocale();
  const { showToast } = useToast();
  const [categoryId, setCategoryId] = useState<string | null>(initialCategoryId ?? null);
  const [targetCount, setTargetCount] = useState(4);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(mode === 'edit');

  useEffect(() => {
    (async () => {
      await ensureDefaultCategories();
      const cats = await getAllCategories();
      setCategories(cats);

      if (mode === 'edit' && id) {
        const goal = await getGoalWeeklyById(id);
        if (goal) {
          setCategoryId(goal.category_id);
          setTargetCount(goal.target_count);
        }
        setLoading(false);
      } else {
        if (initialCategoryId) setCategoryId(initialCategoryId);
        setLoading(false);
      }
    })();
  }, [mode, id, initialCategoryId]);

  const handleSave = async () => {
    if (!categoryId) {
      Alert.alert(t('form.error'), t('form.categoryHint'));
      return;
    }
    if (targetCount < MIN_TARGET || targetCount > MAX_TARGET) {
      Alert.alert(t('form.error'), t('form.targetRange', { min: String(MIN_TARGET), max: String(MAX_TARGET) }));
      return;
    }

    try {
      await upsertGoalWeekly({
        id,
        category_id: categoryId,
        target_count: targetCount,
      });
      showToast({
        message: mode === 'create' ? t('toast.goalCreated') : t('toast.goalUpdated'),
        type: 'success',
      });
      onClose();
    } catch (e) {
      if (__DEV__) console.error(e);
      Alert.alert(t('form.error'), t('form.errorSave'));
    }
  };

  const handleDelete = () => {
    if (!id) return;
    Alert.alert(
      t('form.deleteGoal'),
      t('form.deleteGoalConfirm'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteGoalWeekly(id);
              onClose();
            } catch (e) {
              if (__DEV__) console.error(e);
              Alert.alert(t('form.error'), t('form.errorDelete'));
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <Text style={styles.loadingText}>{t('common.loading')}</Text>
      </View>
    );
  }

  const selectedCategory = categories.find((c) => c.id === categoryId);

  return (
    <ScrollView style={styles.container}>
      <View style={styles.form}>
        <Text style={styles.label}>{t('form.category')}</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catScroll}>
          {categories.map((c) => (
            <Pressable
              key={c.id}
              style={[
                styles.catBtn,
                { borderColor: c.color_hex },
                categoryId === c.id && { backgroundColor: c.color_hex + '30' },
              ]}
              onPress={() => setCategoryId(categoryId === c.id ? null : c.id)}>
              <View style={[styles.catDot, { backgroundColor: c.color_hex }]} />
              <Text style={styles.catBtnText}>{getCategoryDisplayName(c)}</Text>
            </Pressable>
          ))}
        </ScrollView>

        <Text style={styles.label}>{t('form.weeklyGoal')}</Text>
        <View style={styles.stepper}>
          <Pressable
            style={[styles.stepperBtn, targetCount <= MIN_TARGET && styles.stepperBtnDisabled]}
            onPress={() => setTargetCount((v) => Math.max(MIN_TARGET, v - 1))}
            disabled={targetCount <= MIN_TARGET}>
            <Text style={styles.stepperText}>−</Text>
          </Pressable>
          <Text style={styles.targetValue}>{targetCount}</Text>
          <Pressable
            style={[styles.stepperBtn, targetCount >= MAX_TARGET && styles.stepperBtnDisabled]}
            onPress={() => setTargetCount((v) => Math.min(MAX_TARGET, v + 1))}
            disabled={targetCount >= MAX_TARGET}>
            <Text style={styles.stepperText}>+</Text>
          </Pressable>
        </View>
        <Text style={styles.hint}>{t('form.between')} {MIN_TARGET} {t('form.and')} {MAX_TARGET} {t('form.perWeek')}</Text>

        {selectedCategory && (
          <View style={[styles.preview, { borderLeftColor: selectedCategory.color_hex }]}>
            <View style={[styles.previewDot, { backgroundColor: selectedCategory.color_hex }]} />
            <Text style={styles.previewText}>
              {getCategoryDisplayName(selectedCategory)}: {t('templates.perWeek', { n: String(targetCount) })}
            </Text>
          </View>
        )}
      </View>

      {!categoryId && (
        <Text style={styles.disabledHint}>{t('form.categoryHint')}</Text>
      )}
      <View style={styles.buttons}>
        {mode === 'edit' && id && (
          <Pressable style={styles.deleteBtn} onPress={handleDelete}>
            <Text style={styles.deleteText}>{t('common.delete')}</Text>
          </Pressable>
        )}
        <View style={styles.buttonRow}>
          <Pressable style={styles.cancelBtn} onPress={onClose}>
            <Text style={styles.cancelText}>{t('common.cancel')}</Text>
          </Pressable>
          <Pressable
            style={[styles.submitBtn, !categoryId && styles.submitBtnDisabled]}
            onPress={handleSave}
            disabled={!categoryId}>
            <Text style={styles.submitText}>{t('common.save')}</Text>
          </Pressable>
        </View>
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
  catScroll: { marginBottom: 20 },
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
  catDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 6,
  },
  catBtnText: { fontSize: 14, color: colors.text },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 8,
  },
  stepperBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperBtnDisabled: {
    opacity: 0.5,
  },
  stepperText: {
    fontSize: 28,
    color: '#fff',
    fontWeight: '600',
    lineHeight: 32,
  },
  targetValue: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    minWidth: 48,
    textAlign: 'center',
  },
  hint: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 20,
  },
  preview: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: colors.card,
    borderRadius: 12,
    borderLeftWidth: 4,
  },
  previewDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  previewText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  buttons: {
    padding: 16,
  },
  deleteBtn: {
    padding: 12,
    marginBottom: 12,
    alignSelf: 'flex-start',
  },
  deleteText: {
    fontSize: 14,
    color: colors.error,
    fontWeight: '600',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
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
