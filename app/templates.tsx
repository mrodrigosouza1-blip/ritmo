import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  Pressable,
  Modal,
  Alert,
} from 'react-native';
import { router } from 'expo-router';

import { ROUTINE_TEMPLATES, type RoutineTemplate } from '@/src/data/templates';
import { applyTemplate, isTemplateAlreadyApplied } from '@/src/services/templates';
import { getSubscriptionStatus } from '@/src/services/subscription';
import { PremiumModal } from '@/src/components/PremiumModal';
import { debouncedSyncWidgets } from '@/src/services/widgetsSync';
import { localDayKey } from '@/src/utils/dateKey';
import { t } from '@/src/i18n';
import { useLocale } from '@/src/i18n/useLocale';
import { formatFrequency } from '@/src/utils/formatFrequency';
import { colors } from '@/src/theme/colors';

export default function TemplatesScreen() {
  const { t } = useLocale();
  const [detailTemplate, setDetailTemplate] = useState<RoutineTemplate | null>(null);
  const [applying, setApplying] = useState<string | null>(null);
  const [isPremium, setIsPremium] = useState(false);
  const [showPremiumModal, setShowPremiumModal] = useState(false);

  useEffect(() => {
    getSubscriptionStatus().then((s) => setIsPremium(s.isPremium));
  }, []);

  const handleApply = async (template: RoutineTemplate) => {
    if (!isPremium) {
      const alreadyApplied = await isTemplateAlreadyApplied(template.id);
      if (alreadyApplied) {
        setShowPremiumModal(true);
        return;
      }
    }

    const routineCount = template.routines.length;
    const goalCount = template.goals?.length ?? 0;
    const msg =
      goalCount > 0
        ? t('templates.applyConfirmMessage', { count: String(routineCount), goalCount: String(goalCount) })
        : t('templates.applyConfirmMessageNoGoals', { count: String(routineCount) });

    Alert.alert(
      t('templates.applyConfirmTitle') + ` "${t(template.nameKey)}"?`,
      msg,
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('templates.applyConfirm'),
          onPress: async () => {
            setApplying(template.id);
            try {
              const result = await applyTemplate(template.id);
              debouncedSyncWidgets(localDayKey(new Date()));
              const parts: string[] = [];
              if (result.created > 0) {
                parts.push(t('templates.appliedCreated', { n: String(result.created) }));
              }
              if (result.skipped > 0) {
                parts.push(t('templates.appliedSkipped', { n: String(result.skipped) }));
              }
              if (result.createdGoals > 0) {
                parts.push(t('templates.appliedGoals', { n: String(result.createdGoals) }));
              }
              Alert.alert(
                t('templates.applied'),
                parts.length ? parts.join(', ') + '.' : t('templates.noChanges')
              );
              router.back();
            } catch (e) {
              if (__DEV__) console.error(e);
              Alert.alert(t('form.error'), t('toast.templateError'));
            } finally {
              setApplying(null);
            }
          },
        },
      ]
    );
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('templates.title')}</Text>
        <Text style={styles.subtitle}>{t('templates.subtitle')}</Text>
      </View>

      {ROUTINE_TEMPLATES.map((template) => (
        <View
          key={template.id}
          style={[styles.card, { borderLeftColor: template.color_hex ?? colors.primary }]}>
          <Text style={styles.cardName}>{t(template.nameKey)}</Text>
          <Text style={styles.cardDesc}>{t(template.descriptionKey)}</Text>
          <View style={styles.cardActions}>
            <Pressable
              style={styles.verBtn}
              onPress={() => setDetailTemplate(template)}>
              <Text style={styles.verBtnText}>{t('templates.viewItems')}</Text>
            </Pressable>
            <Pressable
              style={[styles.applyBtn, applying === template.id && styles.applyBtnDisabled]}
              onPress={() => handleApply(template)}
              disabled={!!applying}>
              <Text style={styles.applyBtnText}>
                {applying === template.id ? t('templates.applying') : t('templates.apply')}
              </Text>
            </Pressable>
          </View>
        </View>
      ))}

      <Modal
        visible={!!detailTemplate}
        transparent
        animationType="fade"
        onRequestClose={() => setDetailTemplate(null)}>
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setDetailTemplate(null)}>
          <Pressable
            style={styles.modalContent}
            onPress={(e) => e.stopPropagation()}>
            {detailTemplate && (
              <>
                <View
                  style={[
                    styles.modalHeader,
                    { borderLeftColor: detailTemplate.color_hex ?? colors.primary },
                  ]}>
                  <Text style={styles.modalTitle}>{t(detailTemplate.nameKey)}</Text>
                  <Text style={styles.modalSubtitle}>{t(detailTemplate.descriptionKey)}</Text>
                </View>
                <ScrollView style={styles.modalList}>
                  {detailTemplate.routines.map((r, i) => (
                    <View key={i} style={styles.itemRow}>
                      <View
                        style={[
                          styles.itemDot,
                          { backgroundColor: r.category.color_hex },
                        ]}
                      />
                      <View style={styles.itemText}>
                        <Text style={styles.itemTitle}>{t(r.titleKey)}</Text>
                        <Text style={styles.itemMeta}>
                          {t(r.block === 'none' ? 'calendar.none' : `calendar.${r.block}`)} • {t(`category.${r.category.slug}`)} • {formatFrequency(r.rule)}
                        </Text>
                      </View>
                    </View>
                  ))}
                  {detailTemplate.goals?.length ? (
                    <View style={styles.goalsSection}>
                      <Text style={styles.goalsTitle}>{t('templates.goals')}</Text>
                      {detailTemplate.goals.map((g, i) => (
                        <Text key={i} style={styles.goalItem}>
                          • {t(`category.${g.categorySlug}`)}: {t('templates.perWeek', { n: String(g.target_count) })}
                        </Text>
                      ))}
                    </View>
                  ) : null}
                </ScrollView>
                <Pressable
                  style={styles.modalClose}
                  onPress={() => setDetailTemplate(null)}>
                  <Text style={styles.modalCloseText}>{t('common.close')}</Text>
                </Pressable>
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>

      <PremiumModal
        visible={showPremiumModal}
        onClose={() => setShowPremiumModal(false)}
        message={t('templates.premiumApplyAgain')}
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
    marginTop: 6,
  },
  card: {
    backgroundColor: colors.card,
    marginHorizontal: 16,
    marginTop: 12,
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
  },
  cardName: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  cardDesc: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 6,
  },
  cardActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 14,
  },
  verBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: colors.border,
    borderRadius: 8,
  },
  verBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  applyBtn: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: colors.primary,
    borderRadius: 8,
  },
  applyBtnDisabled: {
    opacity: 0.6,
  },
  applyBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 20,
    width: '100%',
    maxWidth: 360,
    maxHeight: '80%',
  },
  modalHeader: {
    paddingBottom: 12,
    borderLeftWidth: 4,
    paddingLeft: 12,
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  modalSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 4,
  },
  modalList: {
    maxHeight: 320,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  itemDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 12,
  },
  itemText: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  itemMeta: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  goalsSection: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  goalsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  goalItem: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  modalClose: {
    marginTop: 16,
    padding: 12,
    alignSelf: 'flex-end',
  },
  modalCloseText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary,
  },
});
