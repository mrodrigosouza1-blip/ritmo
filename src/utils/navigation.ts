import { router } from 'expo-router';

/**
 * Fecha modal/tela atual. Usa back() se possível, senão replace para tabs.
 * Evita erro "GO_BACK was not handled" quando não há tela anterior.
 */
export function closeOrNavigateBack(): void {
  try {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)');
    }
  } catch {
    router.replace('/(tabs)');
  }
}
