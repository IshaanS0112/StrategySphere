import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { api, optional } from "../api/client";
import type {
  Company,
  Competitor,
  MarketAttractiveness,
  PortersAnalysis,
  PricingRecommendation,
  Scenario,
  Sensitivity,
  StrategyReport,
  SwotAnalysis,
  ThreePoint,
  UncertaintyAnalysis,
} from "../api/types";
import { useBreadcrumb } from "../components/AppShell";
import BasisInspector from "../components/BasisInspector";
import AttractivenessMatrix from "../components/AttractivenessMatrix";
import PortersView from "../components/PortersView";
import ScenarioPanel from "../components/ScenarioPanel";
import PricingView from "../components/PricingView";
import ReportView from "../components/ReportView";
import SensitivityPanel from "../components/SensitivityPanel";
import SWOTGrid from "../components/SWOTGrid";
import { PageSkeleton } from "../components/Skeleton";
import StageNav, { type StageLink } from "../components/StageNav";
import { useToast } from "../components/Toast";
import UncertaintyPanel from "../components/UncertaintyPanel";

type Stage =
  | "swot"
  | "matrix"
  | "pricing"
  | "report"
  | "porters"
  | "scenario"
  | "uncertainty";

const STAGE_LABEL: Record<Stage, string> = {
  swot: "SWOT",
  matrix: "Matrix",
  pricing: "Pricing",
  report: "Report",
  porters: "Five Forces",
  scenario: "Scenario",
  uncertainty: "Uncertainty",
};

function StageShell({
  id,
  index,
  title,
  subtitle,
  action,
  done,
  basis,
  generatedAt,
  children,
}: {
  id: string;
  index: number;
  title: string;
  subtitle: string;
  action: React.ReactNode;
  done?: boolean;
  basis?: Record<string, unknown> | null;
  generatedAt?: string | null;
  children?: React.ReactNode;
}) {
  const [inspecting, setInspecting] = useState(false);

  return (
    <section id={id} className="scroll-mt-20">
      <div className="rule" />
      <div className="flex flex-wrap items-start justify-between gap-4 pb-4 pt-5">
        <div className="flex min-w-0 gap-4">
          {/* A numbered section, which is the Paper signature. The number is
              muted until the stage has run, so the page still reads as a
              pipeline with progress. */}
          <span
            aria-hidden="true"
            className={`section-no mt-0.5 shrink-0 ${done ? "text-primary" : ""}`}
          >
            {String(index).padStart(2, "0")}
          </span>
          <div className="min-w-0">
            <h2 className="section-title">{title}</h2>
            <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted">{subtitle}</p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {basis ? (
            <button
              type="button"
              onClick={() => setInspecting(true)}
              className="btn-ghost h-7 gap-1.5 px-2 text-2xs"
              title="Show the inputs this stage's figures were computed from"
            >
              <svg viewBox="0 0 16 16" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                <circle cx="7" cy="7" r="4.5" />
                <path d="m10.5 10.5 3 3" strokeLinecap="round" />
              </svg>
              Inspect
            </button>
          ) : null}
          {action}
        </div>
      </div>
      <div className="pl-0 sm:pl-10">{children}</div>

      <BasisInspector
        title={title}
        basis={basis}
        generatedAt={generatedAt}
        open={inspecting}
        onClose={() => setInspecting(false)}
      />
    </section>
  );
}

function NotRun({ children }: { children: React.ReactNode }) {
  return (
    <div className="panel border-dashed p-6 text-center">
      <p className="text-xs text-muted">{children}</p>
    </div>
  );
}

export default function CompanyDetail() {
  const { companyId = "" } = useParams();

  const [company, setCompany] = useState<Company | null>(null);
  useBreadcrumb(company?.name ?? null);
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [swot, setSwot] = useState<SwotAnalysis | null>(null);
  const [matrix, setMatrix] = useState<MarketAttractiveness | null>(null);
  const [pricing, setPricing] = useState<PricingRecommendation | null>(null);
  const [report, setReport] = useState<StrategyReport | null>(null);
  const [porters, setPorters] = useState<PortersAnalysis | null>(null);
  const [sensitivity, setSensitivity] = useState<Sensitivity | null>(null);
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [uncertainty, setUncertainty] = useState<UncertaintyAnalysis | null>(null);

  const [costBase, setCostBase] = useState("100");
  const [margin, setMargin] = useState("40");
  const [basis, setBasis] = useState("MARGIN");

  const toast = useToast();
  const [inspectingHeader, setInspectingHeader] = useState(false);
  const [busy, setBusy] = useState<Stage | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [c, comps, s, m, p, r, pf, sc, unc] = await Promise.all([
        api.getCompany(companyId),
        api.listCompetitors(companyId),
        optional(api.getSwot(companyId)),
        optional(api.getAttractiveness(companyId)),
        optional(api.getPricing(companyId)),
        optional(api.getReport(companyId)),
        optional(api.getPorters(companyId)),
        api.listScenarios(companyId),
        optional(api.getUncertainty(companyId)),
      ]);
      setCompany(c);
      setCompetitors(comps);
      setSwot(s);
      setMatrix(m);
      setPricing(p);
      setReport(r);
      setPorters(pf);
      setScenarios(sc);
      setUncertainty(unc);
      // Sensitivity is derived from the stored matrix row, so it only exists
      // once the matrix has been run. A 409 here is expected, not an error.
      setSensitivity(m ? await api.getSensitivity(companyId).catch(() => null) : null);
    } catch (err) {
      setError((err as Error).message);
    }
  }, [companyId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function run(stage: Stage) {
    setBusy(stage);
    setError(null);
    try {
      if (stage === "swot") setSwot(await api.runSwot(companyId));
      if (stage === "matrix") setMatrix(await api.runAttractiveness(companyId));
      if (stage === "pricing") {
        setPricing(
          await api.runPricing(companyId, {
            cost_base: Number(costBase),
            // The API takes a fraction; the form takes percent, because
            // "40" is what a human types for a 40% target.
            target_margin_pct: Number(margin) / 100,
            margin_basis: basis,
          }),
        );
      }
      if (stage === "report") setReport(await api.runReport(companyId));
      if (stage === "porters") setPorters(await api.runPorters(companyId));
      toast({ tone: "success", title: `${STAGE_LABEL[stage]} recomputed` });
    } catch (err) {
      const message = (err as Error).message;
      setError(message);
      toast({ tone: "error", title: `${STAGE_LABEL[stage]} failed`, detail: message });
    } finally {
      setBusy(null);
    }
  }

  async function runUncertainty(inputs: Record<string, ThreePoint> | undefined) {
    setBusy("uncertainty");
    setError(null);
    try {
      setUncertainty(
        await api.runUncertainty(companyId, {
          uncertainty_inputs: inputs,
          // Stated ranges are persisted so the next run of this company starts
          // from the same assumptions rather than from nothing.
          persist_inputs: inputs !== undefined,
        }),
      );
      toast({ tone: "success", title: "Uncertainty sampled", detail: "10,000 seeded draws" });
    } catch (err) {
      const message = (err as Error).message;
      setError(message);
      toast({ tone: "error", title: "Uncertainty failed", detail: message });
    } finally {
      setBusy(null);
    }
  }

  async function createScenario(body: {
    name: string;
    description?: string;
    overrides: Record<string, unknown>;
  }) {
    setBusy("scenario");
    setError(null);
    try {
      const created = await api.createScenario(companyId, body);
      setScenarios((prev) => [...prev, created]);
      toast({ tone: "success", title: `Scenario "${created.name}" saved` });
    } catch (err) {
      const message = (err as Error).message;
      setError(message);
      toast({ tone: "error", title: "Scenario failed", detail: message });
    } finally {
      setBusy(null);
    }
  }

  async function removeScenario(scenarioId: string) {
    try {
      await api.deleteScenario(companyId, scenarioId);
      setScenarios((prev) => prev.filter((s) => s.id !== scenarioId));
      toast({ tone: "info", title: "Scenario deleted" });
    } catch (err) {
      const message = (err as Error).message;
      setError(message);
      toast({ tone: "error", title: "Delete failed", detail: message });
    }
  }

  if (!company) {
    if (!error) return <PageSkeleton />;
    return (
      <div className="panel p-10 text-center">
        <p className="text-sm text-danger">{error}</p>
        <Link to="/" className="btn-ghost mt-4">
          Back to companies
        </Link>
      </div>
    );
  }

  // Exactly one primary action per screen: the first stage not yet run.
  const nextStage: Stage | null =
    (!swot && "swot") ||
    (!matrix && "matrix") ||
    (!pricing && "pricing") ||
    (!report && "report") ||
    (!porters && "porters") ||
    null;
  const runClass = (stage: Stage) => (nextStage === stage ? "btn-primary" : "btn-ghost");

  const stageLinks: StageLink[] = [
    { id: "stage-swot", label: "SWOT scoring", done: Boolean(swot) },
    { id: "stage-matrix", label: "GE-McKinsey matrix", done: Boolean(matrix) },
    { id: "stage-pricing", label: "Pricing", done: Boolean(pricing) },
    { id: "stage-report", label: "Executive report", done: Boolean(report) },
    { id: "stage-porters", label: "Five Forces", done: Boolean(porters) },
    { id: "stage-sensitivity", label: "Sensitivity", done: Boolean(sensitivity) },
    { id: "stage-uncertainty", label: "Uncertainty", done: Boolean(uncertainty) },
    { id: "stage-scenarios", label: "What-if scenarios", done: scenarios.length > 0 },
  ];

  return (
    <div className="animate-fade-up space-y-8">
      <header className="panel overflow-hidden">
        <div className="flex flex-wrap items-start justify-between gap-4 p-5">
          <div className="min-w-0">
            <h1 className="display text-4xl text-foreground">{company.name}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {company.industry && <span className="chip chip-neutral">{company.industry}</span>}
              <span className="chip chip-neutral">
                {competitors.length} competitor{competitors.length === 1 ? "" : "s"}
              </span>
              {company.period_label && (
                <span className="chip chip-neutral">
                  {company.period_label}
                  {company.period_end ? ` · ends ${company.period_end}` : ""}
                </span>
              )}
            </div>
          </div>
          <div className="flex shrink-0 gap-2">
            {company.entity_key && (
              <Link to={`/entities/${company.entity_key}`} className="btn-ghost">
                Timeline
              </Link>
            )}
            <Link to="/portfolios" className="btn-ghost">
              Portfolio
            </Link>
            {matrix ? (
              <button
                type="button"
                onClick={() => setInspectingHeader(true)}
                className="btn-ghost"
                title="Show the inputs these figures were computed from"
              >
                Inspect
              </button>
            ) : null}
          </div>
        </div>

        {/* Headline figures, once the matrix exists. An executive reading this
            page should not have to scroll to find the verdict. */}
        {matrix && (
          <dl className="grid grid-cols-2 divide-x divide-border/40 border-t border-border/70 sm:grid-cols-4">
            {[
              ["Attractiveness", matrix.overall_attractiveness_score.toFixed(2)],
              ["Strength", matrix.competitive_strength_score.toFixed(2)],
              ["Quadrant", matrix.quadrant.replace(/_/g, " ")],
              [
                "Stability",
                uncertainty
                  ? `${uncertainty.verdict_stability} · ${uncertainty.entropy_bits.toFixed(2)} bits`
                  : "not sampled",
              ],
            ].map(([label, value], i) => (
              <div key={label} className="px-5 py-3">
                <dt className="label mb-1">{label}</dt>
                <dd
                  className={[
                    "truncate text-sm font-semibold",
                    i < 2 ? "num text-foreground" : "text-foreground",
                  ].join(" ")}
                >
                  {value}
                </dd>
              </div>
            ))}
          </dl>
        )}

        <p className="border-t border-border/70 px-5 py-3 text-2xs leading-relaxed text-muted">
          <span className="font-semibold uppercase tracking-label text-muted">Source</span>{" "}
          {company.data_source}
        </p>
      </header>

      {matrix ? (
        <BasisInspector
          title="GE-McKinsey matrix"
          basis={matrix.calculation_basis}
          generatedAt={matrix.calculated_at}
          open={inspectingHeader}
          onClose={() => setInspectingHeader(false)}
        />
      ) : null}

      {error && (
        <p className="panel border-danger/40 bg-danger/5 p-3 text-xs text-danger">
          {error}
        </p>
      )}

      <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_190px]">
        <div className="min-w-0 space-y-10">
      <StageShell
        id="stage-swot"
        basis={swot?.calculation_basis}
        generatedAt={swot?.generated_at}
        index={1}
        done={Boolean(swot)}
        title="SWOT scoring"
        subtitle="Financial metrics compared against the peer-set median (or the industry band when there are too few peers), bucketed into 1-5 impact scores. Metrics inside the neutral band produce no factor."
        action={
          <button className={runClass("swot")} onClick={() => void run("swot")} disabled={busy !== null}>
            {busy === "swot" ? "Scoring…" : swot ? "Re-run" : "Run SWOT"}
          </button>
        }
      >
        {swot ? (
          <SWOTGrid analysis={swot} />
        ) : (
          <NotRun>Not run yet.</NotRun>
        )}
      </StageShell>

      <StageShell
        id="stage-matrix"
        basis={matrix?.calculation_basis}
        generatedAt={matrix?.calculated_at}
        index={2}
        done={Boolean(matrix)}
        title="GE-McKinsey matrix"
        subtitle="Market attractiveness from growth, size, industry profitability, and HHI-derived competitive intensity. Competitive strength from the scored SWOT grid."
        action={
          <button
            className={runClass("matrix")}
            onClick={() => void run("matrix")}
            disabled={busy !== null || !swot}
            title={swot ? undefined : "Run the SWOT analysis first"}
          >
            {busy === "matrix" ? "Computing…" : matrix ? "Re-run" : "Run matrix"}
          </button>
        }
      >
        {matrix ? (
          <AttractivenessMatrix result={matrix} />
        ) : (
          <p className="panel p-5 text-sm text-muted">
            {swot ? "Not run yet." : "Blocked: the strength axis comes from the SWOT grid."}
          </p>
        )}
      </StageShell>

      <StageShell
        id="stage-pricing"
        basis={pricing?.calculation_basis}
        generatedAt={pricing?.calculated_at}
        index={3}
        done={Boolean(pricing)}
        title="Pricing"
        subtitle="Cost-plus anchor blended with the competitor benchmark, then adjusted for the shared-feature quality gap and floored at cost."
        action={
          <button
            className={runClass("pricing")}
            onClick={() => void run("pricing")}
            disabled={busy !== null}
          >
            {busy === "pricing" ? "Pricing…" : pricing ? "Re-run" : "Run pricing"}
          </button>
        }
      >
        <div className="panel grid gap-3 p-4 sm:grid-cols-3">
          <div>
            <label className="label" htmlFor="cost">
              Cost base
            </label>
            <input
              id="cost"
              className="field font-mono"
              inputMode="decimal"
              value={costBase}
              onChange={(e) => setCostBase(e.target.value)}
            />
          </div>
          <div>
            <label className="label" htmlFor="margin">
              Target margin %
            </label>
            <input
              id="margin"
              className="field font-mono"
              inputMode="decimal"
              value={margin}
              onChange={(e) => setMargin(e.target.value)}
            />
          </div>
          <div>
            <label className="label" htmlFor="basis">
              Basis
            </label>
            <select
              id="basis"
              className="field"
              value={basis}
              onChange={(e) => setBasis(e.target.value)}
            >
              <option value="MARGIN">MARGIN — cost / (1 − m)</option>
              <option value="MARKUP">MARKUP — cost × (1 + m)</option>
            </select>
          </div>
        </div>
        {pricing ? (
          <PricingView result={pricing} />
        ) : (
          <NotRun>Not run yet.</NotRun>
        )}
      </StageShell>

      <StageShell
        id="stage-report"
        basis={report?.structured_context}
        generatedAt={report?.generated_at}
        index={4}
        done={Boolean(report)}
        title="Executive report"
        subtitle="The structured context is frozen from the stages above, then narrated. With no API key configured, the templated fallback produces the same numbers without the prose."
        action={
          <button
            className={runClass("report")}
            onClick={() => void run("report")}
            disabled={busy !== null || !matrix}
            title={matrix ? undefined : "Run the matrix first"}
          >
            {busy === "report" ? "Generating…" : report ? "Re-generate" : "Generate report"}
          </button>
        }
      >
        {report ? (
          <ReportView report={report} />
        ) : (
          <p className="panel p-5 text-sm text-muted">
            {matrix ? "Not generated yet." : "Blocked: there is nothing computed to narrate."}
          </p>
        )}
      </StageShell>

      <StageShell
        id="stage-porters"
        basis={porters?.calculation_basis}
        generatedAt={porters?.generated_at}
        index={5}
        done={Boolean(porters)}
        title="Porter's Five Forces"
        subtitle="Industry structure rather than firm position, so it needs no upstream stage. Rivalry is computed from HHI; two of the five forces have no proxy in this data and are analyst input or nothing."
        action={
          <button
            className={runClass("porters")}
            onClick={() => void run("porters")}
            disabled={busy !== null}
          >
            {busy === "porters" ? "Scoring…" : porters ? "Re-run" : "Run five forces"}
          </button>
        }
      >
        {porters ? (
          <PortersView analysis={porters} />
        ) : (
          <NotRun>Not run yet.</NotRun>
        )}
      </StageShell>

      <StageShell
        id="stage-sensitivity"
        index={6}
        done={Boolean(sensitivity)}
        title="Sensitivity"
        subtitle="The minimum change in any single input that would flip the quadrant. Solved exactly rather than searched, because the attractiveness score is linear in its axes."
        action={<span className="text-xs text-muted">derived from the stored matrix</span>}
      >
        {sensitivity ? (
          <SensitivityPanel result={sensitivity} />
        ) : (
          <NotRun>
            {matrix ? "Re-run the matrix to refresh this." : "Blocked: needs a matrix result."}
          </NotRun>
        )}
      </StageShell>

      <StageShell
        id="stage-uncertainty"
        basis={uncertainty?.calculation_basis}
        generatedAt={uncertainty?.generated_at}
        index={7}
        done={Boolean(uncertainty)}
        title="Uncertainty"
        subtitle="Every input above is a point estimate. State a range for any of them and 10,000 seeded draws report how likely each quadrant is, with the Shannon entropy of that distribution as a single measure of how much the verdict survives."
        action={<span className="text-xs text-muted">needs a matrix result</span>}
      >
        {matrix ? (
          <UncertaintyPanel
            result={uncertainty}
            busy={busy === "uncertainty"}
            onRun={(inputs) => void runUncertainty(inputs)}
          />
        ) : (
          <NotRun>Blocked: the Monte Carlo resamples a stored placement.</NotRun>
        )}
      </StageShell>

      <StageShell
        id="stage-scenarios"
        index={8}
        done={scenarios.length > 0}
        title="What-if scenarios"
        subtitle="Recompute the pipeline under a named set of overrides and diff against the stored baseline. Nothing here mutates the company."
        action={<span className="text-xs text-muted">{scenarios.length} saved</span>}
      >
        {matrix ? (
          <ScenarioPanel
            scenarios={scenarios}
            busy={busy === "scenario"}
            onCreate={createScenario}
            onDelete={removeScenario}
          />
        ) : (
          <NotRun>Blocked: a scenario is a delta from a baseline placement.</NotRun>
        )}
      </StageShell>
        </div>

        <StageNav stages={stageLinks} />
      </div>
    </div>
  );
}
