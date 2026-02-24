import { syncWidgetSnapshot } from '@/src/widgets/useWidgetSync';

let _syncDebounceTimer: ReturnType<typeof setTimeout> | null = null;
const DEBOUNCE_MS = 300;

/**
 * Sincroniza com debounce de 300ms.
 * - iOS/Android (não Expo Go): atualiza widget nativo via ritmo-widget-bridge.
 * - Sempre: atualiza snapshot em storage para preview.
 */
export function debouncedSyncWidgets(dateIso: string): void {
  if (_syncDebounceTimer) clearTimeout(_syncDebounceTimer);
  _syncDebounceTimer = setTimeout(() => {
    _syncDebounceTimer = null;
    syncWidgetSnapshot().catch(() => {});
  }, DEBOUNCE_MS);
}
