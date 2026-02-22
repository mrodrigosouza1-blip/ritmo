import React from 'react';
import { Stack, router } from 'expo-router';
import { Pressable, Text } from 'react-native';

import { colors } from '@/src/theme/colors';
import { useLocale } from '@/src/i18n/useLocale';

function CloseButton() {
  const { t } = useLocale();
  return (
    <Pressable onPress={() => router.back()} style={{ padding: 8, marginRight: 4 }}>
      <Text style={{ fontSize: 16, color: colors.primary, fontWeight: '600' }}>{t('common.close')}</Text>
    </Pressable>
  );
}

export default function ModalLayout() {
  const { t } = useLocale();
  return (
    <Stack
      screenOptions={{
        presentation: 'modal',
        headerStyle: { backgroundColor: '#F5F5F5' },
        headerTintColor: '#212121',
        headerRight: () => <CloseButton />,
      }}>
      <Stack.Screen name="event" options={{ title: t('modal.titleEvent') }} />
      <Stack.Screen name="routine" options={{ title: t('modal.titleRoutine') }} />
      <Stack.Screen name="task" options={{ title: t('modal.titleTask') }} />
      <Stack.Screen name="goal" options={{ title: t('modal.titleGoal') }} />
      <Stack.Screen name="reschedule" options={{ title: t('modal.titleReschedule') }} />
    </Stack>
  );
}
