'use client';
import React, { createContext, useContext, useEffect, useState } from 'react';

type ToastType = 'info' | 'success' | 'error';
interface Toast {
  id: string;
  title?: string;
  message: string;
  type: ToastType;
  ttl: number;
}
interface ToastContextType {
  push: (t: Omit<Toast, 'id' | 'ttl'> & { ttl?: number }) => void;
}
const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const push = (t: Omit<Toast, 'id' | 'ttl'> & { ttl?: number }) => {
    setToasts((prev) => [...prev, { id: crypto.randomUUID(), ttl: t.ttl ?? 4200, ...t }]);
  };
  useEffect(() => {
    const handler = (e: Event) => {
      const ce = e as CustomEvent<any>;
      if (ce.type === 'lokifi.toast' && ce.detail) {
        push({
          title: ce.detail.title,
          message: ce.detail.message,
          type: ce.detail.type || 'info',
          ttl: ce.detail.ttl,
        });
      }
    };
    window.addEventListener('lokifi.toast', handler as EventListener);
    return () => window.removeEventListener('lokifi.toast', handler as EventListener);
  }, []);
  useEffect(() => {
    if (!toasts.length) return;
    const timers = toasts.map((t) =>
      setTimeout(() => setToasts((p) => p.filter((x) => x.id !== t.id)), t.ttl)
    );
    return () => {
      timers.forEach(clearTimeout);
    };
  }, [toasts]);
  return (
    <ToastContext.Provider value={{ push }}>
      {children}
      <div className="fixed bottom-4 right-4 z-[1000] flex flex-col gap-3 w-80 pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto rounded-md shadow-lg border px-4 py-3 text-sm backdrop-blur-sm animate-fadeIn toast-${t.type} relative`}
          >
            {t.title && <div className="font-medium mb-0.5">{t.title}</div>}
            <div className="text-xs opacity-90 leading-snug">{t.message}</div>
            <button
              onClick={() => setToasts((p) => p.filter((x) => x.id !== t.id))}
              className="absolute top-1 right-2 text-xs text-gray-400 hover:text-gray-200"
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};
export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
};
