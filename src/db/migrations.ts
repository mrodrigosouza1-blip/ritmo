import type * as SQLite from 'expo-sqlite';

export const MIGRATIONS = [
  `CREATE TABLE IF NOT EXISTS events (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    start_at TEXT NOT NULL,
    end_at TEXT NOT NULL,
    location TEXT,
    notes TEXT,
    notify_id TEXT,
    category_id TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS routines (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    block TEXT NOT NULL,
    default_time TEXT,
    category_id TEXT,
    is_active INTEGER DEFAULT 1,
    location TEXT,
    notes TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS routine_rules (
    routine_id TEXT NOT NULL,
    freq TEXT NOT NULL,
    interval INTEGER,
    byweekday TEXT,
    bymonthday TEXT,
    FOREIGN KEY (routine_id) REFERENCES routines(id)
  )`,
  `CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    due_at TEXT,
    due_date TEXT,
    block TEXT,
    category_id TEXT,
    notify_id TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS day_items (
    id TEXT PRIMARY KEY,
    date TEXT NOT NULL,
    source_type TEXT NOT NULL,
    source_id TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    done_at TEXT,
    UNIQUE(date, source_type, source_id)
  )`,
  `CREATE TABLE IF NOT EXISTS categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    color_hex TEXT NOT NULL,
    icon TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS goals_weekly (
    id TEXT PRIMARY KEY,
    category_id TEXT NOT NULL,
    target_count INTEGER NOT NULL,
    FOREIGN KEY (category_id) REFERENCES categories(id)
  )`,
  `CREATE INDEX IF NOT EXISTS idx_day_items_date ON day_items(date)`,
  `CREATE INDEX IF NOT EXISTS idx_events_start ON events(start_at)`,
  `CREATE INDEX IF NOT EXISTS idx_tasks_due ON tasks(due_at, due_date)`,
  `CREATE TABLE IF NOT EXISTS routine_exceptions (
    id TEXT PRIMARY KEY,
    routine_id TEXT NOT NULL,
    date TEXT NOT NULL,
    kind TEXT NOT NULL,
    moved_to_date TEXT,
    created_at TEXT,
    UNIQUE(routine_id, date)
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_routine_ex_unique ON routine_exceptions(routine_id, date)`,
  `CREATE TABLE IF NOT EXISTS ui_settings (
    key TEXT PRIMARY KEY,
    value TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS routine_times (
    id TEXT PRIMARY KEY,
    routine_id TEXT NOT NULL,
    time TEXT NOT NULL,
    enabled INTEGER NOT NULL DEFAULT 1,
    sort_order INTEGER NOT NULL DEFAULT 0
  )`,
  `CREATE INDEX IF NOT EXISTS idx_routine_times_routine_id ON routine_times(routine_id)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS uniq_routine_times ON routine_times(routine_id, time)`,
  `CREATE TABLE IF NOT EXISTS day_routine_times (
    id TEXT PRIMARY KEY,
    date TEXT NOT NULL,
    routine_id TEXT NOT NULL,
    time TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    notification_id TEXT
  )`,
  `CREATE INDEX IF NOT EXISTS idx_day_routine_times_date ON day_routine_times(date)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS uniq_day_routine_times ON day_routine_times(date, routine_id, time)`,
  `CREATE TABLE IF NOT EXISTS achievements (
    id TEXT PRIMARY KEY,
    key TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    unlocked_at TEXT NOT NULL
  )`,
];

export async function runMigrations(db: SQLite.SQLiteDatabase): Promise<void> {
  for (const migration of MIGRATIONS) {
    await db.execAsync(migration);
  }
  const hasDate = await db.getFirstAsync<{ cnt: number }>(
    "SELECT COUNT(*) as cnt FROM pragma_table_info('events') WHERE name='date'"
  );
  if (hasDate?.cnt === 0) {
    await db.execAsync('ALTER TABLE events ADD COLUMN date TEXT');
    await db.execAsync(
      "UPDATE events SET date = date(start_at) WHERE date IS NULL AND start_at IS NOT NULL AND start_at LIKE '%-%'"
    );
  }

  // routines.location e routines.notes (bancos antigos criados antes destas colunas)
  try {
    const locCheck = await db.getFirstAsync<{ cnt: number }>(
      "SELECT COUNT(*) as cnt FROM pragma_table_info('routines') WHERE name='location'"
    );
    if (locCheck?.cnt === 0) {
      await db.runAsync('ALTER TABLE routines ADD COLUMN location TEXT');
    }
  } catch (_) {
    // ignora se coluna já existir
  }
  try {
    const notesCheck = await db.getFirstAsync<{ cnt: number }>(
      "SELECT COUNT(*) as cnt FROM pragma_table_info('routines') WHERE name='notes'"
    );
    if (notesCheck?.cnt === 0) {
      await db.runAsync('ALTER TABLE routines ADD COLUMN notes TEXT');
    }
  } catch (_) {
    // ignora se coluna já existir
  }

  // events.category_id (bancos antigos)
  try {
    const catEvt = await db.getFirstAsync<{ cnt: number }>(
      "SELECT COUNT(*) as cnt FROM pragma_table_info('events') WHERE name='category_id'"
    );
    if (catEvt?.cnt === 0) {
      await db.runAsync('ALTER TABLE events ADD COLUMN category_id TEXT');
    }
  } catch (_) {
    // ignora se coluna já existir
  }

  // tasks: schema nova (date, time, location, notes)
  const addTasksCol = async (col: string, def?: string) => {
    try {
      const c = await db.getFirstAsync<{ cnt: number }>(
        `SELECT COUNT(*) as cnt FROM pragma_table_info('tasks') WHERE name=?`,
        col
      );
      if (c?.cnt === 0) {
        const suffix = def ? ` DEFAULT ${def}` : '';
        await db.runAsync(`ALTER TABLE tasks ADD COLUMN ${col} TEXT${suffix}`);
      }
    } catch (_) {}
  };
  await addTasksCol('date');
  await addTasksCol('time');
  await addTasksCol('location');
  await addTasksCol('notes');
  await addTasksCol('created_at');
  await addTasksCol('updated_at');

  try {
    const hasDate = await db.getFirstAsync<{ cnt: number }>(
      "SELECT COUNT(*) as cnt FROM pragma_table_info('tasks') WHERE name='date'"
    );
    if (hasDate?.cnt === 1) {
      await db.runAsync(
        `UPDATE tasks SET date = COALESCE(
           due_date,
           CASE WHEN due_at IS NOT NULL AND due_at LIKE '%-%' THEN substr(due_at, 1, 10) ELSE NULL END
         )
         WHERE date IS NULL OR date = ''`
      );
      await db.runAsync(
        `UPDATE tasks SET time = CASE
          WHEN due_at IS NOT NULL AND due_at LIKE '%T%' THEN substr(due_at, 12, 5)
          WHEN due_at IS NOT NULL AND length(due_at) = 5 THEN due_at
          ELSE NULL END
         WHERE date IS NOT NULL`
      );
    }
  } catch (_) {}

  try {
    await db.execAsync('CREATE INDEX IF NOT EXISTS idx_tasks_date ON tasks(date)');
    await db.execAsync('CREATE INDEX IF NOT EXISTS idx_tasks_category ON tasks(category_id)');
  } catch (_) {}

  // tasks.notify_id (bancos antigos)
  try {
    const hasNotify = await db.getFirstAsync<{ cnt: number }>(
      "SELECT COUNT(*) as cnt FROM pragma_table_info('tasks') WHERE name='notify_id'"
    );
    if (hasNotify?.cnt === 0) {
      await db.runAsync('ALTER TABLE tasks ADD COLUMN notify_id TEXT');
    }
  } catch (_) {}

  // categories.slug e categories.is_system (categorias traduzíveis)
  try {
    const hasSlug = await db.getFirstAsync<{ cnt: number }>(
      "SELECT COUNT(*) as cnt FROM pragma_table_info('categories') WHERE name='slug'"
    );
    if (hasSlug?.cnt === 0) {
      await db.runAsync('ALTER TABLE categories ADD COLUMN slug TEXT');
    }
  } catch (_) {}
  try {
    const hasIsSystem = await db.getFirstAsync<{ cnt: number }>(
      "SELECT COUNT(*) as cnt FROM pragma_table_info('categories') WHERE name='is_system'"
    );
    if (hasIsSystem?.cnt === 0) {
      await db.runAsync('ALTER TABLE categories ADD COLUMN is_system INTEGER NOT NULL DEFAULT 0');
    }
  } catch (_) {}

}
