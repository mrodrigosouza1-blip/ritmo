import Constants from 'expo-constants';
import { getDatabase } from '@/src/db/database';

const SCHEMA_VERSION = 1;

export interface BackupPayload {
  schema_version: number;
  app_version: string;
  exported_at: string;
  data: {
    categories: Record<string, unknown>[];
    events: Record<string, unknown>[];
    routines: Record<string, unknown>[];
    routine_rules: Record<string, unknown>[];
    routine_exceptions: Record<string, unknown>[];
    goals_weekly: Record<string, unknown>[];
    tasks: Record<string, unknown>[];
    day_items: Record<string, unknown>[];
    ui_settings?: Record<string, unknown>[];
  };
}

function formatFilename(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const yyyymmdd = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}`;
  const hhmm = `${pad(now.getHours())}${pad(now.getMinutes())}`;
  return `ritmo-backup-${yyyymmdd}-${hhmm}.json`;
}

function getAppVersion(): string {
  const v = Constants.expoConfig?.version ?? Constants.manifest?.version;
  return typeof v === 'string' ? v : '1.0.0';
}

export async function exportBackupJson(): Promise<{
  filename: string;
  jsonString: string;
}> {
  const db = await getDatabase();

  const [
    categories,
    events,
    routines,
    routine_rules,
    routine_exceptions,
    goals_weekly,
    tasks,
    day_items,
    ui_settings,
  ] = await Promise.all([
    db.getAllAsync<Record<string, unknown>>('SELECT * FROM categories'),
    db.getAllAsync<Record<string, unknown>>('SELECT * FROM events'),
    db.getAllAsync<Record<string, unknown>>('SELECT * FROM routines'),
    db.getAllAsync<Record<string, unknown>>('SELECT * FROM routine_rules'),
    db.getAllAsync<Record<string, unknown>>('SELECT * FROM routine_exceptions'),
    db.getAllAsync<Record<string, unknown>>('SELECT * FROM goals_weekly'),
    db.getAllAsync<Record<string, unknown>>('SELECT * FROM tasks'),
    db.getAllAsync<Record<string, unknown>>('SELECT * FROM day_items'),
    db.getAllAsync<Record<string, unknown>>('SELECT * FROM ui_settings').catch(() => []),
  ]);

  const payload: BackupPayload = {
    schema_version: SCHEMA_VERSION,
    app_version: getAppVersion(),
    exported_at: new Date().toISOString(),
    data: {
      categories,
      events,
      routines,
      routine_rules,
      routine_exceptions,
      goals_weekly,
      tasks,
      day_items,
      ...(ui_settings.length > 0 && { ui_settings }),
    },
  };

  const filename = formatFilename();
  const jsonString = JSON.stringify(payload, null, 2);

  return { filename, jsonString };
}
