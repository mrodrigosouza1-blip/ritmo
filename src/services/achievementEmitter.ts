import type { Achievement } from './achievements';

type Listener = (achievements: Achievement[]) => void;

const listeners = new Set<Listener>();

export function subscribeAchievementUnlock(fn: Listener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function emitAchievementUnlock(achievements: Achievement[]): void {
  if (achievements.length === 0) return;
  listeners.forEach((fn) => fn(achievements));
}
