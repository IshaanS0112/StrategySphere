import { useEffect, useState } from "react";

/**
 * Copies a result's calculation basis to the clipboard. The project's claim is
 * that every figure is recomputable; this is that claim as one click.
 */

export default function CopyButton({
  value,
  label = "Copy basis",
  title,
}: {
  value: unknown;
  label?: string;
  title?: string;
}) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), 1600);
    return () => window.clearTimeout(timer);
  }, [copied]);

  async function copy() {
    const text = typeof value === "string" ? value : JSON.stringify(value, null, 2);
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
    } catch {
      // Clipboard needs a secure context; fall back to a selectable prompt.
      window.prompt("Copy:", text);
    }
  }

  if (value === null || value === undefined) return null;

  return (
    <button
      type="button"
      onClick={() => void copy()}
      title={title ?? "Copy the inputs this figure was computed from"}
      className="btn-ghost h-7 gap-1.5 px-2 text-2xs"
    >
      <svg viewBox="0 0 16 16" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
        {copied ? (
          <path d="m3 8.5 3.5 3.5L13 5" strokeLinecap="round" strokeLinejoin="round" />
        ) : (
          <>
            <rect x="5.5" y="5.5" width="8" height="8" rx="1.5" />
            <path d="M10.5 3.5h-7a1 1 0 0 0-1 1v7" strokeLinecap="round" />
          </>
        )}
      </svg>
      {copied ? "Copied" : label}
    </button>
  );
}
