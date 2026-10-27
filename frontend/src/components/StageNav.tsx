import { useEffect, useState } from "react";

/**
 * Sticky jump list for the pipeline. The analysis page is seven stages long,
 * and before this the only way to reach the last one was to scroll.
 */

export interface StageLink {
  id: string;
  label: string;
  done: boolean;
}

export default function StageNav({ stages }: { stages: StageLink[] }) {
  const [active, setActive] = useState(stages[0]?.id ?? "");

  useEffect(() => {
    const sections = stages
      .map((stage) => document.getElementById(stage.id))
      .filter((node): node is HTMLElement => node !== null);
    if (sections.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        // Topmost intersecting section wins, so the marker tracks reading order
        // rather than whichever entry fired last.
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: "-72px 0px -55% 0px" },
    );

    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, [stages]);

  return (
    <nav aria-label="Analysis stages" className="sticky top-16 hidden xl:block">
      <p className="eyebrow mb-2.5">Pipeline</p>
      <ol className="space-y-0.5 border-l border-border">
        {stages.map((stage, index) => (
          <li key={stage.id}>
            <a
              href={`#${stage.id}`}
              aria-current={active === stage.id ? "true" : undefined}
              className={[
                "group flex items-center gap-2.5 border-l-2 py-1.5 pl-3 text-xs transition-colors duration-200",
                active === stage.id
                  ? "-ml-px border-primary font-semibold text-foreground"
                  : "-ml-px border-transparent text-muted hover:text-foreground",
              ].join(" ")}
            >
              <span
                aria-hidden="true"
                className={[
                  "flex h-4 w-4 shrink-0 items-center justify-center rounded font-mono text-2xs",
                  stage.done ? "bg-primary/15 text-primary" : "bg-surface-2 text-muted",
                ].join(" ")}
              >
                {index + 1}
              </span>
              <span className="truncate">{stage.label}</span>
              {!stage.done ? <span className="sr-only">(not run)</span> : null}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}
