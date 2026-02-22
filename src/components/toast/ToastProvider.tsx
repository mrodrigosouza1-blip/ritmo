import React, { useCallback, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ToastView } from './ToastView';
import { ToastContext } from './useToast';
import type { ToastOptions } from './useToast';

const DEFAULT_DURATION = 2500;
const MAX_QUEUE = 2;

interface ToastItem extends ToastOptions {
  id: number;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const insets = useSafeAreaInsets();
  const [queue, setQueue] = useState<ToastItem[]>([]);
  const idRef = useRef(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const processQueue = useCallback(() => {
    setQueue((prev) => {
      if (prev.length === 0) return prev;
      const next = prev.slice(1);
      if (next.length > 0) {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(() => {
          processQueue();
          timeoutRef.current = null;
        }, (next[0]?.durationMs ?? DEFAULT_DURATION));
      }
      return next;
    });
  }, []);

  const showToast = useCallback(
    (opts: ToastOptions | string) => {
      const options: ToastOptions =
        typeof opts === 'string' ? { message: opts } : opts;

      const item: ToastItem = {
        id: ++idRef.current,
        message: options.message,
        type: options.type ?? 'info',
        durationMs: options.durationMs ?? DEFAULT_DURATION,
      };

      setQueue((prev) => {
        const next = [...prev, item].slice(-MAX_QUEUE);
        const toShow = next[0];
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(() => {
          processQueue();
          timeoutRef.current = null;
        }, (toShow?.durationMs ?? DEFAULT_DURATION));
        return next;
      });
    },
    [processQueue]
  );

  const current = queue[0];

  return (
    <ToastContext.Provider value={{ showToast }}>
      <View style={styles.wrapper}>
        {children}
        {current && (
          <View
            style={[
              styles.toastLayer,
              {
                paddingTop: insets.top,
                paddingBottom: insets.bottom,
                paddingLeft: insets.left,
                paddingRight: insets.right,
              },
            ]}
            pointerEvents="none">
            <ToastView
              key={current.id}
              message={current.message}
              type={current.type}
              visible={!!current}
              onHide={processQueue}
            />
          </View>
        )}
      </View>
    </ToastContext.Provider>
  );
}

const styles = StyleSheet.create({
  wrapper: { flex: 1 },
  toastLayer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
  },
});
