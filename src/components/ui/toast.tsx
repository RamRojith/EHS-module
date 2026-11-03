import * as React from 'react';
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

/* ============================================================================
 * Toast — provider + hook, stacked bottom-right, auto dismiss.
 * ==========================================================================*/

export type ToastTone = 'default' | 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  title: string;
  description?: string;
  tone: ToastTone;
  duration: number;
  action?: { label: string; onClick: () => void };
}

interface ToastContextValue {
  toast: (input: Omit<Toast, 'id' | 'tone' | 'duration'> & { tone?: ToastTone; duration?: number }) => string;
  dismiss: (id: string) => void;
}

const ToastContext = React.createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const ctx = React.useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>');
  return ctx;
}

let toastSeq = 0;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<Toast[]>([]);
  const timers = React.useRef(new Map<string, number>());

  const dismiss = React.useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    const timer = timers.current.get(id);
    if (timer) {
      window.clearTimeout(timer);
      timers.current.delete(id);
    }
  }, []);

  const toast = React.useCallback<ToastContextValue['toast']>(
    (input) => {
      const id = `toast-${++toastSeq}`;
      const duration = input.duration ?? 4500;
      const next: Toast = { ...input, id, tone: input.tone ?? 'default', duration };
      setToasts((prev) => [...prev.slice(-3), next]);
      const timer = window.setTimeout(() => dismiss(id), duration);
      timers.current.set(id, timer);
      return id;
    },
    [dismiss],
  );

  React.useEffect(() => {
    const map = timers.current;
    return () => {
      map.forEach((t) => window.clearTimeout(t));
      map.clear();
    };
  }, []);

  const value = React.useMemo(() => ({ toast, dismiss }), [toast, dismiss]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        aria-atomic="false"
        className="pointer-events-none fixed right-4 bottom-4 z-100 flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-2"
      >
        {toasts.map((t) => (
          <ToastCard key={t.id} toast={t} onDismiss={() => dismiss(t.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

const TONE_STYLE: Record<ToastTone, { icon: React.ReactNode; ring: string }> = {
  default: { icon: <Info className="h-4 w-4 text-ink-500" />, ring: 'border-l-ink-400' },
  info: { icon: <Info className="h-4 w-4 text-blue-600" />, ring: 'border-l-blue-500' },
  success: { icon: <CheckCircle2 className="h-4 w-4 text-emerald-600" />, ring: 'border-l-emerald-500' },
  warning: { icon: <AlertTriangle className="h-4 w-4 text-amber-500" />, ring: 'border-l-amber-500' },
  error: { icon: <XCircle className="h-4 w-4 text-red-600" />, ring: 'border-l-red-500' },
};

function ToastCard({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  const style = TONE_STYLE[toast.tone];
  return (
    <div
      role="status"
      className={cn(
        'pointer-events-auto flex animate-slide-up items-start gap-2.5 rounded-lg border border-ink-200 border-l-3 bg-white p-3.5 shadow-overlay',
        style.ring,
      )}
    >
      <span className="mt-0.5 shrink-0">{style.icon}</span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-ink-900">{toast.title}</p>
        {toast.description ? <p className="mt-0.5 text-xs text-ink-600">{toast.description}</p> : null}
        {toast.action ? (
          <button
            type="button"
            onClick={() => {
              toast.action?.onClick();
              onDismiss();
            }}
            className="mt-1.5 text-xs font-semibold text-navy-700 hover:underline"
          >
            {toast.action.label}
          </button>
        ) : null}
      </div>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss notification"
        className="h-6 w-6 shrink-0 rounded text-ink-400 transition-colors hover:bg-ink-100 hover:text-ink-700"
      >
        <X className="mx-auto h-3.5 w-3.5" />
      </button>
    </div>
  );
}
