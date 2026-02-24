import React, { useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Modal,
  Pressable,
  Animated,
} from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';

import { colors } from '@/src/theme/colors';
import { useLocale } from '@/src/i18n/useLocale';
import type { Achievement } from '@/src/services/achievements';

interface AchievementUnlockedModalProps {
  visible: boolean;
  achievement: Achievement | null;
  onClose: () => void;
}

export function AchievementUnlockedModal({
  visible,
  achievement,
  onClose,
}: AchievementUnlockedModalProps) {
  const { t } = useLocale();
  const scaleAnim = useRef(new Animated.Value(0.95)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible && achievement) {
      scaleAnim.setValue(0.95);
      opacityAnim.setValue(0);
      Animated.parallel([
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          useNativeDriver: true,
          damping: 15,
          stiffness: 150,
        }),
      ]).start();
    }
  }, [visible, achievement, scaleAnim, opacityAnim]);

  if (!achievement) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Animated.View
          style={[
            styles.content,
            {
              opacity: opacityAnim,
              transform: [{ scale: scaleAnim }],
            },
          ]}>
          <Pressable onPress={(e) => e.stopPropagation()}>
            <View style={styles.iconWrap}>
              <FontAwesome
                name="trophy"
                size={44}
                color={colors.primary}
              />
            </View>
            <Text style={styles.title}>{achievement.title}</Text>
            <Text style={styles.description}>{achievement.description}</Text>
            <Pressable style={styles.continueBtn} onPress={onClose}>
              <Text style={styles.continueBtnText}>{t('achievements.continue')}</Text>
            </Pressable>
          </Pressable>
        </Animated.View>
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
    padding: 28,
    width: '100%',
    maxWidth: 320,
  },
  iconWrap: {
    alignSelf: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
  },
  description: {
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 22,
  },
  continueBtn: {
    marginTop: 24,
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  continueBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});
