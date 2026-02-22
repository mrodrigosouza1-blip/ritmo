import React, { useEffect } from 'react';
import { Animated, StyleSheet, Text } from 'react-native';

import { colors } from '@/src/theme/colors';

export type ToastType = 'success' | 'info' | 'error';

interface ToastViewProps {
  message: string;
  type?: ToastType;
  visible: boolean;
  onHide: () => void;
}

const TYPE_COLORS: Record<ToastType, string> = {
  success: colors.success,
  info: colors.primary,
  error: colors.error,
};

export function ToastView({
  message,
  type = 'info',
  visible,
  onHide,
}: ToastViewProps) {
  const opacity = React.useRef(new Animated.Value(0)).current;
  const scale = React.useRef(new Animated.Value(0.95)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(scale, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(scale, {
          toValue: 0.95,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, opacity, scale]);

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        { borderLeftColor: TYPE_COLORS[type] },
        {
          opacity,
          transform: [{ scale }],
        },
      ]}
      pointerEvents="none">
      <Text style={styles.message} numberOfLines={2}>
        {message}
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    maxWidth: 340,
    width: '90%',
    backgroundColor: colors.card,
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 6,
  },
  message: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
    textAlign: 'center',
  },
});
