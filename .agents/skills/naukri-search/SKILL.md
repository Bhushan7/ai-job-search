---
name: naukri-search
version: 1.0.0
description: >
  Make sure to use this skill whenever the user wants to search for jobs in India,
  find Indian job listings, look up a specific job posting on Naukri, or asks anything
  about the Indian job market — even if they don't mention naukri.com explicitly.
  Invoke this skill for questions about open positions, job vacancies, hiring in India,
  job opportunities in Indian cities or sectors, or when the user wants to find work
  in India. Also trigger for phrases like "find me a job", "are there any openings for
  X in Bangalore", or "what jobs are available in Mumbai" when the context is India.
  Trigger phrases include: naukri, naukri.com, jobs in india, job search india, ledige
  stillinger india, hiring india, indian job market, job vacancy india, job openings
  india, work in india, find work india, product manager jobs india, IT jobs india,
  engineer jobs india, developer jobs bangalore, jobs bangalore, jobs bengaluru, jobs
  mumbai, jobs delhi, jobs delhi ncr, jobs gurgaon, jobs gurugram, jobs pune, jobs
  hyderabad, jobs chennai, job listings india, senior product manager jobs india,
  fintech jobs india, payments jobs india, naukri job search, naukri jobs.
context: fork
allowed-tools: Bash(bun run skills/naukri-search/cli/src/cli.ts *)
---

# Naukri Search Skill

Search live Indian job listings from Naukri.com — India's largest job portal, covering
20,000+ employers and millions of active listings across every sector and seniority level.

This uses Naukri's internal, unofficial `jobapi` endpoint (the same one their own website
calls). No authentication is required, but it is not a documented public API — treat it as
more fragile than a proper developer API, and see the CLI README's notes on failure modes.

## When to use this skill

Invoke this skill when the user wants to:

- Search for job openings in India by keyword, job title, or skill
- Find jobs in a specific Indian city (use `--location`, e.g. `bangalore`, `mumbai`, `delhi ncr`)
- Filter by minimum years of experience for senior roles
- Get the full description of a specific job listing, including salary (when disclosed)
- Explore the Indian job market for a given profession, seniority level, or sector

## Commands

### Search job listings

```bash
bun run skills/naukri-search/cli/src/cli.ts search [flags]
```

Key flags:
- `--keyword <text>` / `-k <text>` — keyword search (job title, skill, company). **Required.**
- `--location <city>` / `-l <city>` — city name, e.g. `bangalore`, `mumbai`, `delhi ncr` (optional)
- `--experience <years>` / `-e <years>` — minimum years of experience, e.g. `8` (optional)
- `--page <n>` — page number (1-indexed)
- `--limit <n>` — number of results to fetch (up to 100 per page)
- `--format json|table|plain`

> **Salary note**: Naukri lets employers hide salary ("not disclosed"). This is common —
> historically 60-80% of listings. Don't treat a missing salary as a red flag on its own.

### Fetch full job detail

```bash
bun run skills/naukri-search/cli/src/cli.ts detail --id <jobId> [--format json|plain]
```

`id` can be the numeric job ID from `search` results, or a full Naukri job URL. Returns the
full job description, experience range, and salary (if disclosed).

---

## How to use effectively

**Always start with `search`.** Pass the job title or role as `--keyword`, and add
`--location` for a specific Indian city. For senior roles, add `--experience` to filter out
junior-level noise.

**Natural workflow: `search` → `detail`.**
1. Use `search` to find matching jobs and their `id` values.
2. Call `detail --id <id>` to get the full description and apply link.

**Use `--format table` for quick scanning**, `--format json` for data processing, and
`--format plain` for reading a single job's full details.

---

## Usage examples

### Senior Product Manager roles in Bangalore, 8+ years experience

```bash
bun run skills/naukri-search/cli/src/cli.ts search \
  --keyword "senior product manager payments" \
  --location bangalore \
  --experience 8 \
  --format table
```

### Fintech/payments PM roles, no city filter

```bash
bun run skills/naukri-search/cli/src/cli.ts search \
  --keyword "product manager fintech payments" \
  --format table
```

### Get full details for a specific job

```bash
bun run skills/naukri-search/cli/src/cli.ts detail --id 1234567890 --format plain
```

### Jobs in Delhi NCR, page 2

```bash
bun run skills/naukri-search/cli/src/cli.ts search \
  --keyword "product manager" \
  --location "delhi ncr" \
  --page 2 \
  --format json
```

---

## Output formats

| Format | Best for |
|--------|----------|
| `json` | Default — programmatic use, data processing, passing IDs to `detail` |
| `table` | Quick human-readable overview and scanning |
| `plain` | Reading a single job's full detail (`detail` command) |

All errors are written to **stderr** as `{ "error": "...", "code": "..." }` and the process exits with code `1`.

---

## Notes

- All data is from Naukri's own internal (undocumented) `jobapi` endpoint — no credentials
  required, but requires the `appid: 109` / `systemid: Naukri` headers to work.
- This is **not an official public API**. If searches start failing with 403s or empty
  results, the endpoint shape may have changed upstream — check the CLI README before
  assuming a local setup problem.
- Reliable access has historically worked best from India-based network locations.
- Salary is frequently marked "Not disclosed" by employers — this is normal on Naukri,
  not a signal of anything unusual about the listing.
- This tool only accesses publicly visible listings, the same as any anonymous site
  visitor — no login or private data is used. Keep usage to personal job-search volume,
  consistent with Naukri's Terms of Service.
