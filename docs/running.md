# Running it

Every way to start the stack, rebuild the benchmark table, and check that an
install is sound. The README keeps only the three-command path.

---

## Quick start

Requires Docker, or Python 3.10+ and Node 18+.

```bash
git clone https://github.com/IshaanS0112/StrategySphere.git
cd StrategySphere

export LLM_BASE_URL=https://api.openai.com/v1 LLM_MODEL=gpt-4o-mini LLM_API_KEY=sk-...  # optional
# or a local model: LLM_BASE_URL=http://localhost:11434/v1 LLM_MODEL=llama3.1
docker compose up --build
```

Dashboard on <http://localhost:5173>, API docs on <http://localhost:8000/docs>.

Load a case and run the whole pipeline from the command line:

```bash
python backend/scripts/load_case_study.py data/case_studies/premium_saas.json \
    --api http://localhost:8000 --run-all
```

### Rebuilding the benchmark table from SEC filings

The shipped table is committed, so this is only needed to refresh it or change
the period. The SEC requires automated access to declare a User-Agent with
contact details; there is no default and the client refuses to construct
without one.

```bash
export EDGAR_USER_AGENT="Your Name you@example.com"
python backend/scripts/build_benchmarks.py --period CY2024 \
    --out data/benchmarks/edgar_CY2024.json
export INDUSTRY_BENCHMARKS_PATH=data/benchmarks/edgar_CY2024.json
```

Every response is cached by URL, so a second run costs no requests at all, and
`--offline` serves the cache only and fails loudly on a miss rather than
quietly reaching out.

### Running the backend without Docker

```bash
cd backend
pip install -r requirements-dev.txt
cp .env.example .env          # set DATABASE_URL, or use SQLite for a quick look
pytest                        # 515 tests, no database and no network needed

# V2 owns its schema with Alembic; the app no longer creates tables itself.
export DATABASE_URL="sqlite:///./local.db"
alembic upgrade head
uvicorn app.main:app --reload
```

Upgrading a database that V1 created with `create_all`? Record the baseline
once, then migrate:

```bash
alembic stamp 0001_v1_baseline && alembic upgrade head
```

The models declare JSONB and UUID as dialect *variants*, so the whole app runs on SQLite for local work and on Postgres in deployment.

### Frontend

```bash
cd frontend && npm ci && npm run dev     # proxies /api to :8000
```

### Verifying an install

```bash
cd backend && pytest                              # 515 passed
curl localhost:8000/health                        # {"status":"ok"}
python backend/scripts/load_case_study.py \
    data/case_studies/premium_saas.json --api http://localhost:8000 --run-all
```

The last command should print `attractiveness 3.8, strength 3.6667 -> INVEST_GROW`.
Those figures are deterministic, so a mismatch means something is genuinely wrong.

---
