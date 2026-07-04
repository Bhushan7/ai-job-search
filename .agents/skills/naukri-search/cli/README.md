# naukri-cli

CLI for searching jobs on [Naukri.com](https://www.naukri.com) — India's largest job portal.

**Base URL**: `https://www.naukri.com`
**Authentication**: None required, but requests must send the `appid: 109` and `systemid: Naukri`
headers (the same values Naukri's own website sends). This is an **undocumented internal API**,
not an official public API — Naukri has no published developer API for job search.
**Format**: JSON.

> ⚠️ **Important**: Because this hits an unofficial, reverse-engineered endpoint, it can break
> without notice if Naukri changes their internal API shape, headers, or adds stricter bot
> detection. If `search` or `detail` starts failing with 403s, check whether the endpoint path
> or required headers have changed before assuming your setup is broken.

---

## Installation

```bash
cd .agents/skills/naukri-search/cli
bun install
```

---

## Commands

| Command | Description |
|---------|-------------|
| `search` | Search job listings by keyword and city |
| `detail` | Full detail for a single job listing |

All commands accept `--format json|table|plain` (default: `json`).
All errors are written to **stderr** as `{ "error": "...", "code": "..." }` and the process exits with code `1`.

---

## `search` — Search for job listings

**Endpoint**: `GET https://www.naukri.com/jobapi/v3/search`

```bash
bun run src/cli.ts search --keyword "senior product manager" --location bangalore
```

### Flags

| Flag | Type | Default | Description |
|------|------|---------|--------------|
| `--keyword` / `-k` | string | — | Keyword search (job title, skill, company). **Required.** |
| `--location` / `-l` | string | — | City name, e.g. `bangalore`, `mumbai`, `delhi ncr` (optional) |
| `--experience` / `-e` | string | — | Minimum years of experience, e.g. `8` (optional) |
| `--page` | number | `1` | Page number (1-indexed) |
| `--limit` | number | `20` | Number of results to fetch (Naukri allows up to 100 per page) |
| `--format` | string | `json` | `json`, `table`, or `plain` |

### Example

```bash
# Senior PM roles in Bangalore, 8+ years experience, table view
bun run src/cli.ts search \
  --keyword "senior product manager payments" \
  --location bangalore \
  --experience 8 \
  --format table
```

---

## `detail` — Full job detail

**Endpoint**: `GET https://www.naukri.com/jobapi/v4/job/{id}`

```bash
bun run src/cli.ts detail --id <jobId> [--format json|plain]
```

`id` can be the numeric job ID from `search` results, or a full Naukri job URL — the CLI
extracts the numeric ID automatically.

### Example

```bash
bun run src/cli.ts detail --id 1234567890 --format plain
```

---

## Notes

- **Salary is frequently hidden.** Naukri lets employers mark salary as "not disclosed" —
  this is common (historically 60-80% of listings). When absent, the tool reports
  `"Not disclosed"` rather than a number.
- **Location filtering**: Naukri's own location parameter is inconsistent in how it matches
  multi-word regions (e.g. "Delhi NCR" vs "Delhi / NCR"). If a `--location` filter returns
  fewer results than expected, try omitting it and including the city in `--keyword` instead
  (same fallback pattern as `jobindex-search`).
- Reliable access has historically required India-based IPs for this endpoint; if you're
  running this from outside India (e.g. a VPN or cloud sandbox), you may see inconsistent
  results or blocks even with correct headers.
- This tool scrapes only publicly visible listings — the same data any anonymous visitor
  to naukri.com sees. No login or private data is accessed. Usage is still subject to
  Naukri's Terms of Service; keep request volume reasonable (personal job-search use, not
  bulk harvesting).
