import type { AllocationEntry, AllocationRun } from "../api/types";
import { QuadrantFrame, makeScales } from "./QuadrantChart";

/**
 * Every business unit on one GE-McKinsey grid, sized by revenue, filled by what the
 * allocator did with it.
 */

const SIZE = 420;
const PAD = 48;
const { scaleX, scaleY } = makeScales(SIZE, PAD);

const OUTCOME_FILL: Record<string, string> = {
  FUNDED: "var(--success)",
  PARTIALLY_FUNDED: "var(--warning)",
  FLOOR_ONLY: "var(--warning)",
  UNFUNDED: "var(--danger)",
  CONTRIBUTOR: "var(--info)",
};

const OUTCOME_COPY: Record<string, string> = {
  FUNDED: "received its full request",
  PARTIALLY_FUNDED: "the budget ran out inside this unit",
  FLOOR_ONLY: "kept operating, nothing discretionary",
  UNFUNDED: "nothing available by the time priority reached it",
  CONTRIBUTOR: "HARVEST_DIVEST — funds the pool rather than drawing from it",
};

/** Radius from revenue, with AREA proportional to revenue. */
function radiusFor(revenue: number | null, maxRevenue: number): number {
  const MIN_R = 6;
  const MAX_R = 26;
  if (!revenue || revenue <= 0 || maxRevenue <= 0) return MIN_R;
  return MIN_R + (MAX_R - MIN_R) * Math.sqrt(revenue / maxRevenue);
}

function money(value: number): string {
  if (Math.abs(value) >= 1e9) return `${(value / 1e9).toFixed(2)}bn`;
  if (Math.abs(value) >= 1e6) return `${(value / 1e6).toFixed(1)}m`;
  if (Math.abs(value) >= 1e3) return `${(value / 1e3).toFixed(1)}k`;
  return value.toFixed(0);
}

function Bubble({ entry, maxRevenue }: { entry: AllocationEntry; maxRevenue: number }) {
  const fill = OUTCOME_FILL[entry.outcome] ?? "var(--muted-foreground)";
  const cx = scaleX(entry.strength);
  const cy = scaleY(entry.attractiveness);
  const r = radiusFor(entry.revenue, maxRevenue);
  const label = entry.name.length > 22 ? `${entry.name.slice(0, 21)}…` : entry.name;

  // A unit at the floor of either axis sits on the plot edge, and a centred label there
  // runs off the chart - which clipped the name of the one unit a reader most wants to
  // identify, the one being harvested.
  const EDGE = 70;
  const anchor = cx < PAD + EDGE ? "start" : cx > SIZE - PAD - EDGE ? "end" : "middle";
  const labelX = anchor === "start" ? PAD + 2 : anchor === "end" ? SIZE - PAD - 2 : cx;
  // Flip the label under the bubble when it would collide with the top frame.
  const above = cy - r - 4 > PAD + 8;

  return (
    <g>
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill={fill}
        fillOpacity={0.24}
        stroke={fill}
        strokeWidth={1.4}
      />
      <text
        x={labelX}
        y={above ? cy - r - 4 : cy + r + 11}
        textAnchor={anchor}
        fontSize={9}
        fill="var(--muted-foreground)"
      >
        {label}
      </text>
    </g>
  );
}

export default function PortfolioGrid({ run }: { run: AllocationRun }) {
  const maxRevenue = Math.max(...run.allocations.map((a) => a.revenue ?? 0), 0);
  const basis = run.calculation_basis ?? {};
  const pool = basis.pool ?? {};
  const noRevenue = run.allocations.filter((a) => !a.revenue).length;

  return (
    <div className="space-y-3">
      <div className="panel p-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <span className="label">Budget-constrained allocation</span>
            <p className="num text-sm text-foreground">
              budget {money(run.budget)}
              {run.harvest_contribution > 0 && (
                <>
                  {" + "}
                  <span className="text-info">
                    {money(run.harvest_contribution)} harvest
                  </span>
                </>
              )}
              {" = pool "}
              {money(pool.pool ?? run.budget + run.harvest_contribution)}
            </p>
          </div>
          <p className="num text-xs text-muted">
            floors {money(pool.floors_total ?? 0)} · discretionary{" "}
            {money(pool.discretionary_allocated ?? 0)} · unallocated{" "}
            {money(pool.unallocated ?? 0)}
          </p>
        </div>
        <p className="mt-3 border-t border-border/60 pt-2.5 text-2xs leading-relaxed text-muted">
          {basis.status}
        </p>
      </div>

      <div className="panel p-4">
        <svg
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          className="mx-auto block w-full max-w-xl"
          role="img"
          aria-label={`Portfolio grid: ${run.allocations.length} business units plotted by competitive strength and market attractiveness, sized by revenue`}
        >
          <QuadrantFrame size={SIZE} pad={PAD} />
          {run.allocations.map((entry) => (
            <Bubble key={entry.entity_key} entry={entry} maxRevenue={maxRevenue} />
          ))}
        </svg>

        <div className="mt-3 flex flex-wrap justify-center gap-x-4 gap-y-1.5 border-t border-border/50 pt-3 text-2xs text-muted">
          {Object.entries(OUTCOME_FILL).map(([outcome, colour]) => (
            <span key={outcome} className="inline-flex items-center gap-1.5">
              <span
                className="inline-block h-2 w-2 rounded-full ring-2"
                style={{ backgroundColor: `${colour}44`, boxShadow: `0 0 0 1px ${colour}` }}
              />
              {outcome.replace(/_/g, " ").toLowerCase()}
            </span>
          ))}
        </div>
        <p className="mt-2 text-center text-2xs text-muted">
          Bubble area is proportional to revenue.
          {noRevenue > 0 &&
            ` ${noRevenue} unit(s) reported no revenue and are drawn at the minimum size.`}
        </p>
      </div>

      {run.marginal_unit && (
        <div className="panel border-warning/40 bg-warning/[0.04] p-4">
          <span className="label text-warning">The marginal unit</span>
          <p className="text-sm font-medium text-foreground">
            {run.marginal_unit.name}{" "}
            <span className="num text-xs font-normal text-muted">
              rank {run.marginal_unit.rank} · short by{" "}
              {money(Number(run.marginal_unit.shortfall ?? 0))}
            </span>
          </p>
          <p className="mt-1.5 text-xs leading-relaxed text-muted">
            {run.marginal_unit.note}
          </p>
        </div>
      )}

      <div className="panel overflow-x-auto p-4">
        <h4 className="label">Priority order</h4>
        <table className="data-table">
          <thead>
            <tr>
              <th className="pr-3">#</th>
              <th className="pr-3">Unit</th>
              <th className="pr-3 text-right">A × S</th>
              <th className="pr-3 text-right">entropy ×</th>
              <th className="pr-3 text-right">priority</th>
              <th className="pr-3 text-right">requested</th>
              <th className="pr-3 text-right">allocated</th>
              <th>outcome</th>
            </tr>
          </thead>
          <tbody>
            {run.allocations.map((entry) => (
              <tr key={entry.entity_key} className="align-top">
                <td className="num pr-3 text-muted">{entry.rank}</td>
                <td className="pr-3">
                  <span className="text-foreground">{entry.name}</span>
                  <span className="ml-1.5 text-2xs text-muted">
                    {entry.quadrant.replace(/_/g, " ")}
                  </span>
                </td>
                <td className="num pr-3 text-right text-muted">
                  {entry.attractiveness.toFixed(2)} × {entry.strength.toFixed(2)}
                </td>
                <td className="num pr-3 text-right text-muted">
                  {entry.entropy_bits === null ? (
                    <span className="text-muted" title="no uncertainty run; not discounted">
                      —
                    </span>
                  ) : (
                    entry.entropy_discount.toFixed(3)
                  )}
                </td>
                <td className="num pr-3 text-right font-semibold text-primary">
                  {entry.priority_score.toFixed(2)}
                </td>
                <td className="num pr-3 text-right text-muted">
                  {money(entry.capital_requested)}
                  {entry.capital_floor > 0 && (
                    <span className="text-muted"> ({money(entry.capital_floor)} floor)</span>
                  )}
                </td>
                <td className="num pr-3 text-right text-foreground">
                  {money(entry.allocated)}
                  {entry.contributed > 0 && (
                    <span className="text-info"> −{money(entry.contributed)}</span>
                  )}
                </td>
                <td>
                  <span
                    className="chip whitespace-nowrap"
                    style={{
                      color: OUTCOME_FILL[entry.outcome],
                      borderColor: `${OUTCOME_FILL[entry.outcome]}40`,
                      backgroundColor: `${OUTCOME_FILL[entry.outcome]}14`,
                    }}
                    title={OUTCOME_COPY[entry.outcome]}
                  >
                    {entry.outcome.replace(/_/g, " ")}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <details className="panel p-4">
        <summary className="label mb-0 cursor-pointer">
          The allocation rule, and whose it is
        </summary>
        <p className="mt-2 text-xs leading-relaxed text-muted">{basis.framework_note}</p>
        <p className="mt-2 num text-2xs text-primary">{basis.priority_formula}</p>
        <ol className="mt-2 list-decimal space-y-1 pl-4 text-xs leading-relaxed text-muted">
          {(basis.allocation_order ?? []).map((step: string) => (
            <li key={step}>{step.replace(/^\d\.\s*/, "")}</li>
          ))}
        </ol>
        <p className="mt-2 text-xs leading-relaxed text-muted">{basis.greedy_note}</p>
        {(basis.warnings ?? []).map((warning: string) => (
          <p key={warning} className="mt-2 text-xs leading-relaxed text-warning">
            {warning}
          </p>
        ))}
      </details>
    </div>
  );
}
