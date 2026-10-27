import type { MarketAttractiveness } from "../api/types";
import { QuadrantFrame, makeScales } from "./QuadrantChart";

/** The GE-McKinsey grid, drawn to scale. */

const SIZE = 340;
const PAD = 44;
const { scaleX, scaleY } = makeScales(SIZE, PAD);

const QUADRANT_COPY: Record<string, string> = {
  INVEST_GROW: "Attractive market, strong position — fund growth and defend share.",
  SELECTIVE_INVEST:
    "One axis is strong and the other is not — invest only where an advantage already exists.",
  HARVEST_DIVEST: "Weak position in an unattractive market — harvest cash, assess exit.",
};
const QUADRANT_TONE: Record<string, string> = {
  INVEST_GROW: "text-success",
  SELECTIVE_INVEST: "text-foreground",
  HARVEST_DIVEST: "text-danger",
};

function ScoreRow({ label, value, note }: { label: string; value: number; note?: string }) {
  // A 1-5 score is easier to compare as a filled track than as four decimals
  // in a column, so the number and the bar are shown together.
  const pct = ((value - 1) / 4) * 100;
  return (
    <div className="border-t border-border/50 py-2 first:border-t-0">
      <div className="flex items-baseline justify-between gap-4">
        <span className="text-xs text-muted">
          {label}
          {note ? <span className="ml-1.5 text-2xs text-muted">{note}</span> : null}
        </span>
        <span className="num text-sm font-semibold text-foreground">{value.toFixed(2)}</span>
      </div>
      <div className="meter mt-1.5">
        <div className="meter-fill bg-chart-2" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export default function AttractivenessMatrix({ result }: { result: MarketAttractiveness }) {
  const x = scaleX(result.competitive_strength_score);
  const y = scaleY(result.overall_attractiveness_score);
  const structure = result.calculation_basis?.market_structure ?? {};
  const imputed: string[] = result.calculation_basis?.imputed_axes ?? [];

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="panel flex items-center justify-center p-4">
        {/* Capped, and centred. A square viewBox stretched to a wide column
            renders a 700px-tall chart that pushes the rest of the page off
            screen - and scales every label up with it. */}
        <svg
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          className="mx-auto block w-full max-w-sm"
          role="img"
          aria-label={`GE-McKinsey matrix: attractiveness ${result.overall_attractiveness_score.toFixed(2)}, competitive strength ${result.competitive_strength_score.toFixed(2)}, ${result.quadrant.replace(/_/g, " ")}`}
        >
          <defs>
            <radialGradient id="pointGlow">
              <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.45" />
              <stop offset="100%" stopColor="var(--primary)" stopOpacity="0" />
            </radialGradient>
          </defs>
          <QuadrantFrame size={SIZE} pad={PAD} />

          {/* Guide lines down to each axis: the point's coordinates are the
              output, so make them readable off the axes directly. */}
          <line x1={x} y1={y} x2={x} y2={SIZE - PAD} stroke="var(--primary)" strokeOpacity="0.3" strokeDasharray="2 3" />
          <line x1={PAD} y1={y} x2={x} y2={y} stroke="var(--primary)" strokeOpacity="0.3" strokeDasharray="2 3" />

          <circle cx={x} cy={y} r="22" fill="url(#pointGlow)" />
          <circle cx={x} cy={y} r="7" fill="var(--primary)" fillOpacity="0.25" />
          <circle cx={x} cy={y} r="4" fill="var(--primary)" stroke="var(--background)" strokeWidth="1.2" />
          <text
            x={x + 11}
            y={y - 9}
            fontSize="10"
            fill="var(--primary)"
            fontFamily="JetBrains Mono, monospace"
            fontWeight="600"
          >
            {result.overall_attractiveness_score.toFixed(2)} /{" "}
            {result.competitive_strength_score.toFixed(2)}
          </text>
        </svg>
      </div>

      <div className="space-y-3">
        <div className="panel p-4">
          <span className="label">Verdict</span>
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`text-lg font-semibold tracking-tight ${
                QUADRANT_TONE[result.quadrant] ?? "text-foreground"
              }`}
            >
              {result.quadrant.replace(/_/g, " ")}
            </span>
            {result.borderline && <span className="chip chip-caution">borderline</span>}
          </div>
          <p className="mt-1.5 text-xs leading-relaxed text-muted">
            {QUADRANT_COPY[result.quadrant]}
          </p>
          {result.borderline && (
            <p className="mt-2 text-xs leading-relaxed text-muted">
              {result.calculation_basis?.quadrant_placement?.borderline_note ??
                "The position sits close to a quadrant boundary; treat the verdict as provisional."}
            </p>
          )}
        </div>

        <div className="panel p-4">
          <h4 className="label">Axis inputs · 1–5</h4>
          <ScoreRow
            label="Market growth"
            value={result.market_growth_score}
            note={imputed.includes("market_growth") ? "imputed" : undefined}
          />
          <ScoreRow
            label="Market size"
            value={result.market_size_score}
            note={imputed.includes("market_size") ? "imputed" : undefined}
          />
          <ScoreRow
            label="Industry profitability"
            value={result.profitability_score}
            note={imputed.includes("industry_profitability") ? "imputed" : undefined}
          />
          <ScoreRow
            label="Competitive intensity"
            value={result.competitive_intensity_score}
            note={structure.hhi ? `HHI ${Math.round(structure.hhi)}` : "no shares"}
          />
        </div>

        {structure.concentration_band && (
          <p className="text-xs leading-relaxed text-muted">
            Market is <span className="text-foreground">{structure.concentration_band}</span>{" "}
            (HHI {Math.round(structure.hhi)}) on DOJ/FTC 2023 Merger Guidelines bands.{" "}
            {structure.dispersion_note}. Unnamed residual share:{" "}
            {structure.residual_share_pct}%.
          </p>
        )}
      </div>
    </div>
  );
}
