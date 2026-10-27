import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

/** Transient confirmations. Every async action in this app ran silently before. */

type Tone = "success" | "error" | "info";

interface Toast {
  id: number;
  tone: Tone;
  title: string;
  detail?: string;
}

const TONE_CLASS: Record<Tone, string> = {
  success: "border-success/40 bg-success/10",
  error: "border-danger/45 bg-danger/10",
  info: "border-strong bg-surface-2",
};

const TONE_DOT: Record<Tone, string> = {
  success: "bg-success",
  error: "bg-danger",
  info: "bg-info",
};

const DISMISS_MS = 4500;

type Push = (toast: Omit<Toast, "id">) => void;

const ToastContext = createContext<Push>(() => {});

export function useToast() {
  return useContext(ToastContext);
}

function ToastRow({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  useEffect(() => {
    // Errors stay until dismissed: they usually carry a request id worth reading.
    if (toast.tone === "error") return;
    const timer = window.setTimeout(onDismiss, DISMISS_MS);
    return () => window.clearTimeout(timer);
  }, [toast.tone, onDismiss]);

  return (
    <div
      className={`panel animate-fade-up flex w-80 items-start gap-2.5 border px-3.5 py-2.5 ${TONE_CLASS[toast.tone]}`}
    >
      <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${TONE_DOT[toast.tone]}`} aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold text-foreground">{toast.title}</p>
        {toast.detail ? <p className="mt-0.5 break-words text-2xs text-muted">{toast.detail}</p> : null}
      </div>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss"
        className="-mr-1 -mt-0.5 shrink-0 rounded p-1 text-muted transition-colors hover:text-foreground"
      >
        <svg viewBox="0 0 16 16" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
          <path d="m4 4 8 8M12 4l-8 8" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  );
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const push = useCallback<Push>((toast) => {
    setToasts((all) => [...all, { ...toast, id: Date.now() + Math.random() }]);
  }, []);

  const dismiss = useCallback((id: number) => {
    setToasts((all) => all.filter((toast) => toast.id !== id));
  }, []);

  const value = useMemo(() => push, [push]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        aria-atomic="false"
        className="pointer-events-none fixed bottom-4 right-4 z-[60] flex flex-col items-end gap-2"
      >
        {toasts.map((toast) => (
          <div key={toast.id} className="pointer-events-auto">
            <ToastRow toast={toast} onDismiss={() => dismiss(toast.id)} />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
