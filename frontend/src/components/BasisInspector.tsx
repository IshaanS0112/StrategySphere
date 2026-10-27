import { useEffect, useState } from "react";

import CopyButton from "./CopyButton";

/**
 * Grafana's panel inspector, applied to this project's claim: every stored
 * result carries the inputs its figures were computed from, and until now the
 * only way to read them was to copy JSON to the clipboard.
 */

type Tab = "basis" | "json";

const FORMULA = /[=*/]|\+\s/;

function isFormula(value: string): boolean {
  return FORMULA.test(value) && value.length < 220;
}

function Scalar({ value }: { value: unknown }) {
  if (value === null || value === undefined) return <span className="text-subtle">—</span>;
  if (typeof value === "boolean") {
    return <span className={`chip ${value ? "chip-positive" : "chip-neutral"}`}>{String(value)}</span>;
  }
  if (typeof value === "number") {
    return <span className="num text-foreground">{value.toLocaleString(undefined, { maximumFractionDigits: 6 })}</span>;
  }
  const text = String(value);
  if (isFormula(text)) {
    return (
      <code className="block whitespace-pre-wrap rounded bg-surface-2 px-2 py-1 text-2xs text-foreground">
        {text}
      </code>
    );
  }
  return <span className="text-foreground">{text}</span>;
}

function label(key: string): string {
  return key.replace(/_/g, " ");
}

function Node({ name, value, depth }: { name: string; value: unknown; depth: number }) {
  const [open, setOpen] = useState(depth < 1);

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return <Row name={name}><span className="text-subtle">none</span></Row>;
    }
    if (value.every((item) => item === null || typeof item !== "object")) {
      return <Row name={name}><span className="text-foreground">{value.join(", ")}</span></Row>;
    }
  }

  const isGroup = value !== null && typeof value === "object";
  if (!isGroup) {
    return <Row name={name}><Scalar value={value} /></Row>;
  }

  const entries = Array.isArray(value)
    ? value.map((item, index) => [`[${index}]`, item] as const)
    : Object.entries(value as Record<string, unknown>);

  return (
    <div className="border-t border-border py-2 first:border-t-0">
      <button
        type="button"
        onClick={() => setOpen((was) => !was)}
        aria-expanded={open}
        className="flex w-full items-center gap-1.5 text-left"
      >
        <svg
          viewBox="0 0 16 16"
          className={`h-3 w-3 shrink-0 text-muted transition-transform duration-150 ${open ? "rotate-90" : ""}`}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          aria-hidden="true"
        >
          <path d="m6 3 5 5-5 5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span className="eyebrow">{label(name)}</span>
        <span className="ml-auto text-2xs text-subtle">{entries.length}</span>
      </button>

      {open ? (
        <div className="mt-1.5 pl-4">
          {entries.map(([key, child]) => (
            <Node key={key} name={key} value={child} depth={depth + 1} />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function Row({ name, children }: { name: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-t border-border py-1.5 first:border-t-0">
      <span className="shrink-0 text-xs text-muted">{label(name)}</span>
      <span className="min-w-0 text-right text-xs">{children}</span>
    </div>
  );
}

export default function BasisInspector({
  title,
  basis,
  generatedAt,
  open,
  onClose,
}: {
  title: string;
  basis: Record<string, unknown> | null | undefined;
  generatedAt?: string | null;
  open: boolean;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<Tab>("basis");

  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open || !basis) return null;

  const entries = Object.entries(basis);

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-foreground/40" role="presentation" onMouseDown={onClose}>
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={`${title} calculation basis`}
        className="flex h-full w-full max-w-lg flex-col border-l border-border bg-card shadow-popover"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="border-b border-border px-5 py-4">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="eyebrow">Calculation basis</p>
              <h2 className="mt-1 truncate text-lg font-semibold text-foreground">{title}</h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close inspector"
              className="-mr-1 shrink-0 rounded p-1 text-muted transition-colors hover:text-foreground"
            >
              <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
                <path d="m4 4 8 8M12 4l-8 8" strokeLinecap="round" />
              </svg>
            </button>
          </div>

          <p className="mt-2 text-xs leading-relaxed text-muted">
            Everything this stage's figures were computed from. Nothing here came from a language model.
            {generatedAt ? ` Generated ${new Date(generatedAt).toLocaleString()}.` : ""}
          </p>

          <div className="mt-3 flex items-center gap-1">
            {(["basis", "json"] as Tab[]).map((name) => (
              <button
                key={name}
                type="button"
                onClick={() => setTab(name)}
                aria-current={tab === name ? "true" : undefined}
                className={[
                  "rounded px-2.5 py-1 text-xs font-medium capitalize transition-colors duration-150",
                  tab === name ? "bg-brand-tint text-primary" : "text-muted hover:text-foreground",
                ].join(" ")}
              >
                {name}
              </button>
            ))}
            <span className="ml-auto">
              <CopyButton value={basis} label="Copy JSON" />
            </span>
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-3">
          {tab === "basis" ? (
            entries.map(([key, value]) => <Node key={key} name={key} value={value} depth={0} />)
          ) : (
            <pre className="whitespace-pre-wrap break-words text-2xs leading-relaxed text-foreground">
              {JSON.stringify(basis, null, 2)}
            </pre>
          )}
        </div>
      </aside>
    </div>
  );
}
