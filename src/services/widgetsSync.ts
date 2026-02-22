import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { generateDayItems } from '@/src/features/today/generateDayItems';
import { syncWidgetSnapshot } from '@/src/widgets/useWidgetSync';
import { localDayKey } from '@/src/utils/dateKey';

export interface WidgetsTodaySnapshot {
  updated_at: number;
  /** YYYY-MM-DD para checar se snapshot é do dia atual */
  snapshotDate: string;
  total: number;
  done: number;
  byType: { events: number; routines: number; tasks: number };
  topCategories: Array<{ name: string; color_hex: string; count: number }>;
}

export interface WidgetsNextEventSnapshot {
  title: string;
  start_at: string;
  category_name?: string;
  color_hex?: string;
  location?: string;
}

export interface WidgetsSnapshot {
  updated_at: number;
  snapshotDate: string;
  today: Omit<WidgetsTodaySnapshot, 'updated_at' | 'snapshotDate'>;
  nextEvent: WidgetsNextEventSnapshot | null;
}

const WIDGET_TODAY = 'RitmoTodayWidget';
const WIDGET_NEXT = 'RitmoNextWidget';

let _syncDebounceTimer: ReturnType<typeof setTimeout> | null = null;
const DEBOUNCE_MS = 300;

function buildTopCategories(
  items: Awaited<ReturnType<typeof generateDayItems>>
): WidgetsTodaySnapshot['topCategories'] {
  const byCat = new Map<string, { name: string; color_hex: string; count: number }>();
  for (const it of items) {
    if (it.category_id && it.category_name && it.color_hex) {
      const cur = byCat.get(it.category_id);
      if (cur) {
        cur.count += 1;
      } else {
        byCat.set(it.category_id, {
          name: it.category_name,
          color_hex: it.color_hex,
          count: 1,
        });
      }
    }
  }
  return [...byCat.values()]
    .sort((a, b) => b.count - a.count)
    .slice(0, 3);
}

/**
 * Sincroniza o snapshot dos widgets para a data informada.
 * Grava via API do expo-widgets (App Group) e solicita reload.
 * Só roda em iOS; em Android/Expo Go falha silenciosamente.
 */
export async function syncWidgetsSnapshotForDate(dateIso: string): Promise<void> {
  if (Platform.OS !== 'ios') return;
  if (Constants.executionEnvironment === 'storeClient') return; // Expo Go

  try {
    const dateOnly = dateIso.includes('T') ? dateIso.split('T')[0]! : dateIso;
    const items = await generateDayItems(dateOnly);

    const events = items.filter((i) => i.source_type === 'event');
    const routines = items.filter((i) => i.source_type === 'routine');
    const tasks = items.filter((i) => i.source_type === 'task');

    const total = items.length;
    const done = items.filter((i) => i.status === 'done').length;
    const topCategories = buildTopCategories(items);

    const now = Date.now();

    // Próximo compromisso: primeiro pendente com start_at >= agora
    const todayLocal = localDayKey(new Date());
    const nowMinutes =
      new Date().getHours() * 60 + new Date().getMinutes();

    let nextEvent: WidgetsNextEventSnapshot | null = null;
    const pending = items
      .filter((i) => i.status === 'pending')
      .sort((a, b) => {
        const timeA = a.start_at ?? '00:00';
        const timeB = b.start_at ?? '00:00';
        return timeA.localeCompare(timeB);
      });

    for (const it of pending) {
      const t = it.start_at ?? '00:00';
      const [h, m] = t.split(':').map(Number);
      const itemMinutes = h * 60 + m;
      if (dateOnly === todayLocal && itemMinutes < nowMinutes) continue;
      nextEvent = {
        title: it.title,
        start_at: t.slice(0, 5),
        category_name: it.category_name,
        color_hex: it.color_hex,
        location: it.location?.trim() || undefined,
      };
      break;
    }

    const todayProps: WidgetsTodaySnapshot = {
      updated_at: now,
      snapshotDate: dateOnly,
      total,
      done,
      byType: {
        events: events.length,
        routines: routines.length,
        tasks: tasks.length,
      },
      topCategories,
    };

    const nextProps = {
      updated_at: now,
      snapshotDate: dateOnly,
      nextEvent,
    };

    const { updateWidgetSnapshot } = await import('expo-widgets');
    updateWidgetSnapshot(WIDGET_TODAY, todayProps);
    updateWidgetSnapshot(WIDGET_NEXT, nextProps);
  } catch (e) {
    if (__DEV__) {
      console.warn('[widgetsSync] sync failed:', e);
    }
  }
}

/**
 * Sincroniza com debounce de 300ms.
 * - iOS (não Expo Go): atualiza expo-widgets.
 * - Sempre: atualiza snapshot em storage para preview e futura integração com widget nativo.
 */
export function debouncedSyncWidgets(dateIso: string): void {
  if (_syncDebounceTimer) clearTimeout(_syncDebounceTimer);
  _syncDebounceTimer = setTimeout(() => {
    _syncDebounceTimer = null;
    if (Platform.OS === 'ios' && Constants.executionEnvironment !== 'storeClient') {
      syncWidgetsSnapshotForDate(dateIso).catch(() => {});
    }
    syncWidgetSnapshot().catch(() => {});
  }, DEBOUNCE_MS);
}
