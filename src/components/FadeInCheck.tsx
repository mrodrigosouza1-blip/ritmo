import React, { useEffect, useRef } from 'react';
import { Animated, ViewStyle } from 'react-native';

interface FadeInCheckProps {
  visible: boolean;
  children: React.ReactNode;
  style?: ViewStyle;
}

export function FadeInCheck({ visible, children, style }: FadeInCheckProps) {
  const opacity = useRef(new Animated.Value(0)).current;
  const prevVisible = useRef(visible);

  useEffect(() => {
    if (visible && !prevVisible.current) {
      prevVisible.current = true;
      Animated.timing(opacity, {
        toValue: 1,
        duration: 180,
        useNativeDriver: true,
      }).start();
    } else if (!visible) {
      prevVisible.current = false;
      opacity.setValue(0);
    }
  }, [visible, opacity]);

  if (!visible) return null;

  return (
    <Animated.View style={[style, { opacity }]}>
      {children}
    </Animated.View>
  );
}
