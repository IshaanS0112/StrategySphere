# StrategySphere — Product Requirements

**Status: as-built, v3.2.0.** This documents a shipped system, not a plan. Where a
requirement was considered and rejected it is listed under Non-goals with the
reason, because the rejections are the design.

---

## Product overview

**One line.** A strategy-analysis API and dashboard where every framework output
is computed from stated inputs and recomputable from a stored basis, and the
language model only narrates.

**Problem.** SWOT, competitive positioning and pricing are taught as frameworks
and applied as opinions. Someone writes "strong brand" in the strengths box and
nobody asks what it was measured against. The same failure appears in LLM
wrappers: a model is asked to *do* the analysis, so the output is fluent,
unauditable, and different on every run.

**Target user.** An analyst or founder who has to defend a strategic claim to
somebody who will ask where the number came from. Secondary: anyone evaluating
whether an "AI strategy tool" is doing arithmetic or improvisation.

**User pain.** Cannot distinguish a computed finding from an asserted one, and
cannot reproduce last week's output.

**Solution.** Deterministic engines compute every figure. Each stored result
carries a `calculation_basis` naming the inputs and the comparison. Benchmarks
come from SEC EDGAR XBRL filings, not from invented bands. The LLM receives a
JSON context frozen before the call and any factor it cites that is not in that
context is discarded and counted.

**Product goal.** Survive the question *"is the AI doing the analysis, or is your
code doing it and the model just describing the result?"* — answered by letting
the user check rather than by assertion.

---

## User flows

### Primary: score one company

1. Create a company with financials, market data, feature scores, and a
   competitor set (`POST /companies`, then `POST /companies/{id}/competitors`).
2. Run SWOT. Each metric is compared to the peer-set median, or to the sector
   median from the EDGAR table when there are fewer than 3 peers. Metrics inside
   the ±5% neutral band produce no factor.
3. Run the matrix. Attractiveness is a weighted sum of growth, size,
   profitability and HHI-derived competitive intensity; strength comes from the
   scored SWOT grid. The quadrant is read off the 2.5 / 3.5 thresholds and
   flagged `borderline` within 0.15 of a boundary.
4. Read sensitivity, which is derived automatically: the exact minimum change in
   any single input that would flip the quadrant.
5. Optionally run pricing, Five Forces, uncertainty, scenarios.
6. Generate the report. With no API key the templated fallback produces the same
   figures without prose, and says so.

### Secondary flows

- **Multi-period.** Score the same `entity_key` across periods, then read
  `GET /entities/{key}/timeline` for quadrant migration and trends.
- **Portfolio.** Put ≥2 scored company-periods in a portfolio with a budget,
  capital requests and floors, then allocate.
- **What-if.** Save a named override set, recomputed against a non-mutating copy
  and diffed against the stored baseline.
- **Rebuild benchmarks.** `POST /benchmarks/build` returns `202` with a job id;
  poll `GET /jobs/{id}`.
- **Validate.** Build an EDGAR panel and backtest the framework against real
  outcomes.

### Failure flows

| Situation | Behaviour |
|---|---|
| Stage run out of order | `409 STAGE_ORDER` naming the stage required first |
| Too few peers and no benchmark table | Factor is dropped and counted, not guessed |
| Metric not derivable from XBRL | Declared `NOT_DERIVABLE`; never estimated |
| Budget below the sum of floors | `409 BUDGET_INFEASIBLE`; nothing partial is written |
| No LLM endpoint configured | Deterministic template, labelled `template_fallback` |
| EDGAR unreachable or `--offline` with a cold cache | Build fails loudly; no empty table is written |
| Worker crashes mid-job | Reaper marks the job failed on a stale heartbeat |

---

## Features

### Shipped — V1

Benchmark-scored SWOT · HHI market structure on DOJ/FTC 2023 bands ·
GE-McKinsey matrix · cost-plus/competitor-blended pricing · frozen-context LLM
report with template fallback · React dashboard.

### Shipped — V2

Porter's Five Forces with per-force provenance · analytic sensitivity ·
what-if scenarios · multi-period tracking · validation harness · Alembic.

### Shipped — V3

Real sector medians from 6,085 EDGAR filers · uncertainty propagation
(PERT, 10,000 seeded draws, quadrant probabilities, Shannon entropy) ·
portfolio capital allocation · the validation actually run and published.

### Shipped — V3.1

Single-row read layer · background jobs with cancellation and a reaper ·
RFC 9457 error taxonomy · request ids, JSON logs, Prometheus metrics ·
benchmark-table cache · keyset pagination.

### Shipped — V3.2

Versioned framework model (`data/framework.json`, 43 parameters validated as a
set, digest stamped into every result) · per-stage basis inspector ·
provider-neutral narration over any OpenAI-compatible endpoint · Paper design
system with a lint-enforced token layer · command palette, toasts, skeletons.

### Next (V4 candidates, in priority order)

1. **Filing-date-aware panel assembly.** The backtest currently scores CY2020
   using facts filed in 2021. This is the single largest known defect and it
   biases the result *toward* the framework looking good.
2. **Hand-built competitor sets for a smaller panel**, so the HHI term carries
   information instead of being pinned at `UNCONCENTRATED` for every sector.
3. **A second declared outcome measure** (TSR or margin expansion), chosen before
   the run.
4. **Benchmark table versioning**, so a result records which table scored it.
   Half of this shipped: `data/framework.json` versions the *parameters* and
   every result carries its digest. The benchmark *table* is still unversioned.

### Rejected for V1–V3.1

Scraping anything outside `data.sec.gov` · authentication and multi-tenancy ·
an ML quadrant predictor · agentic LLM tool-use · live market feeds · NSE/BSE
coverage · rewriting the V1/V2 engines.

---

## Requirements

### Functional

- Every stored analysis row carries a `calculation_basis` sufficient to
  recompute its figures.
- Every SWOT factor carries an evidence string naming the metric, the benchmark,
  the sample size, and the direction of the comparison.
- Every Five Forces force is tagged `computed` or `analyst`, and the composite
  reports how many of the five were actually scored.
- A factor the LLM cites that is absent from the frozen context is dropped and
  the drop is counted in the response.
- Sector medians are published only at n ≥ 20; below that the sector is withheld.
- The full pipeline produces complete output with no API key configured.

### Non-functional

| Property | Target | Where it is enforced |
|---|---|---|
| Determinism | Identical inputs produce identical figures | Seeded RNG (`uncertainty_seed`, `validation_random_seed`) |
| Reproducibility | Any figure recomputable from its stored basis | `calculation_basis` on every result table |
| SEC compliance | Under the published 10 req/s ceiling | Token bucket at 5/s, `burst` 1, thread-safe |
| Latency | Timeline reads 3 queries, not 13 | `bench_queries.py` guards the regression in CI |
| Test isolation | No test opens a socket | CI step asserts it |
| Portability | Same models on PostgreSQL and SQLite | Dialect-variant JSON/UUID types |

### Edge cases that are specified, not accidental

- Four empty SWOT quadrants is a valid output.
- A pricing range whose bottom falls below cost is floored at cost and
  downgraded to `MEDIUM` confidence with the reason attached.
- An implied margin above the target is reported, not silently clamped.
- `SELECTIVE_INVEST` is the residual quadrant, so a mid-grid position can be
  `ROBUST` meaning "structurally stuck", not "confidently good".

### Non-goals, with reasons

| Not doing | Why |
|---|---|
| Predicting outcomes | Tested. It does not. See `validation_results.md` |
| Estimating market share from XBRL | Not derivable; estimating it would be invention |
| Letting the LLM compute anything | The entire premise |
| Auth / multi-tenancy | Single-analyst tool; auth would imply a trust boundary that does not exist |
| Scraping | `data.sec.gov` only, enforced by a host allowlist in the client |

### Success metrics

What this product is allowed to claim is narrow, so the metrics are too:

- **Auditability**: 100% of stored results carry a recomputable basis. *Met.*
- **Degradation**: full numeric output with no API key. *Met.*
- **Honesty**: the backtest result is published whichever way it went. *Met, and
  it went badly.*
- **Not claimed**: predictive accuracy. The quadrant is a structured summary of
  stated position, not a forecast.

---

## Related

[TRD.md](TRD.md) · [architecture.md](architecture.md) ·
[methodology.md](methodology.md) · [validation_results.md](validation_results.md)
