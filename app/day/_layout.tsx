import { Stack } from 'expo-router';
import { useLocale } from '@/src/i18n/useLocale';

export default function DayLayout() {
  const { t } = useLocale();
  return (
    <Stack
      screenOptions={{
        title: t('modal.titleDay'),
        headerBackTitle: t('common.back'),
        headerShown: true,
        headerStyle: { backgroundColor: '#F5F5F5' },
        headerTintColor: '#212121',
      }}>
      <Stack.Screen name="[date]" options={{ title: t('modal.titleDay') }} />
    </Stack>
  );
}
