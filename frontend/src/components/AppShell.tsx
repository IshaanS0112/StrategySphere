import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";

import { api, optional } from "../api/client";
import type { BenchmarkProvenance } from "../api/types";
import CommandPalette from "./CommandPalette";
import { BookIcon, ChevronRightIcon, GridIcon, LayersIcon, LogoMark, PlusIcon, PulseIcon, SearchIcon } from "./Icons";

/** Icon rail, breadcrumb bar and command palette: the frame every view sits in. */

const RAIL = [
  { to: "/", label: "Companies", icon: GridIcon, end: true },
  { to: "/portfolios", label: "Portfolio", icon: LayersIcon },
  { to: "/new", label: "New company", icon: PlusIcon },
];

const SECTION_LABEL: Record<string, string> = {
  "": "Companies",
  companies: "Companies",
  portfolios: "Portfolio",
  entities: "Timeline",
  new: "New company",
};

const BreadcrumbContext = createContext<(label: string | null) => void>(() => {});

/** Lets a page name itself in the breadcrumb trail without the shell fetching it. */
export function useBreadcrumb(label: string | null) {
  const setLeaf = useContext(BreadcrumbContext);
  useEffect(() => {
    setLeaf(label);
    return () => setLeaf(null);
  }, [label, setLeaf]);
}

const SHORTCUTS: [string, string][] = [
  ["⌘ K / Ctrl K", "Jump to a company or view"],
  ["G then C", "Go to companies"],
  ["G then P", "Go to portfolio"],
  ["G then N", "New company"],
  ["?", "This list"],
  ["Esc", "Close"],
];

const GO_TO: Record<string, string> = { c: "/", p: "/portfolios", n: "/new" };

/** True when focus is in a field, so a shortcut key does not eat typed text. */
function isTyping(target: EventTarget | null): boolean {
  const node = target as HTMLElement | null;
  if (!node) return false;
  return (
    node.isContentEditable ||
    node.tagName === "INPUT" ||
    node.tagName === "TEXTAREA" ||
    node.tagName === "SELECT"
  );
}

function ShortcutHelp({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 px-4"
      role="presentation"
      onMouseDown={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Keyboard shortcuts"
        className="panel animate-fade-up w-full max-w-sm overflow-hidden shadow-popover"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 className="section-title">Keyboard</h2>
          <kbd className="chip chip-neutral">esc</kbd>
        </div>
        <dl className="divide-y divide-border/40">
          {SHORTCUTS.map(([keys, what]) => (
            <div key={keys} className="flex items-center justify-between gap-4 px-4 py-2">
              <dt className="text-xs text-foreground">{what}</dt>
              <dd className="shrink-0 font-mono text-2xs text-muted">{keys}</dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}

function isMac() {
  return typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform);
}

function StatusPill() {
  const [provenance, setProvenance] = useState<BenchmarkProvenance | null>(null);
  const [reachable, setReachable] = useState<boolean | null>(null);

  useEffect(() => {
    optional(api.benchmarkProvenance()).then((result) => {
      setProvenance(result);
      setReachable(result !== null);
    });
  }, []);

  const sourced = provenance?.is_edgar_sourced ?? false;
  const tone = reachable === false ? "chip-negative" : sourced ? "chip-positive" : "chip-caution";
  const text =
    reachable === false
      ? "API unreachable"
      : provenance === null
        ? "Checking"
        : sourced
          ? `SEC ${provenance.detail?.period ?? "XBRL"} · ${provenance.sector_count} sectors`
          : "Placeholder benchmarks";

  return (
    <span className={`chip ${tone} gap-1.5`} title="Where the SWOT benchmarks come from">
      <PulseIcon className="h-3 w-3" />
      {text}
    </span>
  );
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [leaf, setLeaf] = useState<string | null>(null);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const pendingGo = useRef(false);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setPaletteOpen((open) => !open);
        return;
      }
      if (event.metaKey || event.ctrlKey || event.altKey || isTyping(event.target)) return;

      if (event.key === "?") {
        setHelpOpen((open) => !open);
      } else if (event.key === "Escape") {
        setHelpOpen(false);
      } else if (pendingGo.current) {
        // Two-key sequence, as in Linear: g then a destination.
        pendingGo.current = false;
        const to = GO_TO[event.key.toLowerCase()];
        if (to) {
          event.preventDefault();
          navigate(to);
        }
      } else if (event.key.toLowerCase() === "g") {
        pendingGo.current = true;
        window.setTimeout(() => {
          pendingGo.current = false;
        }, 1200);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [navigate]);

  const section = useMemo(() => {
    const first = location.pathname.split("/")[1] ?? "";
    return SECTION_LABEL[first] ?? "Companies";
  }, [location.pathname]);

  const sectionHref = section === "Portfolio" ? "/portfolios" : "/";

  return (
    <BreadcrumbContext.Provider value={setLeaf}>
      <div className="min-h-screen md:pl-14">
        <nav
          aria-label="Sections"
          className="fixed inset-y-0 left-0 z-40 hidden w-14 flex-col items-center border-r border-border bg-background/95 py-3 backdrop-blur-xl md:flex"
        >
          <Link to="/" aria-label="StrategySphere home" className="mb-4 rounded-lg">
            <LogoMark className="h-7 w-7" />
          </Link>

          <ul className="flex flex-1 flex-col items-center gap-1">
            {RAIL.map(({ to, label, icon: Icon, end }) => (
              <li key={to}>
                <NavLink
                  to={to}
                  end={end}
                  title={label}
                  aria-label={label}
                  className={({ isActive }) =>
                    [
                      "group relative flex h-10 w-10 items-center justify-center rounded-lg transition-colors duration-200",
                      isActive
                        ? "bg-surface-2 text-primary before:absolute before:-left-3 before:h-5 before:w-0.5 before:bg-primary"
                        : "text-muted hover:bg-surface-2 hover:text-foreground",
                    ].join(" ")
                  }
                >
                  <Icon />
                </NavLink>
              </li>
            ))}
          </ul>

          <a
            href="https://github.com/IshaanS0112/StrategySphere/tree/main/docs"
            target="_blank"
            rel="noreferrer"
            title="Documentation"
            aria-label="Documentation"
            className="flex h-10 w-10 items-center justify-center rounded-lg text-muted transition-colors hover:bg-surface-2 hover:text-foreground"
          >
            <BookIcon />
          </a>
        </nav>

        <header className="sticky top-0 z-30 border-b border-border/80 bg-background/85 backdrop-blur-xl">
          <div className="flex h-12 items-center gap-3 px-4 sm:px-6">
            <Link to="/" aria-label="StrategySphere home" className="md:hidden">
              <LogoMark className="h-6 w-6" />
            </Link>

            <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-1.5 text-xs">
              <Link to={sectionHref} className="shrink-0 font-medium text-muted transition-colors hover:text-foreground">
                {section}
              </Link>
              {leaf ? (
                <>
                  <ChevronRightIcon className="h-3.5 w-3.5 shrink-0 text-subtle" />
                  <span className="truncate font-semibold text-foreground">{leaf}</span>
                </>
              ) : null}
            </nav>

            <div className="ml-auto flex items-center gap-2.5">
              <span className="hidden sm:inline-flex">
                <StatusPill />
              </span>
              <button
                type="button"
                onClick={() => setPaletteOpen(true)}
                className="btn-ghost h-8 gap-2 px-2.5 text-muted"
                aria-label="Open command palette"
              >
                <SearchIcon className="h-3.5 w-3.5" />
                <span className="hidden text-2xs lg:inline">Jump to</span>
                <kbd className="hidden rounded border border-strong px-1 text-2xs text-muted lg:inline">
                  {isMac() ? "⌘" : "Ctrl "}K
                </kbd>
              </button>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">{children}</main>

        <footer className="mx-auto max-w-7xl px-4 pb-10 sm:px-6">
          <p className="border-t border-border/60 pt-4 text-2xs leading-relaxed text-muted">
            Every figure on every screen is computed before any language model is called. Benchmarks are built
            from SEC XBRL filings. The framework itself has been backtested and did not beat a revenue-growth
            baseline — <span className="text-muted">docs/validation_results.md</span>.
          </p>
        </footer>

        <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
        <ShortcutHelp open={helpOpen} onClose={() => setHelpOpen(false)} />
      </div>
    </BreadcrumbContext.Provider>
  );
}
