import {
  buildWidgetSnapshot,
  saveWidgetSnapshot,
} from '@/src/widgets/widgetService';

/**
 * Atualiza o snapshot do widget e persiste no storage.
 * Chamar após criar/editar/deletar compromisso, rotina, tarefa;
 * após toggle done; no app start; ao aplicar templates.
 * Silencioso (try/catch).
 */
export async function syncWidgetSnapshot(): Promise<void> {
  try {
    const snapshot = await buildWidgetSnapshot();
    await saveWidgetSnapshot(snapshot);
  } catch (e) {
    if (__DEV__) {
      console.warn('[useWidgetSync] sync failed:', e);
    }
  }
}
