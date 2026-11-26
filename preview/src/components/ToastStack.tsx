import React from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { X, CheckCircle2, AlertTriangle, Info } from 'lucide-react';
import { useNorden } from '../context/NordenContext';

export const ToastStack: React.FC = () => {
  const { toasts, dismissToast } = useNorden();

  return (
    <div
      className="fixed bottom-5 right-5 z-50 flex flex-col gap-2.5 w-[calc(100vw-2.5rem)] max-w-sm pointer-events-none"
      aria-live="polite"
    >
      <AnimatePresence initial={false}>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.98 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="pointer-events-auto flex items-start gap-3 bg-[var(--bg-surface)] border border-[var(--border-strong)] px-4 py-3.5 rounded-xl shadow-xl"
          >
            <span className="mt-0.5 shrink-0">
              {toast.variant === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-[var(--accent)]" />
              ) : toast.variant === 'warning' ? (
                <AlertTriangle className="w-4 h-4 text-[var(--status-warn)]" />
              ) : (
                <Info className="w-4 h-4 text-[var(--text-muted)]" />
              )}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-[var(--text-primary)] leading-snug">
                {toast.title}
              </p>
              {toast.description && (
                <p className="text-xs text-[var(--text-muted)] mt-0.5 leading-relaxed">
                  {toast.description}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={() => dismissToast(toast.id)}
              aria-label="Fechar aviso"
              className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors p-0.5 shrink-0 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};
