import type { SwotAnalysis, SwotFactor } from "../api/types";

const QUADRANTS: {
  key: keyof Pick<SwotAnalysis, "strengths" | "weaknesses" | "opportunities" | "threats">;
  title: string;
  text: string;
  rule: string;
  bar: string;
}[] = [
  {
    key: "strengths",
    title: "Strengths",
    text: "text-success",
    rule: "bg-success",
    bar: "bg-success",
  },
  {
    key: "weaknesses",
    title: "Weaknesses",
    text: "text-danger",
    rule: "bg-danger",
    bar: "bg-danger",
  },
  {
    key: "opportunities",
    title: "Opportunities",
    text: "text-info",
    rule: "bg-info",
    bar: "bg-info",
  },
  {
    key: "threats",
    title: "Threats",
    text: "text-warning",
    rule: "bg-warning",
    bar: "bg-warning",
  },
];

const SOURCE_LABEL: Record<string, string> = {
  computed_financial: "computed",
  computed_market: "computed",
  analyst_input: "analyst",
};

/** Five segments, filled to the impact score. */
function ImpactBar({ score, tone }: { score: number; tone: string }) {
  return (
    <span
      className="flex shrink-0 items-center gap-[3px]" /* lint-ok: 5-segment impact bar */
      role="img"
      aria-label={`Impact ${score} of 5`}
      title={`Impact ${score}/5`}
    >
      {[1, 2, 3, 4, 5].map((n) => (
        <span
          key={n}
          className={`h-2.5 w-[5px] rounded-[1px] ${n <= score ? tone : "bg-border"}`} /* lint-ok: impact segment */
        />
      ))}
      <span className="num ml-1 text-2xs text-muted">{score}</span>
    </span>
  );
}

function FactorRow({ factor, tone }: { factor: SwotFactor; tone: string }) {
  const isAnalyst = factor.source === "analyst_input";
  return (
    <li className="border-t border-border/40 py-2.5 first:border-t-0 first:pt-0">
      <div className="flex items-start justify-between gap-3">
        <span className="text-sm font-medium leading-snug text-foreground">
          {factor.factor}
        </span>
        <ImpactBar score={factor.impact_score} tone={tone} />
      </div>
      <p className="mt-1 text-xs leading-relaxed text-muted">{factor.evidence}</p>
      <span className={`chip mt-2 ${isAnalyst ? "chip-neutral" : "chip-computed"}`}>
        {SOURCE_LABEL[factor.source] ?? factor.source}
        {factor.benchmark_basis ? ` · ${factor.benchmark_basis.replace(/_/g, " ").toLowerCase()}` : ""}
      </span>
    </li>
  );
}

export default function SWOTGrid({ analysis }: { analysis: SwotAnalysis }) {
  const basis = analysis.calculation_basis ?? {};

  return (
    <div className="space-y-3">
      <div className="grid gap-3 md:grid-cols-2">
        {QUADRANTS.map(({ key, title, text, rule, bar }) => {
          const factors = analysis[key] ?? [];
          return (
            <section key={key} className="panel overflow-hidden">
              {/* A single rule in the quadrant's own colour marks it without
                  boxing the whole card in a saturated border. */}
              <div className={`h-0.5 w-full ${rule}`} />
              <div className="p-4">
                <h3 className="mb-3 flex items-baseline gap-2">
                  <span className={`text-2xs font-semibold uppercase tracking-label ${text}`}>
                    {title}
                  </span>
                  <span className="num text-2xs text-muted">{factors.length}</span>
                </h3>
                {factors.length === 0 ? (
                  <p className="text-xs leading-relaxed text-muted">
                    No factor cleared the scoring threshold. That is an output, not a gap —
                    metrics inside the neutral band deliberately produce nothing.
                  </p>
                ) : (
                  <ul>
                    {factors.map((factor) => (
                      <FactorRow
                        key={`${factor.factor}-${factor.metric ?? ""}`}
                        factor={factor}
                        tone={bar}
                      />
                    ))}
                  </ul>
                )}
              </div>
            </section>
          );
        })}
      </div>

      <p className="panel-inset p-3 text-2xs leading-relaxed text-muted">
        Benchmarked against{" "}
        <span className="text-foreground">
          {basis.peers_reporting_financials ?? 0} peer(s) reporting financials
        </span>
        , minimum {basis.min_peers_for_peer_benchmark ?? "?"} for a peer-set median.
        Factors marked <span className="text-primary">computed</span> come from a
        benchmark comparison; <span className="text-muted">analyst</span> factors are
        human judgements carried through unchanged.
      </p>
    </div>
  );
}
