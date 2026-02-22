import { getDatabase } from '@/src/db/database';
import {
  scheduleNotification,
  cancelNotification,
  DAILY_CHECK_ID,
} from '@/src/services/notifications';
import {
  getNotificationEnabled,
  getSmartBasicEnabled,
  getQuietHoursEnabled,
  getQuietHoursStart,
  getQuietHoursEnd,
} from '@/src/services/notificationSettings';
import { isWithinQuietHours } from '@/src/utils/timeWindow';
import { localDayKey } from '@/src/utils/dateKey';
import { runPremiumIntelligence } from '@/src/services/premiumIntelligence';

/**
 * Agenda ou atualiza a notificação diária das 18h.
 * - Se notification_enabled = false → cancela e não agenda
 * - Se há pelo menos 1 item "done" hoje → não agenda (ou cancela)
 * - Se zero itens done E antes das 18h → agenda para 18h
 *
 * Chamar no app start e ao abrir o app (ex.: useFocusEffect na tela principal).
 */
export async function scheduleDailyCheck(): Promise<void> {
  const [enabled, smartBasic] = await Promise.all([
    getNotificationEnabled(),
    getSmartBasicEnabled(),
  ]);
  if (!enabled || !smartBasic) {
    try {
      await cancelNotification(DAILY_CHECK_ID);
    } catch {
      // ignora
    }
    return;
  }

  const todayIso = localDayKey(new Date());
  const now = new Date();
  const hour = now.getHours();
  const minute = now.getMinutes();

  // Só agenda se for antes das 18h
  if (hour > 18 || (hour === 18 && minute >= 0)) {
    try {
      await cancelNotification(DAILY_CHECK_ID);
    } catch {
      // ignora
    }
    return;
  }

  const db = await getDatabase();
  const row = await db.getFirstAsync<{ cnt: number }>(
    `SELECT COUNT(*) as cnt FROM day_items WHERE date = ? AND status = 'done'`,
    todayIso
  );
  const doneCount = row?.cnt ?? 0;

  if (doneCount > 0) {
    try {
      await cancelNotification(DAILY_CHECK_ID);
    } catch {
      // ignora
    }
    return;
  }

  const [y, m, d] = todayIso.split('-').map(Number);
  const triggerDate = new Date(y!, m! - 1, d!, 18, 0, 0);
  if (triggerDate <= now) return;

  const [quietEnabled, quietStart, quietEnd] = await Promise.all([
    getQuietHoursEnabled(),
    getQuietHoursStart(),
    getQuietHoursEnd(),
  ]);
  if (quietEnabled && isWithinQuietHours('18:00', quietStart, quietEnd)) return;

  try {
    await cancelNotification(DAILY_CHECK_ID);
  } catch {
    // ignora
  }

  await scheduleNotification(
    DAILY_CHECK_ID,
    'Ritmo',
    'Você ainda não realizou nada hoje no Ritmo.',
    triggerDate
  );

  runPremiumIntelligence(todayIso).catch(() => {});
}
