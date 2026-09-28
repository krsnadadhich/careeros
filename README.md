# CareerOS

A personal, self-hosted AI job-search command center. CareerOS syncs your Gmail, classifies every job-search-related email, extracts real job postings and application confirmations from them, tracks applications through a Kanban pipeline, scores job matches against your resume, and surfaces recruiters, interviews, tasks, and analytics — all backed by a real Postgres database, with a hybrid local-AI classification layer so your data doesn't have to leave your machine.

## Why

Most job trackers are either a spreadsheet you maintain by hand, or a SaaS product that wants your inbox data on its servers. CareerOS is neither: it runs locally, reads only the Gmail account you connect, and never submits an application anywhere on your behalf — it records what's already happened and helps you decide what to do next.

## How it works

- **Gmail sync** classifies every email (Laya, a fast local BERT-style classifier, with an Ollama/Anthropic/OpenAI fallback for anything Laya can't answer), extracts structured data, and links it to a Job, Application, Interview, or Recruiter.
- **Zero-hallucination job leads** — a `Job` row is only ever created from an email when a real, pattern-matched job-posting link was found in it. No link, no listing, even with a plausible-looking company and role.
- **Deterministic scoring** — skill matching, job-quality signals, and application-vs-lead detection are all done with plain TypeScript, not handed to a model, wherever the calculation is trivial enough to trust more from code than from an LLM.
- **Application tracking** auto-creates from confirmation emails and progresses through a Kanban board (Applied → Screening → Interview → Offer/Rejected), with AI-suggested status changes always requiring your confirmation before anything changes.
- **Job matching** blends deterministic skills/location scoring with AI-assessed experience/role fit, fully explained on every job's detail page — never just a bare percentage.
- **A grounded Ask AI assistant** that refuses to answer questions it has no real data for, rather than guessing.

## Stack

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind v4 · Prisma 7 (driver-adapter mode) · PostgreSQL · NextAuth v5 (Google OAuth) · Vitest

## Getting started

```bash
npm install
cp .env.example .env   # fill in DATABASE_URL, Google OAuth, NEXTAUTH_SECRET
npx prisma migrate deploy
npx prisma generate
npm run dev
```

By default `AI_PROVIDER=ollama` expects a local [Ollama](https://ollama.com) server. Laya (optional, see `services/laya/README.md`) runs as a separate local sidecar for faster email classification — sync falls back to the configured AI provider automatically when it isn't reachable.

## Testing

```bash
npm run lint
npm test          # unit tests (Vitest)
npm run test:e2e  # end-to-end (Playwright)
```

## License

MIT — see [LICENSE](LICENSE).
