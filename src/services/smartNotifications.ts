import { generateDayItems } from '@/src/features/today/generateDayItems';
import { getRoutinesWithTimesForDay } from '@/src/features/today/generateDayItems';
import { getStreakCurrent, getStreakBest } from '@/src/services/premiumIntelligenceStorage';
import { getWeekRangeISO } from '@/src/utils/weekRange';
import { listGoalsWeekly } from '@/src/services/goalsWeekly';
import { getWeeklyDoneCountsByCategory } from '@/src/services/goalsProgress';
import { canSendSmart, recordSmartSent, SMART_KEYS } from '@/src/services/notificationsLog';
import { scheduleNotification, cancelNotification } from '@/src/services/notifications';
import {
  getNotificationEnabled,
  getSmartPremiumEnabled,
  getSmartFrequency,
  getQuietHoursEnabled,
  getQuietHoursStart,
  getQuietHoursEnd,
  getSmartDefaultHour,
  type SmartFrequency,
} from '@/src/services/notificationSettings';
import { getSubscriptionStatus } from '@/src/services/subscription';
import { isWithinQuietHours } from '@/src/utils/timeWindow';
import { t } from '@/src/i18n';

export const SMART_NOTIFICATION_ID = 'ritmo-smart-daily';

export type SmartRuleId = 'near_complete' | 'streak_record' | 'week_goal' | null;

export interface SmartRuleResult {
  ruleId: SmartRuleId;
  title: string;
  body: string;
  key: keyof typeof SMART_KEYS;
}

/**
 * Avalia as regras na ordem de prioridade e retorna a primeira que aplicar.
 */
export async function evaluateSmartRules(todayIso: string): Promise<SmartRuleResult | null> {
  const [items, routinesWithTimes] = await Promise.all([
    generateDayItems(todayIso),
    getRoutinesWithTimesForDay(todayIso),
  ]);

  let totalItems = items.length;
  let doneItems = items.filter((i) => i.status === 'done').length;
  for (const rwt of routinesWithTimes) {
    for (const drt of rwt.dayRoutineTimes) {
      totalItems += 1;
      if (drt.status === 'done') doneItems += 1;
    }
  }

  const pendingItems = totalItems - doneItems;

  // A) Perto de concluir o dia (prioridade máxima)
  if (totalItems > 0 && pendingItems > 0 && pendingItems <= 2) {
    return {
      ruleId: 'near_complete',
      title: t('smartNotif.nearCompleteTitle'),
      body: t('smartNotif.nearCompleteBody'),
      key: 'daily_nudge',
    };
  }

  // B) Recorde de streak
  const [streak, best] = await Promise.all([
    getStreakCurrent(),
    getStreakBest(),
  ]);
  if (best > 0 && streak === best - 1) {
    return {
      ruleId: 'streak_record',
      title: t('smartNotif.streakRecordTitle'),
      body: t('smartNotif.streakRecordBody'),
      key: 'streak_warning',
    };
  }

  // C) Meta semanal quase lá
  const { start: weekStart, end: weekEnd } = getWeekRangeISO(
    new Date(todayIso + 'T12:00:00')
  );
  const goals = await listGoalsWeekly();
  const doneByCat = await getWeeklyDoneCountsByCategory(weekStart, weekEnd);

  const now = new Date(todayIso + 'T12:00:00');
  const weekEndDate = new Date(weekEnd + 'T23:59:59');
  const daysLeftInWeek = Math.ceil(
    (weekEndDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)
  );

  if (daysLeftInWeek <= 1 && goals.length > 0) {
    let goalsMissingByOne = 0;
    for (const g of goals) {
      const count = doneByCat.get(g.category_id) ?? 0;
      if (count === g.target_count - 1) goalsMissingByOne += 1;
    }
    if (goalsMissingByOne > 0) {
      return {
        ruleId: 'week_goal',
        title: t('smartNotif.weekGoalTitle'),
        body: t('smartNotif.weekGoalBody'),
        key: 'week_goal_reminder',
      };
    }
  }

  return null;
}

/**
 * Verifica se deve enviar (frequency + only_near_goal).
 */
function shouldSendByFrequency(
  result: SmartRuleResult | null,
  frequency: SmartFrequency
): boolean {
  if (frequency === 'never') return false;
  if (frequency === 'once_per_day') return result !== null;
  if (frequency === 'only_near_goal') {
    return result !== null && result.ruleId === 'week_goal';
  }
  return false;
}

/**
 * Encontra o próximo horário permitido (fora de quiet hours).
 * Se o horário padrão cai nas quiet hours, retorna o fim da janela.
 */
function nextAllowedTime(
  defaultHHmm: string,
  quietEnabled: boolean,
  quietStart: string,
  quietEnd: string
): string {
  if (!quietEnabled) return defaultHHmm;
  if (!isWithinQuietHours(defaultHHmm, quietStart, quietEnd)) return defaultHHmm;
  return quietEnd;
}

/**
 * Agenda a notificação inteligente diária.
 * Chamar ao abrir o app e ao aplicar config.
 */
export async function scheduleSmartNotification(): Promise<void> {
  const [
    enabled,
    isPremium,
    smartPremium,
    frequency,
    quietEnabled,
    quietStart,
    quietEnd,
    defaultHour,
  ] = await Promise.all([
    getNotificationEnabled(),
    getSubscriptionStatus().then((s) => s.isPremium),
    getSmartPremiumEnabled(),
    getSmartFrequency(),
    getQuietHoursEnabled(),
    getQuietHoursStart(),
    getQuietHoursEnd(),
    getSmartDefaultHour(),
  ]);

  try {
    await cancelNotification(SMART_NOTIFICATION_ID);
  } catch {
    // ignora
  }

  if (!enabled || !isPremium || !smartPremium || frequency === 'never') {
    return;
  }

  const todayIso = new Date().toISOString().slice(0, 10);
  const result = await evaluateSmartRules(todayIso);

  if (!shouldSendByFrequency(result, frequency)) {
    return;
  }

  const can = result && (await canSendSmart(result.key, todayIso));
  if (!can || !result) return;

  const hhmm = nextAllowedTime(defaultHour, quietEnabled, quietStart, quietEnd);
  const [hy, hm] = hhmm.split(':').map(Number);
  const [y, m, d] = todayIso.split('-').map(Number);

  let triggerDate = new Date(y ?? 0, (m ?? 1) - 1, d ?? 1, hy ?? 19, hm ?? 30, 0);
  if (triggerDate <= new Date()) {
    triggerDate.setDate(triggerDate.getDate() + 1);
  }

  const id = await scheduleNotification(
    SMART_NOTIFICATION_ID,
    result.title,
    result.body,
    triggerDate
  );

  if (id) {
    await recordSmartSent(result.key, todayIso, result.ruleId ?? '');
  }
}

/**
 * Para debug: retorna qual regra seria disparada (sem enviar).
 */
export async function debugEvaluateSmartRules(
  todayIso: string
): Promise<{ result: SmartRuleResult | null; canSend: boolean }> {
  const result = await evaluateSmartRules(todayIso);
  const canSend =
    result !== null &&
    (await canSendSmart(result.key, todayIso));
  return { result, canSend };
}

/**
 * Para debug: envia notificação de teste imediatamente.
 */
export async function debugSendTestSmartNotification(): Promise<SmartRuleResult | null> {
  const todayIso = new Date().toISOString().slice(0, 10);
  const result = await evaluateSmartRules(todayIso);
  if (!result) return null;

  await scheduleNotification(
    'ritmo-smart-debug-test',
    result.title,
    result.body,
    new Date(Date.now() + 3000)
  );
  return result;
}
