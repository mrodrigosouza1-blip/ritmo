import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import Constants from 'expo-constants';
import { useEffect, useState } from 'react';
import { Platform, AppState, type AppStateStatus } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import 'react-native-reanimated';

import { ToastProvider } from '@/src/components/toast';
import { getDatabase } from '@/src/db/database';
import { getOnboardingCompleted } from '@/src/services/onboardingStorage';
import { setupNotifications } from '@/src/services/notifications';
import { scheduleDailyCheck } from '@/src/services/dailyCheck';
import { runPremiumIntelligence } from '@/src/services/premiumIntelligence';
import { syncWidgetsSnapshotForDate } from '@/src/services/widgetsSync';
import { syncWidgetSnapshot } from '@/src/widgets/useWidgetSync';
import { localDayKey } from '@/src/utils/dateKey';
import { initLocale } from '@/src/i18n';
import { useLocale } from '@/src/i18n/useLocale';

export { ErrorBoundary } from 'expo-router';

export const unstable_settings = {
  initialRouteName: '(tabs)',
};

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const { t } = useLocale();
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    ...FontAwesome.font,
  });
  const [dbReady, setDbReady] = useState(false);
  const [onboardingChecked, setOnboardingChecked] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(true);

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    getDatabase()
      .then(() => setDbReady(true))
      .catch((e) => { if (__DEV__) console.error(e); });
    setupNotifications().catch((e) => { if (__DEV__) console.error(e); });
  }, []);

  useEffect(() => {
    if (!dbReady) return;
    initLocale().catch(() => {});
  }, [dbReady]);

  useEffect(() => {
    if (!dbReady) return;
    const todayIso = localDayKey(new Date());
    scheduleDailyCheck().catch(() => {});
    runPremiumIntelligence(todayIso).catch(() => {});
    const sub = AppState.addEventListener('change', (state: AppStateStatus) => {
      if (state === 'active') {
        scheduleDailyCheck().catch(() => {});
        runPremiumIntelligence(localDayKey(new Date())).catch(() => {});
      }
    });
    return () => sub.remove();
  }, [dbReady]);

  useEffect(() => {
    if (!dbReady) return;
    getOnboardingCompleted()
      .then((completed) => {
        setOnboardingChecked(true);
        setShowOnboarding(!completed);
      })
      .catch(() => {
        setOnboardingChecked(true);
        setShowOnboarding(false);
      });
  }, [dbReady]);

  // Widgets (expo-widgets + @expo/ui) só existem em Development Build, não no Expo Go
  const isExpoGo = Constants.executionEnvironment === 'storeClient';
  useEffect(() => {
    if (Platform.OS !== 'ios' || isExpoGo) return;
    import('@/src/widgets/RitmoWidgets').catch(() => {});
  }, [isExpoGo]);

  useEffect(() => {
    if (!dbReady) return;
    if (!isExpoGo) {
      syncWidgetsSnapshotForDate(localDayKey(new Date())).catch(() => {});
    }
    syncWidgetSnapshot().catch(() => {});
  }, [dbReady, isExpoGo]);

  useEffect(() => {
    if (loaded && dbReady && onboardingChecked) {
      SplashScreen.hideAsync();
    }
  }, [loaded, dbReady, onboardingChecked]);

  const ready = loaded && dbReady && onboardingChecked;

  return (
    <SafeAreaProvider>
      <ToastProvider>
        {!ready ? null : (
        <Stack
          initialRouteName={showOnboarding ? 'onboarding' : '(tabs)'}
          screenOptions={{
            headerStyle: { backgroundColor: '#F5F5F5' },
            headerTintColor: '#212121',
            headerBackTitle: t('common.back'),
          }}>
      <Stack.Screen name="onboarding" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen
        name="day"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="edit/task/[id]"
        options={{
          title: t('modal.editTask'),
          headerShown: true,
        }}
      />
      <Stack.Screen
        name="summary"
        options={{
          title: t('summary.title'),
          headerShown: true,
        }}
      />
      <Stack.Screen
        name="templates"
        options={{
          title: t('templates.title'),
          headerShown: true,
        }}
      />
      <Stack.Screen name="settings" options={{ headerShown: false }} />
      <Stack.Screen
        name="modal"
        options={{
          presentation: 'modal',
          headerShown: false,
        }}
      />
        </Stack>
        )}
      </ToastProvider>
    </SafeAreaProvider>
  );
}
