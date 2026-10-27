import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { api } from "../api/client";
import type { Timeline, TimelinePoint } from "../api/types";
import { useBreadcrumb } from "../components/AppShell";
import { QuadrantFrame, makeScales } from "../components/QuadrantChart";

/** Quadrant migration across reporting periods. */

const SIZE = 340;
const PAD = 44;
const { scaleX, scaleY } = makeScales(SIZE, PAD);

const TREND_TONE: Record<string, string> = {
  IMPROVING: "text-success",
  STABLE: "text-muted",
  DETERIORATING: "text-danger",
  INSUFFICIENT_DATA: "text-muted",
};

function MigrationPlot({ points }: { points: TimelinePoint[] }) {
  const path = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${scaleX(p.strength)} ${scaleY(p.attractiveness)}`)
    .join(" ");

  return (
    <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="w-full" role="img" aria-label="Quadrant migration">
      <QuadrantFrame size={SIZE} pad={PAD} corners={false} />

      <path d={path} fill="none" stroke="var(--primary)" strokeWidth="1.5" strokeOpacity="0.5" />
      {points.map((p, i) => {
        const last = i === points.length - 1;
        return (
          <g key={p.company_id}>
            <circle
              cx={scaleX(p.strength)}
              cy={scaleY(p.attractiveness)}
              r={last ? 5 : 3.5}
              fill="var(--primary)"
              fillOpacity={last ? 1 : 0.35}
              stroke={p.borderline ? "var(--warning)" : "none"}
              strokeWidth={p.borderline ? 1.5 : 0}
            />
            {/* Periods that barely moved land on top of each other, so labels
                alternate above and below the point rather than overprinting. */}
            <text
              x={scaleX(p.strength) + 8}
              y={scaleY(p.attractiveness) + (i % 2 === 0 ? -7 : 13)}
              fontSize="9"
              fill="var(--muted-foreground)"
              fontFamily="Geist Mono, monospace"
            >
              {p.period_label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

export default function TimelineView() {
  const { entityKey = "" } = useParams();
  const [timeline, setTimeline] = useState<Timeline | null>(null);
  useBreadcrumb(timeline?.entity_key ?? entityKey ?? null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setTimeline(await api.getTimeline(entityKey));
    } catch (err) {
      setError((err as Error).message);
    }
  }, [entityKey]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!timeline) {
    return (
      <p className="panel p-6 text-sm text-muted">
        {error ?? "Loading…"}{" "}
        <Link to="/" className="text-primary">
          Back
        </Link>
      </p>
    );
  }

  const basis = timeline.calculation_basis ?? {};

  return (
    <div className="space-y-5">
      <header className="panel p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-lg font-semibold text-foreground">{timeline.entity_key}</h1>
            <p className="text-xs text-muted">{timeline.points.length} scored period(s)</p>
          </div>
          <Link to="/" className="btn-ghost">
            All companies
          </Link>
        </div>
        <p className="mt-3 border-t border-border pt-3 text-sm text-foreground">
          {timeline.summary}
        </p>
      </header>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="panel p-3">
          {timeline.points.length >= 2 ? (
            <MigrationPlot points={timeline.points} />
          ) : (
            <p className="p-6 text-sm text-muted">
              A migration path needs at least two scored periods.
            </p>
          )}
        </div>

        <div className="space-y-3">
          <div className="panel p-4">
            <h4 className="label">
              Trend
            </h4>
            <div className="flex items-baseline justify-between border-t border-border/60 py-1.5">
              <span className="text-xs text-muted">Market attractiveness</span>
              <span className={`text-sm ${TREND_TONE[timeline.attractiveness_trend]}`}>
                {timeline.attractiveness_trend.replace(/_/g, " ").toLowerCase()}{" "}
                <span className="num text-xs text-muted">
                  {basis.attractiveness_delta > 0 ? "+" : ""}
                  {basis.attractiveness_delta}
                </span>
              </span>
            </div>
            <div className="flex items-baseline justify-between border-t border-border/60 py-1.5">
              <span className="text-xs text-muted">Competitive strength</span>
              <span className={`text-sm ${TREND_TONE[timeline.strength_trend]}`}>
                {timeline.strength_trend.replace(/_/g, " ").toLowerCase()}{" "}
                <span className="num text-xs text-muted">
                  {basis.strength_delta > 0 ? "+" : ""}
                  {basis.strength_delta}
                </span>
              </span>
            </div>
            <p className="mt-2 text-2xs leading-relaxed text-muted">
              Moves smaller than {basis.material_delta_threshold} on a 1–5 axis are
              reported as stable rather than as a trend.
            </p>
          </div>

          {timeline.quadrant_changes.length > 0 && (
            <div className="panel p-4">
              <h4 className="label">
                Quadrant changes
              </h4>
              {timeline.quadrant_changes.map((change, i) => (
                <div key={i} className="border-t border-border/60 py-2 first:border-t-0">
                  <span className="text-sm text-foreground">
                    {change.from_period} → {change.to_period}
                  </span>
                  <p className="text-xs text-muted">
                    {change.from_quadrant?.replace(/_/g, " ")} →{" "}
                    {change.to_quadrant?.replace(/_/g, " ")}
                  </p>
                  {change.either_side_borderline && (
                    <span className="chip mt-1 border-warning/50 text-warning">
                      a period was borderline
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}

          {timeline.excluded.length > 0 && (
            <div className="panel border-warning/30 p-4">
              <h4 className="mb-1 text-xs font-semibold uppercase tracking-wider text-warning">
                Excluded periods
              </h4>
              {timeline.excluded.map((entry, i) => (
                <p key={i} className="py-1 text-xs leading-relaxed text-muted">
                  <span className="text-foreground">{entry.period_label ?? "unlabelled"}</span>
                  {" — "}
                  {entry.reason}
                </p>
              ))}
            </div>
          )}
        </div>
      </div>

      <p className="text-xs leading-relaxed text-muted">
        {basis.trend_method} {basis.borderline_caveat}
      </p>
    </div>
  );
}
