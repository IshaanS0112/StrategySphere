import { useState } from "react";

import type { ThreePoint, UncertaintyAnalysis } from "../api/types";

/**
 * Quadrant probabilities, credible intervals, and the entropy — beside the point
 * verdict, never instead of it.
 */

const MAX_ENTROPY = 1.584962500721156;

const STABILITY_STYLE: Record<string, string> = {
  DECISIVE: "chip-positive",
  LEANING: "chip-caution",
  CONTESTED: "chip-negative",
};

const BAND_FILL: Record<string, string> = {
  DECISIVE: "bg-success",
  LEANING: "bg-warning",
  CONTESTED: "bg-danger",
};

const STABILITY_COPY: Record<string, string> = {
  DECISIVE: "Nearly every draw lands in the same quadrant. The verdict survives the stated uncertainty.",
  LEANING: "A clear modal quadrant, with real mass on a runner-up. Quote the verdict with the probability attached.",
  CONTESTED: "The draws are close to a coin flip. Do not present the quadrant on its own.",
};

const QUADRANT_TONE: Record<string, string> = {
  INVEST_GROW: "bg-success",
  SELECTIVE_INVEST: "bg-warning",
  HARVEST_DIVEST: "bg-danger",
};

const INPUT_LABEL: Record<string, string> = {
  market_growth_pct: "Market growth (%)",
  market_size_usd_bn: "Market size ($bn)",
  industry_operating_margin_pct: "Industry operating margin (%)",
  competitive_intensity_score: "Competitive intensity (1-5)",
  competitive_strength_score: "Competitive strength (1-5)",
};

function ProbabilityBar({ quadrant, value }: { quadrant: string; value: number }) {
  return (
    <div className="py-1.5">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-xs text-foreground">{quadrant.replace(/_/g, " ")}</span>
        <span className="num text-xs font-semibold text-foreground">
          {(value * 100).toFixed(1)}%
        </span>
      </div>
      <div className="meter mt-1.5">
        <div
          className={`meter-fill ${QUADRANT_TONE[quadrant] ?? "bg-muted"}`}
          style={{ width: `${Math.max(value * 100, value > 0 ? 1.5 : 0)}%` }}
        />
      </div>
    </div>
  );
}

function Interval({ label, interval }: { label: string; interval: number[] }) {
  const [low, high] = interval;
  // Both axes run 1-5, so the band is drawn on that fixed scale rather than
  // rescaled to itself - a wide band and a narrow one must look different.
  const left = ((low - 1) / 4) * 100;
  const width = Math.max(((high - low) / 4) * 100, 0.6);
  return (
    <div className="py-2">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-xs text-foreground">{label}</span>
        <span className="num text-xs font-semibold text-foreground">
          {low.toFixed(2)} – {high.toFixed(2)}
        </span>
      </div>
      <div className="relative mt-2 h-3">
        <div className="absolute top-1 h-1 w-full rounded-full bg-background ring-1 ring-inset ring-border/70" />
        <div
          className="absolute top-1 h-1 rounded-full bg-primary"
          style={{ left: `${left}%`, width: `${width}%` }}
        />
        {/* End caps, so a very narrow interval is still visible as a range. */}
        <div className="absolute top-0 h-3 w-px bg-primary/70" style={{ left: `${left}%` }} />
        <div
          className="absolute top-0 h-3 w-px bg-primary/70"
          style={{ left: `calc(${left + width}% - 1px)` }}
        />
      </div>
      <div className="mt-1 flex justify-between text-2xs text-subtle">
        <span>1</span>
        <span>5</span>
      </div>
    </div>
  );
}

export interface UncertaintyPanelProps {
  result: UncertaintyAnalysis | null;
  busy: boolean;
  onRun: (inputs: Record<string, ThreePoint> | undefined) => void;
}

export default function UncertaintyPanel({ result, busy, onRun }: UncertaintyPanelProps) {
  const [key, setKey] = useState("market_growth_pct");
  const [low, setLow] = useState("");
  const [mode, setMode] = useState("");
  const [high, setHigh] = useState("");
  const [staged, setStaged] = useState<Record<string, ThreePoint>>({});

  function stage() {
    const parsed = { low: Number(low), mode: Number(mode), high: Number(high) };
    if ([parsed.low, parsed.mode, parsed.high].some((n) => Number.isNaN(n))) return;
    setStaged((prev) => ({ ...prev, [key]: parsed }));
    setLow("");
    setMode("");
    setHigh("");
  }

  const entropyPct = result ? Math.min(result.entropy_bits / MAX_ENTROPY, 1) * 100 : 0;
  const basis = result?.calculation_basis ?? {};
  const analystWarning = basis["THE DISTRIBUTIONS ARE ANALYST-SUPPLIED"] as string | undefined;

  return (
    <div className="space-y-3">
      <div className="panel p-4">
        <span className="label">State a range for an input</span>
        <div className="flex flex-wrap items-end gap-2">
          <select className="field max-w-60" value={key} onChange={(e) => setKey(e.target.value)}>
            {Object.entries(INPUT_LABEL).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <input className="field w-20" placeholder="low" value={low} onChange={(e) => setLow(e.target.value)} />
          <input className="field w-20" placeholder="mode" value={mode} onChange={(e) => setMode(e.target.value)} />
          <input className="field w-20" placeholder="high" value={high} onChange={(e) => setHigh(e.target.value)} />
          <button className="btn-ghost" onClick={stage} disabled={busy}>
            Add
          </button>
        </div>

        {Object.keys(staged).length > 0 && (
          <ul className="mt-3 space-y-1">
            {Object.entries(staged).map(([name, range]) => (
              <li key={name} className="flex items-center justify-between text-xs text-muted">
                <span>
                  {INPUT_LABEL[name] ?? name}{" "}
                  <span className="font-mono text-foreground">
                    {range.low} / {range.mode} / {range.high}
                  </span>
                </span>
                <button
                  className="text-2xs text-muted hover:text-danger"
                  onClick={() => setStaged((prev) => {
                    const next = { ...prev };
                    delete next[name];
                    return next;
                  })}
                >
                  remove
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-3 flex items-center gap-2">
          <button
            className="btn-primary"
            disabled={busy}
            onClick={() => onRun(Object.keys(staged).length ? staged : undefined)}
          >
            {busy ? "Sampling…" : "Run Monte Carlo"}
          </button>
          <span className="text-2xs text-muted">
            Inputs you do not state are held fixed, so the spread is a lower bound on
            the real uncertainty.
          </span>
        </div>
      </div>

      {!result ? (
        <p className="panel p-5 text-sm text-muted">Not run yet.</p>
      ) : (
        <>
          <div className="panel p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <span className="label">Point verdict</span>
                <p className="text-xl font-semibold tracking-tight text-foreground">
                  {result.point_quadrant.replace(/_/g, " ")}
                </p>
                <p className="mt-1 text-2xs text-muted">
                  Still the headline. The distribution below sits beside it.
                </p>
              </div>
              <div className="text-right">
                <span className="label">Verdict stability</span>
                <span className={`chip ${STABILITY_STYLE[result.verdict_stability]}`}>
                  {result.verdict_stability}
                </span>
                <p className="num mt-1.5 text-xs text-muted">
                  entropy {result.entropy_bits.toFixed(3)} / {MAX_ENTROPY.toFixed(3)} bits
                </p>
              </div>
            </div>

            {/* Entropy as a share of its own maximum, log2(3). The three band
                edges are ticked, so the chip is not the only signal. */}
            <div className="relative mt-4">
              <div className="meter">
                <div
                  className={`meter-fill ${BAND_FILL[result.verdict_stability] ?? "bg-chart-2"}`}
                  style={{ width: `${Math.max(entropyPct, 1.5)}%` }}
                />
              </div>
              <div className="mt-1 flex justify-between text-2xs text-subtle">
                <span>0 · certain</span>
                <span>{MAX_ENTROPY.toFixed(2)} · coin flip</span>
              </div>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-muted">
              {STABILITY_COPY[result.verdict_stability]}
            </p>

            {result.modal_quadrant !== result.point_quadrant && (
              <p className="mt-3 rounded-md border border-warning/30 bg-background/60 p-3 text-xs leading-relaxed text-foreground">
                The most common quadrant across draws is{" "}
                <span className="text-warning">
                  {result.modal_quadrant.replace(/_/g, " ")}
                </span>
                , not the point verdict. The point estimate sits near a boundary the
                sampled mass straddles — a finding about the inputs, not a conflict to
                resolve in favour of either number.
              </p>
            )}
          </div>

          <div className="panel p-4">
            <h4 className="label">
              Quadrant probabilities · {result.draws.toLocaleString()} draws · seed{" "}
              {result.seed}
            </h4>
            {Object.entries(result.quadrant_probabilities).map(([quadrant, value]) => (
              <ProbabilityBar key={quadrant} quadrant={quadrant} value={value} />
            ))}
          </div>

          <div className="panel p-4">
            <h4 className="label">90% credible intervals</h4>
            <p className="mb-1 text-2xs text-muted">
              Empirical percentiles of the draws, drawn on the fixed 1–5 axis rather
              than rescaled to themselves, so a wide band looks wide.
            </p>
            <Interval label="Market attractiveness" interval={result.attractiveness_ci_90} />
            <Interval label="Competitive strength" interval={result.strength_ci_90} />
          </div>

          {analystWarning && (
            <div className="panel border-warning/40 bg-warning/[0.04] p-4">
              <h4 className="label text-warning">
                These probabilities are conditional on ranges you typed
              </h4>
              <p className="text-xs leading-relaxed text-muted">{analystWarning}</p>
            </div>
          )}

          <details className="panel p-4">
            <summary className="label mb-0 cursor-pointer">
              Method, and how this differs from sensitivity
            </summary>
            <p className="mt-2 text-xs leading-relaxed text-muted">
              {basis.versus_sensitivity_analysis}
            </p>
            <p className="mt-2 num text-2xs text-primary">
              {basis.distribution_formula}
            </p>
            <p className="mt-2 text-xs leading-relaxed text-muted">
              {basis.distribution_choice_note}
            </p>
            <p className="mt-2 text-xs leading-relaxed text-muted">
              {basis.held_fixed_note}
            </p>
            <p className="mt-2 text-xs leading-relaxed text-muted">{basis.determinism}</p>
          </details>
        </>
      )}
    </div>
  );
}
