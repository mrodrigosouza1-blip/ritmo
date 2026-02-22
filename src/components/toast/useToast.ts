import React, { useContext } from 'react';

export type ToastType = 'success' | 'info' | 'error';

export interface ToastOptions {
  message: string;
  type?: ToastType;
  durationMs?: number;
}

export interface ToastContextValue {
  showToast: (opts: ToastOptions | string) => void;
}

export const ToastContext = React.createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return ctx;
}

export function useToastOptional(): ToastContextValue | null {
  return useContext(ToastContext);
}
