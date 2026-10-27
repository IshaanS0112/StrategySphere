# Methodology and measured results

Long-form detail moved out of the README so that file can stay short. Nothing
here has been rewritten: these are the original sections.

- [The line between computed and narrated](#the-line-between-computed-and-narrated)
- [Measured results](#measured-results)
- [Scope](#scope)
- [API](#api)
- [Questions this project should survive](#questions-this-project-should-survive)

---

## The line between computed and narrated

This is the design decision the rest of the project hangs off.

| Stage | Who computes it |
|---|---|
| Strength / weakness factors and their impact scores | Benchmark arithmetic — `swot_engine.py` |
| HHI, concentration band, competitive intensity | `market_structure.py` |
| Attractiveness score, strength score, quadrant | Weighted sum — `attractiveness_matrix.py` |
| Recommended price, range, implied margin | `pricing_engine.py` |
| Five forces, and which of them could be computed at all | `porters_engine.py` |
| Exact quadrant flip distances | Calculus on a linear model — `sensitivity.py` |
| Scenario deltas, period trends | `scenario_engine.py`, `timeline.py` |
| Separation, rank correlation, permutation p-value | `validation.py` |
| Sector medians, tag resolution, coverage | SEC XBRL arithmetic — `edgar/benchmark_builder.py` |
| Quadrant probabilities, credible intervals, entropy | Monte Carlo over stated ranges — `uncertainty.py` |
| Priority scores and the capital allocation | `portfolio.py` |
| Readable narrative | LLM — `report_generator.py` |

Every number in a generated report exists in `structured_context` before any model is called. That context is stored in the database, returned by `GET /companies/{id}/strategy-report`, and rendered in the UI behind a **"show structured context (pre-LLM)"** toggle. Any factor name the model cites that isn't in the grid is dropped and counted. If the model call fails, times out, or returns malformed JSON, a template produces the same report from the same numbers.

**With no LLM endpoint configured at all, the system still produces complete strategy reports.**

`GET /methodology` returns every weight and threshold currently in force, so the claim that the scores are computed is checkable without reading the source.

---

---

## Measured results

The three shipped case files, run end to end (`--run-all`), no API key configured:

Against the **V1 placeholder benchmark table**:

| Case | SWOT (S/W/O/T) | Attractiveness | Strength | Quadrant | Price (min/opt/max) | Implied margin |
|---|---|---|---|---|---|---|
| `premium_saas` | 9 / 1 / 2 / 1 | 3.80 | 3.67 | `INVEST_GROW` | 1002.11 / 1113.45 / 1224.80 | 56.9% |
| `contested_retail` | 4 / 3 / 1 / 2 | 2.50 | 2.67 | `SELECTIVE_INVEST` ⚠ borderline | 62.41 / 69.35 / 76.28 | 25.0% |
| `commodity_manufacturer` | 0 / 9 / 0 / 3 | 1.50 | 1.00 | `HARVEST_DIVEST` | 39.00 / 42.10 / 46.31 | 7.4% |

Against the **V3 EDGAR table** — the same cases, the same code, real sector medians:

| Case | SWOT (S/W/O/T) | Attractiveness | Strength | Quadrant |
|---|---|---|---|---|
| `premium_saas` | 8 / 1 / 2 / 1 | 3.80 | **3.375** | **`SELECTIVE_INVEST`** ⚠ borderline |
| `contested_retail` | 6 / 0 / 1 / 2 | 2.50 | 2.50 | `SELECTIVE_INVEST` ⚠ borderline |
| `commodity_manufacturer` | 0 / 7 / 0 / 3 | 1.50 | 1.00 | `HARVEST_DIVEST` |

**One verdict moved, and V2's sensitivity analysis had already named it.** `premium_saas` was reported `FRAGILE` with a binding constraint of strength **−0.17** — a sixth of a point would flip it. Replacing my invented benchmarks with real ones moved strength **−0.29**, and it flipped. The tool called its own weakest verdict before the data did.

Two reasons it moved. Market share is **declared not derivable** from XBRL, so it is no longer scored at all — and against an invented 8% band it had been a strength. And the surviving benchmarks got harder: the real SaaS net-margin median is **7.7%** against the placeholder's 2.0%. `contested_retail` shows the bias running the other way: real retail carries **2.18x** leverage against my invented 1.2x, so a factor that was a weakness against a made-up number is a strength against a real one.

This is still self-consistency against inputs designed to produce those verdicts. For validation against real outcomes, see below — it is negative.

Two of those rows show the guard rails doing their job rather than the happy path:

- `premium_saas` returns a **56.9% implied margin against a 45% target**. That is correct, not a bug: rivals price well above this company's cost-plus anchor, so the blended price lands above it. The engine reports the realised margin precisely so the gap is visible.
- `commodity_manufacturer` has its **range floored at the cost base** (39.00) — the raw band bottom was 37.89, below cost — which drops the recommendation to `MEDIUM` confidence with the reason attached.

**V2 additions, same three cases.**

| Case | Sensitivity | Binding constraint | Attr. axes reachable | Porter composite |
|---|---|---|---|---|
| `premium_saas` | `FRAGILE` | strength **−0.17** → `SELECTIVE_INVEST` | 3 of 4 | 3.44 `MODERATE` (3/5 scored) |
| `contested_retail` | `ROBUST` | **none reachable** | 0 of 4 | 4.05 `UNATTRACTIVE` (3/5) |
| `commodity_manufacturer` | `ROBUST` | strength **+1.50** → `SELECTIVE_INVEST` | 1 of 4 | 4.18 `UNATTRACTIVE` (3/5) |

Three different shapes of answer, and each means something distinct:

- **`premium_saas` is fragile on strength.** Attractiveness sits at 3.8, comfortably past the 3.5 threshold; strength at 3.667 is only 0.17 clear of it. A sixth of a point on one axis moves the verdict out of `INVEST_GROW`.
- **`contested_retail` cannot be flipped by any single input.** It sits mid-grid at 2.50 / 2.67, and `SELECTIVE_INVEST` is the residual quadrant — leaving it needs *both* axes past a threshold together, which no one input can do. `ROBUST` here means "structurally stuck", not "confidently good".
- **`commodity_manufacturer` needs a 1.5-point strength recovery** to escape `HARVEST_DIVEST`, which on a 1-5 axis is an enormous move.

Only 3 of 5 forces score on every case: buyer power and substitutes have no proxy in this data and return `UNAVAILABLE` rather than a default.

**V3: the benchmark table, the uncertainty, and the allocation.**

The shipped CY2024 table, built in one command against `data.sec.gov`:

| | |
|---|---|
| Filers considered | 6,085 |
| Sectors published at n ≥ 20 | 14 |
| Sectors withheld below it | 3, named in the provenance block |
| Coverage, best metric | revenue growth, **80.7%** (4,242 resolved / 1,018 dropped) |
| Coverage, worst metric | R&D intensity, **35.6%** — and that is a selection effect, not a failure: a company with no R&D line generally has no R&D |
| Requests to rebuild | 4 frames + 1,500 submissions, at 5/second, all cached |

Coverage is **published as a number with its drop reasons**, because a table built from 2,378 of 4,939 filers with the exclusions stated beats one built from nine numbers I made up.

Uncertainty on `premium_saas`, stating a range on market growth (11/19/26) and on strength (2.9/3.375/3.9):

| | |
|---|---|
| Point verdict | `SELECTIVE_INVEST` — still the headline |
| Probabilities | `SELECTIVE_INVEST` **74.7%** · `INVEST_GROW` **25.3%** · `HARVEST_DIVEST` 0% |
| 90% credible intervals | attractiveness 3.50–3.80 · strength 3.07–3.70 |
| Entropy | **0.817** of a possible 1.585 bits → `LEANING` |

And the allocation over all three cases, budget 900:

| # | Unit | A × S | entropy × | priority | allocated | outcome |
|---|---|---|---|---|---|---|
| 1 | `contested_retail` | 2.50 × 2.50 | 1.000 | **6.25** | 500 | `FUNDED` |
| 2 | `premium_saas` | 3.80 × 3.38 | 0.485 | **6.22** | 620 | `PARTIALLY_FUNDED` ← marginal unit |
| 3 | `commodity_manufacturer` | 1.50 × 1.00 | — | 1.50 | 90 (floor) | `CONTRIBUTOR` |

**The SaaS unit sits at 12.8 on raw position and loses first place by 0.03 anyway**, because its contested verdict halves its priority while the middling-but-decisive retail unit keeps all of its. That is the entropy discount doing exactly what it was built to do, and it is the single most demonstrable thing in the project. The harvest unit contributes 310 to the pool rather than drawing from it, which is what funds the 620.

The binding constraint is reported separately from the ranked axis list on purpose. On `contested_retail` every attractiveness axis is unreachable, and on `premium_saas` the constraint is the strength axis — which is not in that list at all. Reading `axes[0]` as "the thing to worry about" gave the opposite of the truth, and was a live bug until an end-to-end run surfaced it.

`pytest`: **515 tests**, no database and no network required — including the EDGAR tests, which run the real client against recorded-shape fixtures with an injected transport.

---

---

## Scope

**This is an analysis tool over data you supply. It does not ingest live market feeds, does not scrape competitor pricing, and has not been validated against real strategic outcomes.**

The three case files in `data/case_studies/` are **illustrative composites, not real companies** — they exist so the pipeline can be exercised in one click, and every one of them says so in its own `data_source` field, which the UI displays on every downstream result.

**The industry benchmark table is real as of V3**: sector medians over 6,085 SEC filers for CY2024, shipped at `data/benchmarks/edgar_CY2024.json` with a provenance block carrying coverage per metric, the drop reasons, and the per-tag resolution counts. `GET /benchmarks/provenance` returns all of it. The V1 placeholder table is still in the code as the fallback when no path is configured, and it still says what it is. Supplying competitor financials, so the engine uses a peer-set median, remains the best path and overrides the table entirely.

The Porter composite is **a project-defined average, not part of Porter's framework** — Porter does not weight or average the forces, and the API says so in the payload. Two of the five forces have no proxy in this data at all and come back `UNAVAILABLE` rather than defaulting to a middle value.

**The framework has now been backtested, and it did not pass.** Two panels of ~1,500 US filers each, scored through the real pipeline and measured against realised three-year revenue growth, are committed in `data/validation/`. The quadrant does not predict the outcome, it never beats a baseline using revenue growth alone, and where the association is significant it is *inverted*. The full writeup, including everything wrong with the test, is in [`docs/validation_results.md`](docs/validation_results.md).

**So: do not read this tool's output as a forecast.** The quadrant is a structured, traceable summary of a stated position. That is a useful thing and it is not a prediction.

`docs/architecture.md` has the full "what's real vs simulated" breakdown, the bugs found while building it, and the places the implementation deliberately departs from my original design note.

---

---

## API

```
GET    /health
GET    /methodology                              Weights and thresholds in force

POST   /companies                                Create company (data_source required)
GET    /companies  ·  GET /companies/{id}  ·  DELETE /companies/{id}
POST   /companies/{id}/competitors  ·  GET /companies/{id}/competitors

POST   /companies/{id}/swot-analysis             Run the SWOT scoring engine
POST   /companies/{id}/market-attractiveness     Run the GE-McKinsey matrix
POST   /companies/{id}/pricing-recommendation    Run the pricing engine
POST   /companies/{id}/generate-strategy-report  Narrate the structured context

POST   /companies/{id}/porters-analysis         Score the five forces
GET    /companies/{id}/sensitivity              Exact quadrant flip distances
POST   /companies/{id}/scenarios                Recompute under overrides
GET    /companies/{id}/scenarios  ·  DELETE /companies/{id}/scenarios/{sid}
GET    /entities  ·  GET /entities/{key}/timeline    Multi-period migration
POST   /validation/backtest                     Score a labelled panel

POST   /companies/{id}/uncertainty              Monte Carlo over stated ranges
GET    /companies/{id}/uncertainty              Latest stored run
POST   /portfolios  ·  GET /portfolios  ·  GET /portfolios/{id}
POST   /portfolios/{id}/allocate                Allocate a budget across the units
GET    /portfolios/{id}/allocations             Stored runs
GET    /benchmarks/provenance                   What the live table is, and where it came from

GET    /health  ·  GET /ready                   Liveness, and dependency-by-dependency readiness
GET    /metrics                                 Prometheus text exposition
POST   /benchmarks/build                        202 + job id; rebuild from SEC filings
POST   /validation/panels                       202 + job id; assemble a panel from filings
GET    /jobs  ·  GET /jobs/{id}                 Poll a background job
POST   /jobs/{id}/cancel                        Cooperative cancellation
```

`GET /companies` is keyset-paginated: `?limit=&cursor=&industry=&q=&with_total=`.
Every error is RFC 9457 `application/problem+json` with a stable `code`, and
carries the `X-Request-ID` back so a failure can be found in the logs.

Each `POST` has a matching `GET` returning the latest stored result. Stage ordering is enforced with `409` rather than a silent recompute — the matrix must be built on the SWOT grid the user actually saw.

---

---

## Questions this project should survive

**"Is your SWOT a real methodology or LLM brainstorming?"**
Arithmetic. Each factor is a named metric, a benchmark, and a signed relative deviation bucketed into 1-5. The evidence string carries all three, and `calculation_basis` carries the trace for every metric — including the ones that were skipped and why.

**"Walk me through the GE-McKinsey matrix."**
`0.3·growth + 0.2·size + 0.3·profitability + 0.2·(6 − intensity)`, weights validated to sum to 1.0 at config load so the output stays on the 1-5 axis. Competitive strength comes from the scored SWOT grid. Quadrants at 2.5 / 3.5, with anything within 0.15 of a boundary flagged borderline.

**"Where does competitive intensity come from?"**
HHI over the competitor set, classified on DOJ/FTC 2023 bands, adjusted by price dispersion. Two assumptions are stated in the code and in the stored basis: the unnamed residual share is treated as an atomistic fringe (which biases HHI down), and concentration is mapped to rivalry in the antitrust direction.

**"How does the pricing engine derive its number?"**
Cost-plus anchor blended 50/50 with the competitor mean, multiplied by a value-adjustment factor from the shared-feature gap, capped at ±30%, floored at cost. The realised margin is reported alongside, because the blended price frequently does *not* deliver the target margin and hiding that would be the whole problem.

**"What happens when the framework's own reads get slow?"**
They were already slow and nobody had measured them. Every stage read *the
latest* result as `collection[-1]`, which loads every row a company has ever
stored — kilobyte-scale JSON per row — to use one. The timeline and the
portfolio allocator did it inside a loop, which is a plain N+1. `backend/scripts/bench_queries.py`
reproduces the before and after: 13 queries and 600 ORM rows down to 3 and 12
on a twelve-period timeline. The script stays in the repo so a refactor that
reintroduces the lazy load shows up as the query count going back up.

**"You told me building the benchmark table was a CLI job. Why is it an endpoint now?"**
Because the V3 answer was half right. Doing minutes of rate-limited outbound
calls *inside a request* is a timeout with a body — that part stands. But "run
this by hand on the server" is not a feature either. It is now `202 Accepted`
with a job id and a `Location` header, and the job's state lives in a row
rather than a future, so a restart does not lose the record of what ran. The
reaper is the part that makes it trustworthy: a job whose heartbeat goes stale
is failed rather than left `RUNNING` for ever.

**"Does fetching EDGAR in parallel not break the rate limit you made a point of?"**
It does not, and measuring that is how I found two bugs. The token bucket is
shared, so threads queue for slots and the outbound rate is identical to the
serial case. Measuring it also showed the limiter had been allowing roughly
**twice** the configured rate all along — a bucket seeded with `capacity ==
rate` lets `rate` fire instantly and then refills at `rate`, so a one-second
window can hold `2 × rate`. At a configured 20/s it passed 39 in a second.
Burst now defaults to 1. And the honest answer on the speedup: **at the default
5 req/s against a healthy SEC, concurrency buys nothing** — the limiter
dominates. It is worth 3× only when the upstream is slow. Both regimes are in
the benchmark output.

**"Where does the data come from?"**
Company figures: whatever you supply, recorded in a required `data_source` field. The shipped cases are labelled composites. Benchmarks: the SEC's XBRL frames API at `data.sec.gov` — official, public, no keys, JSON, published for developers. No scraping, ever; the client refuses any host outside `data.sec.gov`.

**"XBRL tags aren't consistent between filers. How did you handle that?"**
An ordered candidate list per metric — revenue is `RevenueFromContractWithCustomerExcludingAssessedTax`, then `Revenues`, then `SalesRevenueNet`. The tag that resolved is recorded per company, a company where none resolves is **dropped and counted, never imputed**, and the coverage rate is published with the drop reasons. Two metrics in the table — market share and customer retention — are declared *not derivable* from XBRL with a reason, rather than approximated from something adjacent.

**"Your probabilities — where does the distribution come from?"**
The analyst. It is "given the uncertainty you stated", not an objective probability, and the payload says that in those words in a field you cannot miss. Inputs with no stated range are held fixed and listed, with a warning that the reported spread is therefore a lower bound. Garbage in, confident-looking probabilities out — which is why the warning is not collapsible in the UI either.

**"Sensitivity and uncertainty sound like the same thing."**
Different questions. *How far must one input move* versus *how likely is each verdict given everything I stated*. They disagree often — a `ROBUST` placement with wide ranges can be `CONTESTED` — and both payloads explain the difference rather than reconciling it, because the disagreement is the useful part.

**"Why is your allocation rule the right one?"**
It isn't "right". GE-McKinsey prescribes no allocation arithmetic at all — it positions units and leaves the capital decision to management. The rule is mine, it is labelled `PROJECT-DEFINED ALLOCATION RULE` in every payload, and its components are individually defensible: floors first, harvest funds growth, greedy on a conjunctive priority discounted by entropy. The greedy step is not the knapsack optimum, and the payload admits that too — it is used because a committee can follow "in priority order until the money ran out" in a way it cannot follow an optimiser.

**"Did the framework actually predict anything?"**
No. [`docs/validation_results.md`](docs/validation_results.md), 2,979 company-years across two windows: the quadrant does not predict three-year revenue growth, it never beats a baseline using revenue growth alone, and on the CY2020 window it is significantly *inverted* — the `HARVEST_DIVEST` group grew at 16.7% a year against `SELECTIVE_INVEST`'s 10.4%, p = 0.0005. That is mean reversion off a pandemic trough and the framework walked into it. The document states the look-ahead bias, which runs *toward* the model looking good, and the survivorship, which makes the inversion an understatement. It also reports three structural findings that cost more than the p-values did — including that the framework never produced all three quadrants on a population panel, because HHI over a filer population is always "unconcentrated".

**"How do you know the quadrant isn't just noise?"**
I solve for it. The attractiveness score is linear in its axes, so `dA/d(axis)` is just the weight, and the minimum single-input change that reaches a boundary is `(threshold − A) / derivative` — exact, with no perturbation step to choose. The result names the *binding constraint*: the one input the verdict actually hangs on, which is frequently not the highest-weighted one.

**"Porter's Five Forces from a balance sheet? Three of those aren't in there."**
Correct, and that's the interesting part. Rivalry is computed from HHI. Entry threat and supplier power are partly computed — industry margin sets the size of the prize, `1 − gross margin` bounds supplier exposure. Buyer power and substitutes have no honest proxy, so they are analyst input **or `UNAVAILABLE`**. Every force carries a `source` field, and the composite is labelled a project-defined average rather than a Porter output.

**"How would you validate the attractiveness score against real outcomes?"**
V2 made it computable and V3 ran it. `POST /validation/backtest` takes a labelled panel, reports quadrant separation and Spearman rho, and runs a permutation null with the outcomes shuffled. The p-value is the part that matters — on twenty companies across three quadrants, a several-point gap between group means arises constantly by chance. V2's README said a significant result would still be association, not causation, until it beat a baseline using revenue growth alone. V3 built that baseline, ran both, and published the comparison. The framework lost.

---

