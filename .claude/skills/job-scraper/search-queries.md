# Search Queries for Job Scraper

<!-- SETUP: Customize these queries based on your skills, target roles, and location -->

## Search Sites

Primary (Indian job market):
- **naukri.com** - largest Indian job board; has a dedicated CLI skill (`naukri-search`) — prefer that over WebSearch for Naukri when available, since it hits Naukri's search API directly instead of scraping search-engine snippets
- **linkedin.com/jobs** - LinkedIn job listings (filter: India / your city). No CLI skill for this fork — use WebSearch/WebFetch, or paste job text directly into `/apply`
- **instahyre.com** - curated tech/product roles at startups and mid-size companies
- **cutshort.io** - curated tech/product roles, startup-focused
- **wellfound.com** - startup and early-stage company roles (formerly AngelList)

Secondary (company career pages via Google):
- Direct Google searches with `site:` filters for known target companies

## Query Categories

Queries are grouped by priority. Each query should be combined with your location terms (e.g. "Bangalore", "Bengaluru", "Mumbai", "Delhi NCR") where the site supports it.

### Priority 1: [YOUR_PRIMARY_ROLE_TYPE]

These match your strongest and most desired career direction.

```
site:naukri.com "[YOUR_PRIMARY_JOB_TITLE]" [YOUR_CITY]
site:naukri.com "[YOUR_KEY_SKILL]" [YOUR_CITY]
site:linkedin.com/jobs "[YOUR_PRIMARY_JOB_TITLE]" [YOUR_COUNTRY]
```

> If the `naukri-search` CLI skill is installed, prefer calling it directly for this category instead of `site:naukri.com` WebSearch queries — e.g. `naukri search --keyword "[YOUR_PRIMARY_JOB_TITLE]" --location [YOUR_CITY]`.

### Priority 2: [YOUR_DOMAIN_EXPERTISE]

These match your domain expertise.

```
site:naukri.com [YOUR_DOMAIN_KEYWORD_1] [YOUR_CITY] OR [YOUR_REGION]
site:naukri.com [YOUR_DOMAIN_KEYWORD_2] [YOUR_COUNTRY]
site:linkedin.com/jobs [YOUR_DOMAIN_KEYWORD_1] [YOUR_CITY] [YOUR_COUNTRY]
site:instahyre.com [YOUR_DOMAIN_KEYWORD_1]
site:cutshort.io [YOUR_DOMAIN_KEYWORD_1]
```

### Priority 3: [YOUR_ADJACENT_ROLE_TYPE]

Adjacent roles you could pivot into.

```
site:naukri.com "[YOUR_ADJACENT_TITLE_1]" [YOUR_KEY_SKILL] [YOUR_CITY]
site:naukri.com "[YOUR_ADJACENT_TITLE_2]" [YOUR_KEY_SKILL] [YOUR_CITY]
```

### Priority 4: Broader Technical / Consulting / Startup

Wider net for general roles, including startup-focused portals.

```
site:naukri.com [YOUR_KEY_SKILL] [YOUR_CITY]
site:linkedin.com/jobs "[YOUR_KEY_SKILL]" [YOUR_CITY]
site:wellfound.com [YOUR_KEY_SKILL] [YOUR_DOMAIN]
site:naukri.com "technical consultant" [YOUR_DOMAIN] [YOUR_CITY]
```

## Location Filter

When evaluating results, verify the job location is within reasonable commute distance from your home, or is explicitly remote/hybrid. Define acceptable areas:
- [YOUR_CITY] and surrounding areas
- [ACCEPTABLE_AREA_1]
- [ACCEPTABLE_AREA_2]
- [BORDERLINE_AREA] (borderline - ~X min by transit)
- [TOO_FAR_AREA] (too far)

## Date Filter

Only include jobs posted within the last 14 days, or with an application deadline that has not yet passed. If a posting date cannot be determined, include it but flag as "date unknown".

## Salary Disclosure Note (India-specific)

Many Indian job postings, especially on Naukri, mark salary as "Not disclosed." This is normal and should not be treated as a red flag on its own — do not down-rank a posting's fit score solely because salary is hidden.

## Adapting Queries

If the user specifies a focus area, select queries from the matching category and also generate 2-3 custom queries for that focus. For example:
- "/scrape [focus_area]" -> relevant category queries + custom focus-specific queries
