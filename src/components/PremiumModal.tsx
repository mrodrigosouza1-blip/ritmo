import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  Modal,
  Pressable,
  ScrollView,
} from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';

import { colors } from '@/src/theme/colors';
import { useLocale } from '@/src/i18n/useLocale';

interface PremiumModalProps {
  visible: boolean;
  onClose: () => void;
  /** Mensagem opcional (ex: "Limite do plano gratuito atingido") */
  message?: string;
}

export function PremiumModal({ visible, onClose, message }: PremiumModalProps) {
  const { t } = useLocale();
  const benefits = [
    t('premium.benefit1'),
    t('premium.benefit2'),
    t('premium.benefit3'),
    t('premium.benefit4'),
  ];
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.content} onPress={(e) => e.stopPropagation()}>
          <View style={styles.iconWrap}>
            <FontAwesome name="star" size={32} color={colors.primary} />
          </View>
          <Text style={styles.title}>{t('premium.modalTitle')}</Text>
          {message ? (
            <Text style={styles.message}>{message}</Text>
          ) : (
            <Text style={styles.subtitle}>{t('premium.modalSubtitle')}</Text>
          )}

          <ScrollView
            style={styles.benefitsList}
            showsVerticalScrollIndicator={false}>
            {benefits.map((b, i) => (
              <View key={i} style={styles.benefitRow}>
                <FontAwesome
                  name="check-circle"
                  size={18}
                  color={colors.success}
                  style={styles.benefitIcon}
                />
                <Text style={styles.benefitText}>{b}</Text>
              </View>
            ))}
          </ScrollView>

          <View style={styles.buttons}>
            <Pressable
              style={styles.primaryBtn}
              onPress={() => {
                onClose();
                // TODO: navegar para tela de planos (Stripe / StoreKit)
              }}>
              <Text style={styles.primaryBtnText}>{t('premium.viewPlans')}</Text>
            </Pressable>
            <Pressable style={styles.secondaryBtn} onPress={onClose}>
              <Text style={styles.secondaryBtnText}>{t('premium.notNow')}</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  content: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 340,
  },
  iconWrap: {
    alignSelf: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
  },
  message: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 8,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 8,
  },
  benefitsList: {
    marginTop: 20,
    maxHeight: 160,
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  benefitIcon: {
    marginRight: 12,
  },
  benefitText: {
    fontSize: 15,
    color: colors.text,
    flex: 1,
  },
  buttons: {
    marginTop: 24,
    gap: 12,
  },
  primaryBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  primaryBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  secondaryBtn: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  secondaryBtnText: {
    fontSize: 15,
    color: colors.textSecondary,
  },
});
