import { Stack } from 'expo-router';
import { useLocale } from '@/src/i18n/useLocale';

export default function SettingsLayout() {
  const { t } = useLocale();
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: '#F5F5F5' },
        headerTintColor: '#212121',
        headerBackTitle: t('common.back'),
      }}
    />
  );
}
