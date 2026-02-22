import { getDatabase } from '@/src/db/database';
import type { GoalWeekly } from '@/src/types';

export async function listGoalsWeekly(): Promise<GoalWeekly[]> {
  const db = await getDatabase();
  return db.getAllAsync<GoalWeekly>('SELECT * FROM goals_weekly ORDER BY category_id');
}

export async function getGoalWeeklyById(id: string): Promise<GoalWeekly | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<GoalWeekly>('SELECT * FROM goals_weekly WHERE id = ?', id);
  return row ?? null;
}

export async function getGoalWeeklyByCategoryId(categoryId: string): Promise<GoalWeekly | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<GoalWeekly>(
    'SELECT * FROM goals_weekly WHERE category_id = ?',
    categoryId
  );
  return row ?? null;
}

interface UpsertInput {
  id?: string;
  category_id: string;
  target_count: number;
}

function generateId(): string {
  return `goal-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export async function upsertGoalWeekly(input: UpsertInput): Promise<void> {
  const db = await getDatabase();
  const existingByCategory = await getGoalWeeklyByCategoryId(input.category_id);

  if (input.id) {
    // Modo edição: já existe meta com este id
    const current = await getGoalWeeklyById(input.id);
    if (!current) {
      // id inválido, tratar como create
      if (existingByCategory) {
        await db.runAsync(
          'UPDATE goals_weekly SET target_count = ? WHERE category_id = ?',
          input.target_count,
          input.category_id
        );
      } else {
        await db.runAsync(
          'INSERT INTO goals_weekly (id, category_id, target_count) VALUES (?, ?, ?)',
          input.id,
          input.category_id,
          input.target_count
        );
      }
    } else if (current.category_id === input.category_id) {
      // Mesma categoria: só atualizar target
      await db.runAsync(
        'UPDATE goals_weekly SET target_count = ? WHERE id = ?',
        input.target_count,
        input.id
      );
    } else if (existingByCategory) {
      // Categoria mudou e nova categoria já tem meta: atualizar a outra e excluir esta
      await db.runAsync(
        'UPDATE goals_weekly SET target_count = ? WHERE category_id = ?',
        input.target_count,
        input.category_id
      );
      await db.runAsync('DELETE FROM goals_weekly WHERE id = ?', input.id);
    } else {
      // Categoria mudou e nova categoria está livre: atualizar esta meta
      await db.runAsync(
        'UPDATE goals_weekly SET category_id = ?, target_count = ? WHERE id = ?',
        input.category_id,
        input.target_count,
        input.id
      );
    }
  } else {
    // Modo criação
    if (existingByCategory) {
      await db.runAsync(
        'UPDATE goals_weekly SET target_count = ? WHERE category_id = ?',
        input.target_count,
        input.category_id
      );
    } else {
      const id = generateId();
      await db.runAsync(
        'INSERT INTO goals_weekly (id, category_id, target_count) VALUES (?, ?, ?)',
        id,
        input.category_id,
        input.target_count
      );
    }
  }
}

export async function deleteGoalWeekly(id: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM goals_weekly WHERE id = ?', id);
}
