import { getDatabase } from '@/src/db/database';
import { getCategoryBySlug } from '@/src/services/categories';
import { createRoutine } from '@/src/services/routines';
import { setRoutineTimes } from '@/src/services/routineTimes';
import { scheduleRoutineTimeNotifications } from '@/src/services/notificationEngine';
import { upsertGoalWeekly } from '@/src/services/goalsWeekly';
import { ensureDefaultCategories } from '@/src/services/categories';
import { getTemplateById, type RoutineTemplate } from '@/src/data/templates';
import { t } from '@/src/i18n';
import type { Routine, RoutineRule } from '@/src/types';

function generateId(): string {
  return `r-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Verifica se já existe rotina com mesmo title e block.
 */
async function routineExists(title: string, block: string): Promise<boolean> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ cnt: number }>(
    'SELECT 1 as cnt FROM routines WHERE title = ? AND block = ? LIMIT 1',
    title,
    block
  );
  return !!row;
}

/**
 * Verifica se um template já foi aplicado (todas as rotinas existem).
 */
export async function isTemplateAlreadyApplied(
  templateId: string
): Promise<boolean> {
  const template = getTemplateById(templateId);
  if (!template || template.routines.length === 0) return false;

  for (const r of template.routines) {
    const block = r.block === 'none' ? 'morning' : r.block;
    const title = t(r.titleKey);
    const exists = await routineExists(title, block);
    if (!exists) return false;
  }
  return true;
}

function ruleToDb(
  routineId: string,
  r: RoutineTemplate['routines'][0]['rule']
): Omit<RoutineRule, 'routine_id'> & { routine_id: string } {
  const byweekdayStr = r.byweekday?.length
    ? r.byweekday.join(',')
    : undefined;
  return {
    routine_id: routineId,
    freq: r.freq,
    interval: r.interval,
    byweekday: byweekdayStr ?? undefined,
  };
}

export interface ApplyTemplateResult {
  created: number;
  skipped: number;
  createdGoals: number;
}

/**
 * Aplica um template: cria categorias, rotinas e metas.
 * Rotinas com mesmo title+block são ignoradas (skipped).
 */
export async function applyTemplate(
  templateId: string
): Promise<ApplyTemplateResult> {
  const template = getTemplateById(templateId);
  if (!template) {
    throw new Error(`Template não encontrado: ${templateId}`);
  }

  const result: ApplyTemplateResult = {
    created: 0,
    skipped: 0,
    createdGoals: 0,
  };

  await ensureDefaultCategories();

  for (const r of template.routines) {
    const block = r.block === 'none' ? 'morning' : r.block;
    const title = t(r.titleKey);
    const exists = await routineExists(title, block);
    if (exists) {
      result.skipped++;
      continue;
    }

    const cat = await getCategoryBySlug(r.category.slug);
    if (!cat) continue;
    const categoryId = cat.id;

    const routineId = generateId();
    const routine: Routine = {
      id: routineId,
      title,
      block,
      default_time: r.default_time ?? '09:00',
      category_id: categoryId,
      is_active: 1,
      location: r.location,
      notes: r.notesKey ? t(r.notesKey) : undefined,
    };

    const rule = ruleToDb(routineId, r.rule);
    await createRoutine(routine, [
      {
        freq: rule.freq,
        interval: rule.interval,
        byweekday: rule.byweekday,
      },
    ]);
    if (r.times?.length) {
      await setRoutineTimes(routineId, r.times);
      scheduleRoutineTimeNotifications(routineId, routine.title).catch(() => {});
    }
    result.created++;
  }

  if (template.goals?.length) {
    for (const g of template.goals) {
      const cat = await getCategoryBySlug(g.categorySlug);
      if (cat) {
        await upsertGoalWeekly({
          category_id: cat.id,
          target_count: g.target_count,
        });
        result.createdGoals++;
      }
    }
  }

  return result;
}
