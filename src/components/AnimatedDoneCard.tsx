import React, { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, ViewStyle } from 'react-native';

interface AnimatedDoneCardProps {
  done: boolean;
  children: React.ReactNode;
  onPress: () => void;
  style?: ViewStyle;
}

export function AnimatedDoneCard({
  done,
  children,
  onPress,
  style,
}: AnimatedDoneCardProps) {
  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(1)).current;
  const prevDone = useRef(done);

  useEffect(() => {
    if (!prevDone.current && done) {
      prevDone.current = true;
      Animated.sequence([
        Animated.parallel([
          Animated.timing(scale, {
            toValue: 0.98,
            duration: 60,
            useNativeDriver: true,
          }),
          Animated.timing(opacity, {
            toValue: 0.85,
            duration: 60,
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(scale, {
            toValue: 1,
            duration: 100,
            useNativeDriver: true,
          }),
          Animated.timing(opacity, {
            toValue: 0.7,
            duration: 100,
            useNativeDriver: true,
          }),
        ]),
      ]).start();
    } else if (prevDone.current && !done) {
      prevDone.current = false;
      Animated.parallel([
        Animated.timing(scale, { toValue: 1, duration: 150, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1, duration: 150, useNativeDriver: true }),
      ]).start();
    } else {
      prevDone.current = done;
      if (done) {
        opacity.setValue(0.7);
      } else {
        scale.setValue(1);
        opacity.setValue(1);
      }
    }
  }, [done, scale, opacity]);

  const scalePress = useRef(new Animated.Value(1)).current;

  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => {
        Animated.spring(scalePress, {
          toValue: 0.98,
          useNativeDriver: true,
          speed: 50,
          bounciness: 0,
        }).start();
      }}
      onPressOut={() => {
        Animated.spring(scalePress, {
          toValue: 1,
          useNativeDriver: true,
          speed: 50,
          bounciness: 4,
        }).start();
      }}>
      <Animated.View
        style={[
          styles.card,
          style,
          {
            transform: [{ scale: Animated.multiply(scale, scalePress) }],
            opacity,
          },
        ]}>
        {children}
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {},
});
