import React, { useEffect, useState, useCallback } from 'react';
import { subscribeAchievementUnlock } from '@/src/services/achievementEmitter';
import type { Achievement } from '@/src/services/achievements';
import { AchievementUnlockedModal } from './AchievementUnlockedModal';

export function AchievementProvider({ children }: { children: React.ReactNode }) {
  const [queue, setQueue] = useState<Achievement[]>([]);
  const [current, setCurrent] = useState<Achievement | null>(null);

  const showNext = useCallback(() => {
    setQueue((prev) => {
      const next = prev.slice(1);
      setCurrent(next[0] ?? null);
      return next;
    });
  }, []);

  useEffect(() => {
    const unsub = subscribeAchievementUnlock((achievements) => {
      setQueue((prev) => [...prev, ...achievements]);
      setCurrent((c) => (c ? c : achievements[0] ?? null));
    });
    return unsub;
  }, []);

  useEffect(() => {
    if (queue.length > 0 && !current) {
      setCurrent(queue[0] ?? null);
    }
  }, [queue, current]);

  const handleClose = useCallback(() => {
    showNext();
  }, [showNext]);

  return (
    <>
      {children}
      <AchievementUnlockedModal
        visible={!!current}
        achievement={current}
        onClose={handleClose}
      />
    </>
  );
}
