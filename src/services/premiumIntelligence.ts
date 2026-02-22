import { getDatabase } from '@/src/db/database';
import { scheduleNotification } from '@/src/services/notifications';
import {
  getNotificationEnabled,
  getNotificationIntelligenceLevel,
  getQuietHoursEnabled,
  getQuietHoursStart,
  getQuietHoursEnd,
} from '@/src/services/notificationSettings';
import { getSubscriptionStatus } from '@/src/services/subscription';
import { getWeekRangeISO } from '@/src/utils/weekRange';
import {
  getWeeklyDoneCountsByCategory,
  getActiveDaysInWeek,
} from '@/src/services/goalsProgress';
import { getFullyDoneRoutineCategoryDaysInRange } from '@/src/services/routinesDailyStatus';
import { listGoalsWeekly } from '@/src/services/goalsWeekly';
import { getCategoryById } from '@/src/services/categories';
import { getCategoryDisplayName } from '@/src/services/categoryDisplay';
import { addDaysToIso } from '@/src/utils/date';
import { isWithinQuietHours } from '@/src/utils/timeWindow';
import { t, getLocale } from '@/src/i18n';
import { formatMonthYear } from '@/src/utils/formatDate';
import {
  getStreakCurrent,
  setStreakCurrent,
  getStreakLastActiveDate,
  setStreakLastActiveDate,
  getLastWeeklySummarySent,
  setLastWeeklySummarySent,
  getLastMonthlyCompareSent,
  setLastMonthlyCompareSent,
  getPremiumSentToday,
  setPremiumSentToday,
  getStreakBreakSentToday,
  setStreakBreakSentToday,
  getGoalAlmostSentWeek,
  setGoalAlmostSentWeek,
} from '@/src/services/premiumIntelligenceStorage';

const PREMIUM_PREFIX = 'ritmo-premium-';

function canSendPremium(todayIso: string): Promise<boolean> {
  return getPremiumSentToday().then((sent) => sent !== todayIso);
}

async function sendPremiumNow(
  id: string,
  title: string,
  body: string,
  todayIso: string
): Promise<boolean> {
  const ok = await canSendPremium(todayIso);
  if (!ok) return false;

  const triggerDate = new Date(Date.now() + 2000);
  const didSchedule = await scheduleNotification(
    PREMIUM_PREFIX + id,
    title,
    body,
    triggerDate
  );
  if (didSchedule) {
    await setPremiumSentToday(todayIso);
    return true;
  }
  return false;
}

/** Dia ativo = pelo menos 1 done (day_items) OU rotina com horários fully done. */
async function isDayActive(dateIso: string): Promise<boolean> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ cnt: number }>(
    `SELECT COUNT(*) as cnt FROM day_items WHERE date = ? AND status = 'done'`,
    dateIso
  );
  if ((row?.cnt ?? 0) > 0) return true;
  const fullyDone = await getFullyDoneRoutineCategoryDaysInRange(dateIso, dateIso);
  return fullyDone.length > 0;
}

/** Dia da semana: 0=Dom, 1=Seg, ..., 6=Sab */
function getWeekday(isoDate: string): number {
  const [y, m, d] = isoDate.split('-').map(Number);
  return new Date(y!, m! - 1, d!).getDay();
}

/** Dias restantes na semana (de hoje até domingo, inclusive). */
function daysLeftInWeek(todayIso: string, weekEnd: string): number {
  if (todayIso > weekEnd) return 0;
  const [ty, tm, td] = todayIso.split('-').map(Number);
  const [ey, em, ed] = weekEnd.split('-').map(Number);
  const start = new Date(ty!, tm! - 1, td!);
  const end = new Date(ey!, em! - 1, ed!);
  const diff = Math.ceil((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000));
  return Math.max(0, diff + 1);
}

/** Formata hora atual como HH:mm. */
function nowHHmm(): string {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/**
 * Executa a inteligência premium: streak, meta quase batida, resumo semanal, comparativo mensal.
 * Só roda se isPremium && notifications_enabled && notifications.smart.premium.
 * Respeita quiet hours. Máx 1 notificação premium por dia.
 */
export async function runPremiumIntelligence(todayIso: string): Promise<void> {
  const [sub, enabled, level, quietEnabled, quietStart, quietEnd, premiumSent] =
    await Promise.all([
      getSubscriptionStatus(),
      getNotificationEnabled(),
      getNotificationIntelligenceLevel(),
      getQuietHoursEnabled(),
      getQuietHoursStart(),
      getQuietHoursEnd(),
      getPremiumSentToday(),
    ]);
  if (!sub.isPremium || !enabled || level !== 'premium') return;
  if (premiumSent === todayIso) return;
  if (quietEnabled && isWithinQuietHours(nowHHmm(), quietStart, quietEnd)) return;

  const yesterdayIso = addDaysToIso(todayIso, -1);
  const todayActive = await isDayActive(todayIso);
  const [streakCurrent, streakLastActive] = await Promise.all([
    getStreakCurrent(),
    getStreakLastActiveDate(),
  ]);

  // 1) Sequência / Streak
  if (todayActive) {
    let newStreak: number;
    if (yesterdayIso === streakLastActive) {
      newStreak = streakCurrent + 1;
    } else {
      newStreak = 1;
    }
    await setStreakCurrent(newStreak);
    await setStreakLastActiveDate(todayIso);

    const shouldNotifyStreak =
      newStreak === 3 ||
      newStreak === 5 ||
      newStreak === 7 ||
      (newStreak > 7 && newStreak % 7 === 0);
    if (shouldNotifyStreak) {
      await sendPremiumNow(
        `streak-${newStreak}`,
        t('premiumNotif.streakTitle'),
        t('premiumNotif.streakBody', { count: String(newStreak) }),
        todayIso
      );
      return;
    }
  } else {
    if (streakLastActive === yesterdayIso && streakCurrent > 0) {
      const breakSent = await getStreakBreakSentToday();
      if (breakSent !== todayIso) {
        const sent = await sendPremiumNow(
          'streak-break',
          t('premiumNotif.breakTitle'),
          t('premiumNotif.breakBody'),
          todayIso
        );
        if (sent) {
          await setStreakBreakSentToday(todayIso);
          await setStreakCurrent(0);
          return;
        }
      }
      await setStreakCurrent(0);
    }
  }

  const sent = await getPremiumSentToday();
  if (sent === todayIso) return;

  const { start: weekStart, end: weekEnd } = getWeekRangeISO(
    new Date(todayIso + 'T12:00:00')
  );

  // 2) Meta quase batida
  const goals = await listGoalsWeekly();
  const doneByCat = await getWeeklyDoneCountsByCategory(weekStart, weekEnd);
  const daysLeft = daysLeftInWeek(todayIso, weekEnd);

  for (const goal of goals) {
    const activeDays = doneByCat.get(goal.category_id) ?? 0;
    const remaining = goal.target_count - activeDays;
    if (remaining > 0 && remaining <= daysLeft && remaining <= 2) {
      const lastSent = await getGoalAlmostSentWeek(goal.category_id);
      if (lastSent !== weekStart) {
        const cat = await getCategoryById(goal.category_id);
        const categoryName = getCategoryDisplayName(cat ?? undefined) || goal.category_id;
        const didSend = await sendPremiumNow(
          `goal-almost-${goal.category_id}`,
          t('premiumNotif.goalNearTitle'),
          t('premiumNotif.goalNearBody', {
            count: String(remaining),
            category: categoryName,
          }),
          todayIso
        );
        if (didSend) await setGoalAlmostSentWeek(goal.category_id, weekStart);
        return;
      }
    }
  }

  // 3) Resumo semanal (domingo ou segunda)
  const weekday = getWeekday(todayIso);
  if (weekday === 0 || weekday === 1) {
    const lastSent = await getLastWeeklySummarySent();
    if (!lastSent || lastSent < weekStart) {
      const activeDays = await getActiveDaysInWeek(weekStart, weekEnd);
      let goalsMet = 0;
      for (const goal of goals) {
        const ad = doneByCat.get(goal.category_id) ?? 0;
        if (ad >= goal.target_count) goalsMet++;
      }
      const didSend = await sendPremiumNow(
        'weekly-summary',
        t('premiumNotif.weeklyTitle'),
        t('premiumNotif.weeklyBody', {
          days: String(activeDays),
          goals: String(goalsMet),
        }),
        todayIso
      );
      if (didSend) await setLastWeeklySummarySent(weekStart);
      return;
    }
  }

  // 4) Comparativo mensal (1º dia do mês): mês passado vs mês anterior
  const [y, m, d] = todayIso.split('-').map(Number);
  if (d === 1 && m !== undefined && y !== undefined) {
    const currentMonth = `${y}-${String(m).padStart(2, '0')}`;
    const lastSent = await getLastMonthlyCompareSent();
    if (!lastSent || lastSent < currentMonth) {
      const prevMonth = m === 1 ? 11 : m - 1;
      const prevYear = m === 1 ? y - 1 : y;
      const prevMonthStr = String(prevMonth).padStart(2, '0');
      const lastDay = new Date(prevYear, prevMonth, 0).getDate();
      const prevStart = `${prevYear}-${prevMonthStr}-01`;
      const prevEnd = `${prevYear}-${prevMonthStr}-${String(lastDay).padStart(2, '0')}`;

      const prevPrevMonth = prevMonth === 1 ? 12 : prevMonth - 1;
      const prevPrevYear = prevMonth === 1 ? prevYear - 1 : prevYear;
      const prevPrevMonthStr = String(prevPrevMonth).padStart(2, '0');
      const prevPrevLastDay = new Date(prevPrevYear, prevPrevMonth, 0).getDate();
      const prevPrevStart = `${prevPrevYear}-${prevPrevMonthStr}-01`;
      const prevPrevEnd = `${prevPrevYear}-${prevPrevMonthStr}-${String(prevPrevLastDay).padStart(2, '0')}`;

      const [activePrev, activePrevPrev] = await Promise.all([
        getActiveDaysInWeek(prevStart, prevEnd),
        getActiveDaysInWeek(prevPrevStart, prevPrevEnd),
      ]);
      const diff = activePrev - activePrevPrev;
      if (diff !== 0) {
        const locale = getLocale();
        const monthName = formatMonthYear(
          { year: prevYear, month: prevMonth - 1 },
          locale
        );
        const diffStr = diff > 0 ? `+${diff}` : String(diff);
        const didSend = await sendPremiumNow(
          'monthly-compare',
          t('premiumNotif.monthlyTitle'),
          t('premiumNotif.monthlyBody', { diff: diffStr, month: monthName }),
          todayIso
        );
        if (didSend) await setLastMonthlyCompareSent(currentMonth);
      }
    }
  }
}
