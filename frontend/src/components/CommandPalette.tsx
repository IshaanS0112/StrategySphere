import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import { api, optional } from "../api/client";
import type { Company } from "../api/types";
import { GridIcon, LayersIcon, PlusIcon, SearchIcon } from "./Icons";

/** Cmd+K navigator over the routes and every loaded company. */

type Item = {
  id: string;
  label: string;
  hint?: string;
  group: "Go to" | "Companies";
  icon: React.ReactNode;
  to: string;
};

const ROUTES: Item[] = [
  { id: "r-home", label: "Companies", group: "Go to", icon: <GridIcon className="h-4 w-4" />, to: "/" },
  { id: "r-portfolio", label: "Portfolio allocation", group: "Go to", icon: <LayersIcon className="h-4 w-4" />, to: "/portfolios" },
  { id: "r-new", label: "New company", group: "Go to", icon: <PlusIcon className="h-4 w-4" />, to: "/new" },
];

/** Subsequence match, so "cmfg" finds "commodity manufacturer". */
function matches(haystack: string, needle: string): boolean {
  if (!needle) return true;
  const text = haystack.toLowerCase();
  let at = 0;
  for (const char of needle.toLowerCase()) {
    at = text.indexOf(char, at);
    if (at === -1) return false;
    at += 1;
  }
  return true;
}

export default function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [cursor, setCursor] = useState(0);
  const [companies, setCompanies] = useState<Company[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setCursor(0);
    inputRef.current?.focus();
    optional(api.listCompanies({ limit: 50 })).then((page) => {
      if (page) setCompanies(page.items);
    });
  }, [open]);

  const items = useMemo(() => {
    const found: Item[] = companies.map((company) => ({
      id: company.id,
      label: company.name,
      hint: company.period_label ?? company.industry ?? undefined,
      group: "Companies",
      icon: <GridIcon className="h-4 w-4" />,
      to: `/companies/${company.id}`,
    }));
    return [...ROUTES, ...found].filter((item) => matches(`${item.label} ${item.hint ?? ""}`, query));
  }, [companies, query]);

  const go = useCallback(
    (item: Item | undefined) => {
      if (!item) return;
      navigate(item.to);
      onClose();
    },
    [navigate, onClose],
  );

  function onKeyDown(event: React.KeyboardEvent) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setCursor((at) => Math.min(at + 1, items.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setCursor((at) => Math.max(at - 1, 0));
    } else if (event.key === "Enter") {
      event.preventDefault();
      go(items[cursor]);
    } else if (event.key === "Escape") {
      onClose();
    }
  }

  if (!open) return null;

  let lastGroup = "";

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-foreground/40 px-4 pt-[12vh]" /* lint-ok: optical third */
      role="presentation"
      onMouseDown={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        className="panel w-full max-w-xl overflow-hidden shadow-popover animate-fade-up"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="flex items-center gap-3 border-b border-border px-4">
          <SearchIcon className="h-4 w-4 shrink-0 text-muted" />
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setCursor(0);
            }}
            onKeyDown={onKeyDown}
            placeholder="Jump to a company or a view"
            className="h-12 w-full bg-transparent text-sm text-foreground placeholder:text-muted focus:outline-none"
          />
          <kbd className="chip chip-neutral shrink-0">esc</kbd>
        </div>

        <ul className="max-h-80 overflow-y-auto py-1.5">
          {items.length === 0 ? (
            <li className="px-4 py-6 text-center text-xs text-muted">No match.</li>
          ) : (
            items.map((item, index) => {
              const header = item.group !== lastGroup ? item.group : null;
              lastGroup = item.group;
              return (
                <li key={item.id}>
                  {header ? <p className="eyebrow px-4 pb-1 pt-2">{header}</p> : null}
                  <button
                    type="button"
                    onMouseEnter={() => setCursor(index)}
                    onClick={() => go(item)}
                    className={[
                      "flex w-full items-center gap-3 px-4 py-2 text-left text-xs transition-colors",
                      index === cursor ? "bg-surface-2 text-foreground" : "text-foreground",
                    ].join(" ")}
                  >
                    <span className={index === cursor ? "text-primary" : "text-muted"}>{item.icon}</span>
                    <span className="min-w-0 flex-1 truncate font-medium">{item.label}</span>
                    {item.hint ? <span className="shrink-0 text-2xs text-muted">{item.hint}</span> : null}
                  </button>
                </li>
              );
            })
          )}
        </ul>
      </div>
    </div>
  );
}
