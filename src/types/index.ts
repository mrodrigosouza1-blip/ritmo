export type TimeBlock = 'morning' | 'afternoon' | 'evening' | 'none';

export interface Event {
  id: string;
  title: string;
  date: string;
  start_at: string;
  end_at: string;
  location?: string;
  notes?: string;
  notify_id?: string;
  category_id?: string | null;
}

export interface Routine {
  id: string;
  title: string;
  block: TimeBlock;
  default_time?: string;
  category_id?: string;
  is_active: number;
  location?: string;
  notes?: string;
}

export interface RoutineRule {
  routine_id: string;
  freq: string;
  interval?: number;
  byweekday?: string;
  bymonthday?: string;
}

export interface Task {
  id: string;
  title: string;
  date: string;
  time?: string;
  category_id?: string;
  location?: string;
  notes?: string;
  created_at?: string;
  updated_at?: string;
  notify_id?: string;
  /** @deprecated use date/time */
  due_at?: string;
  due_date?: string;
}

export interface DayItem {
  id: string;
  date: string;
  source_type: 'event' | 'routine' | 'task';
  source_id: string;
  status: 'pending' | 'done';
  done_at?: string;
}

export interface Category {
  id: string;
  name: string;
  color_hex: string;
  icon?: string;
  /** Slug para categorias do sistema (ex: work, fitness). Usado em i18n. */
  slug?: string | null;
  /** 1 = categoria do sistema (traduzível), 0 = criada pelo usuário */
  is_system?: number;
}

export interface GoalWeekly {
  id: string;
  category_id: string;
  target_count: number;
}

export interface DayItemWithDetails extends DayItem {
  title: string;
  start_at?: string;
  end_at?: string;
  block?: TimeBlock;
  category_id?: string;
  category_name?: string;
  color_hex?: string;
  location?: string;
  notes?: string;
  /** Para rotina movida: data de origem (YYYY-MM-DD) */
  movedFromDate?: string;
  /** Apenas para tasks: usados na ordenação */
  due_at?: string;
  due_date?: string;
}

export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;
