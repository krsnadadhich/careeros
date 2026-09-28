# Laya sidecar

Fast local email classifier used by Gmail sync (`src/lib/laya`). Runs as its
own process, the same way Ollama does — not started by `npm run dev`.

No custom server code here: `laya[serve]` ships a complete FastAPI server
(`laya-serve`) with `GET /health` and `POST /v1/systemone`. This folder is
just the pinned dependency and the run config for it.

## Setup (once)

```bash
cd services/laya
python -m venv .venv
./.venv/Scripts/pip install -r requirements.txt   # Windows
# ./.venv/bin/pip install -r requirements.txt     # macOS/Linux
```

## Run

```bash
cd services/laya
LAYA_MODELS=english LAYA_DEVICE=cuda ./.venv/Scripts/laya-serve   # Windows
# LAYA_MODELS=english LAYA_DEVICE=cuda ./.venv/bin/laya-serve     # macOS/Linux
```

- `LAYA_MODELS=english` — CareerOS only ever sends English text, so this
  preloads just the English checkpoint instead of all three (faster start,
  less GPU memory).
- `LAYA_DEVICE=cuda` — omit to auto-detect; set `cpu` to force CPU (much
  slower per email, but still correct).
- Default port is `8000` (`LAYA_PORT` to change) — matches `LAYA_BASE_URL`
  in `.env`.
- First run downloads the checkpoint from Hugging Face (a few hundred MB);
  after that it's fully offline.

If this isn't running, CareerOS falls back to classifying emails with
Ollama exactly as it did before Laya existed — nothing breaks, sync is
just slower per email. Check Settings → System Status for connectivity.
