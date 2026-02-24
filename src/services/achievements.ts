import { getDatabase } from '@/src/db/database';
import { t } from '@/src/i18n';
import { getStreakCurrent } from '@/src/services/premiumIntelligenceStorage';
import {
  getWeekly4xConsecutiveCount,
  setWeekly4xConsecutiveCount,
  getWeekly4xLastWeekStart,
  setWeekly4xLastWeekStart,
} from '@/src/services/achievementsStorage';
import { emitAchievementUnlock } from '@/src/services/achievementEmitter';
import { getWeekRangeISO } from '@/src/utils/weekRange';
import { listGoalsWeekly } from '@/src/services/goalsWeekly';
import { getWeeklyDoneCountsByCategory } from '@/src/services/goalsProgress';

export interface Achievement {
  id: string;
  key: string;
  title: string;
  description: string;
  unlocked_at: string;
}

export interface AchievementDefinition {
  key: string;
  titleKey: string;
  descriptionKey: string;
  icon?: string;
}

const DEFINITIONS: AchievementDefinition[] = [
  { key: 'streak_3', titleKey: 'achievements.streak3Title', descriptionKey: 'achievements.streak3Desc' },
  { key: 'streak_7', titleKey: 'achievements.streak7Title', descriptionKey: 'achievements.streak7Desc' },
  { key: 'streak_14', titleKey: 'achievements.streak14Title', descriptionKey: 'achievements.streak14Desc' },
  { key: 'streak_30', titleKey: 'achievements.streak30Title', descriptionKey: 'achievements.streak30Desc' },
  { key: 'weekly_goal_complete', titleKey: 'achievements.weeklyGoalTitle', descriptionKey: 'achievements.weeklyGoalDesc' },
  { key: 'weekly_4x', titleKey: 'achievements.weekly4xTitle', descriptionKey: 'achievements.weekly4xDesc' },
];

/** Retorna conquistas desbloqueadas. */
export async function getUnlockedAchievements(): Promise<Achievement[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<Achievement>(
    'SELECT id, key, title, description, unlocked_at FROM achievements ORDER BY unlocked_at DESC'
  );
  return rows;
}

/** Desbloqueia uma conquista. Nunca desbloqueia duas vezes. */
export async function unlockAchievement(
  key: string,
  title: string,
  description: string
): Promise<Achievement | null> {
  const db = await getDatabase();
  const existing = await db.getFirstAsync<{ id: string }>(
    'SELECT id FROM achievements WHERE key = ?',
    key
  );
  if (existing) return null;

  const id = `ach-${key}-${Date.now()}`;
  const unlockedAt = new Date().toISOString();
  await db.runAsync(
    'INSERT INTO achievements (id, key, title, description, unlocked_at) VALUES (?, ?, ?, ?, ?)',
    id,
    key,
    title,
    description,
    unlockedAt
  );
  return { id, key, title, description, unlocked_at: unlockedAt };
}

/** Verifica condições e desbloqueia conquistas. Retorna recém-desbloqueadas. */
function addDays(iso: string, days: number): Date {
  const d = new Date(iso + 'T12:00:00');
  d.setDate(d.getDate() + days);
  return d;
}

export async function checkAndUnlockAchievements(todayIso: string): Promise<Achievement[]> {
  const newlyUnlocked: Achievement[] = [];
  const streak = await getStreakCurrent();

  // Streak achievements
  const streakKeys = [
    { key: 'streak_3', min: 3 },
    { key: 'streak_7', min: 7 },
    { key: 'streak_14', min: 14 },
    { key: 'streak_30', min: 30 },
  ];
  for (const { key, min } of streakKeys) {
    if (streak >= min) {
      const def = DEFINITIONS.find((d) => d.key === key);
      const a = await unlockAchievement(
        key,
        t(def?.titleKey ?? key),
        t(def?.descriptionKey ?? key)
      );
      if (a) newlyUnlocked.push(a);
    }
  }

  // weekly_goal_complete: todas metas da semana atingidas
  const { start: weekStart, end: weekEnd } = getWeekRangeISO(new Date(todayIso + 'T12:00:00'));
  const goals = await listGoalsWeekly();
  const doneByCat = await getWeeklyDoneCountsByCategory(weekStart, weekEnd);
  let allGoalsMet = goals.length > 0;
  for (const goal of goals) {
    const count = doneByCat.get(goal.category_id) ?? 0;
    if (count < goal.target_count) {
      allGoalsMet = false;
      break;
    }
  }
  if (allGoalsMet && goals.length > 0) {
    const a = await unlockAchievement(
      'weekly_goal_complete',
      t('achievements.weeklyGoalTitle'),
      t('achievements.weeklyGoalDesc')
    );
    if (a) newlyUnlocked.push(a);
  }

  // weekly_4x: 4 semanas consecutivas com metas completas
  const [consecutiveCount, lastWeekStart] = await Promise.all([
    getWeekly4xConsecutiveCount(),
    getWeekly4xLastWeekStart(),
  ]);
  let newCount = consecutiveCount;
  if (allGoalsMet && goals.length > 0) {
    if (lastWeekStart === null) {
      newCount = 1;
      await setWeekly4xConsecutiveCount(1);
      await setWeekly4xLastWeekStart(weekStart);
    } else if (lastWeekStart === weekStart) {
      // já contamos esta semana, nada a fazer
    } else {
      const prevWeekStart = getWeekRangeISO(addDays(weekStart, -7)).start;
      if (lastWeekStart === prevWeekStart) {
        newCount = consecutiveCount + 1;
      } else {
        newCount = 1;
      }
      await setWeekly4xConsecutiveCount(newCount);
      await setWeekly4xLastWeekStart(weekStart);
    }
  } else {
    await setWeekly4xConsecutiveCount(0);
  }

  if (newCount >= 4) {
    const a = await unlockAchievement(
      'weekly_4x',
      t('achievements.weekly4xTitle'),
      t('achievements.weekly4xDesc')
    );
    if (a) newlyUnlocked.push(a);
  }

  if (newlyUnlocked.length > 0) {
    emitAchievementUnlock(newlyUnlocked);
  }
  return newlyUnlocked;
}

/**
 * Verifica conquistas e emite para o provider exibir o popup.
 * Chamar após streak/metas serem atualizados.
 */
export async function checkAndEmitAchievements(todayIso: string): Promise<void> {
  await checkAndUnlockAchievements(todayIso);
}


export function getAchievementDefinitions(): AchievementDefinition[] {
  return [...DEFINITIONS];
}
