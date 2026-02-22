import * as SQLite from 'expo-sqlite';
import { runMigrations } from './migrations';

let dbInstance: SQLite.SQLiteDatabase | null = null;
let initPromise: Promise<SQLite.SQLiteDatabase> | null = null;

export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (dbInstance) return dbInstance;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    const db = await SQLite.openDatabaseAsync('ritmo.db');
    await runMigrations(db);
    dbInstance = db;
    return db;
  })();
  return initPromise;
}

export function closeDatabase(): void {
  if (dbInstance) {
    dbInstance.closeAsync();
    dbInstance = null;
    initPromise = null;
  }
}
