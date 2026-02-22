import React from 'react';
import { Stack } from 'expo-router';

export default function OnboardingLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        gestureEnabled: false,
      }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="templates" />
      <Stack.Screen name="notifications" />
    </Stack>
  );
}
