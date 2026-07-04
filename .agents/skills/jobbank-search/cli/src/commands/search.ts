import { defineCommand, option } from "@bunli/core"
import { z } from "zod"
import {
  BASE_URL,
  fetchWithUA,
  rssFetch,
  parseRssDescription,
  extractJobIdFromUrl,
  writeError,
} from "../helpers.js"

interface JobResult {
  id: string
  title: string
  company: string
  location: string
  jobType: string
  description: string
  url: string
  posted: string
  deadline: string | null
}

// repeatable() lets a flag be passed multiple times, e.g. --type 3 --type 6.
// zod's array-of-string coercion handles both a single value and multiple.
const repeatable = () => z.union([z.string(), z.array(z.string())]).optional()

function toArray(v: string | string[] | undefined): string[] {
  if (v === undefined) return []
  return Array.isArray(v) ? v : [v]
}

function formatTable(jobs: JobResult[]): string {
  if (jobs.length === 0) return "No jobs found."
  const rows = jobs.map((j) => [
    j.id,
    j.title.slice(0, 40),
    j.company.slice(0, 25),
    j.location.slice(0, 20),
    j.deadline ?? "løbende",
  ])
  const header = ["ID", "Title", "Company", "Location", "Deadline"]
  const widths = header.map((h, i) => Math.max(h.length, ...rows.map((r) => r[i].length)))
  const line = (cols: string[]) => cols.map((c, i) => c.padEnd(widths[i])).join("  ")
  return [line(header), line(widths.map((w) => "-".repeat(w))), ...rows.map(line)].join("\n")
}

// meta.total is fetched from the HTML search page's <title> tag, which follows
// the pattern "{N} relevante job og karriereopslag". If this secondary
// request fails, meta.total falls back to null rather than failing the whole search.
async function fetchTotalCount(searchParams: URLSearchParams): Promise<number | null> {
  try {
    const url = `${BASE_URL}/job/soeg?${searchParams.toString()}`
    const response = await fetchWithUA(url)
    if (!response.ok) return null
    const html = await response.text()
    const match = html.match(/<title>[^<]*?([\d.]+)\s+relevante job/i)
    if (!match) return null
    return parseInt(match[1].replace(/\./g, ""), 10) || null
  } catch {
    return null
  }
}

export const search = defineCommand({
  name: "search",
  description: "Search job listings on Akademikernes Jobbank (jobbank.dk)",
  options: {
    key: option(z.string().default(""), { description: "Keyword search (title, company, keyword)" }),
    exclude: option(z.string().default(""), { description: "Exclude keywords (antikey)" }),
    type: option(repeatable(), { description: "Job type code (cvtype). Repeatable." }),
    education: option(repeatable(), { description: "Education field code (udd). Repeatable." }),
    location: option(repeatable(), { description: "Region code (amt). Repeatable." }),
    workArea: option(repeatable(), { description: "Work area / function code (erf). Repeatable." }),
    industry: option(repeatable(), { description: "Industry code (branche). Repeatable." }),
    suitableFor: option(repeatable(), { description: "Suitable-for code (andet). Repeatable." }),
    company: option(z.string().default(""), { description: "Company ID (virk)" }),
    remote: option(z.enum(["helt", "delvist"]).optional(), { description: "Remote work type" }),
    since: option(z.string().default(""), { description: "Posted on/after date, YYYY-MM-DD (oprettet)" }),
    limit: option(z.coerce.number().int().min(1).optional(), {
      description: "Cap total results returned by CLI (client-side)",
    }),
    format: option(z.enum(["json", "table", "plain"]).default("json"), { description: "Output format" }),
  },
  handler: async ({ flags }) => {
    try {
      if (!flags.key && toArray(flags.type).length === 0 && toArray(flags.location).length === 0 &&
        toArray(flags.education).length === 0 && toArray(flags.workArea).length === 0 &&
        toArray(flags.industry).length === 0 && toArray(flags.suitableFor).length === 0) {
        writeError("--key or at least one filter is required", "MISSING_REQUIRED")
        process.exit(1)
        return
      }

      const params: Record<string, string | string[]> = {}
      if (flags.key) params.key = flags.key
      if (flags.exclude) params.antikey = flags.exclude
      if (toArray(flags.type).length) params.cvtype = toArray(flags.type)
      if (toArray(flags.education).length) params.udd = toArray(flags.education)
      if (toArray(flags.location).length) params.amt = toArray(flags.location)
      if (toArray(flags.workArea).length) params.erf = toArray(flags.workArea)
      if (toArray(flags.industry).length) params.branche = toArray(flags.industry)
      if (toArray(flags.suitableFor).length) params.andet = toArray(flags.suitableFor)
      if (flags.company) params.virk = flags.company
      if (flags.remote) params.fjernarbejde = flags.remote
      if (flags.since) params.oprettet = flags.since

      const items = await rssFetch(params)

      const searchParams = new URLSearchParams()
      for (const [k, v] of Object.entries(params)) {
        if (Array.isArray(v)) v.forEach((x) => searchParams.append(k, x))
        else searchParams.append(k, v)
      }
      // Small delay before the secondary HTML request, per README rate-limit guidance.
      await new Promise((r) => setTimeout(r, 350))
      const total = await fetchTotalCount(searchParams)

      let jobs: JobResult[] = items.map((item) => {
        const id = extractJobIdFromUrl(item.link)
        const parsed = parseRssDescription(item.description)
        return {
          id,
          title: item.title,
          company: parsed.company,
          location: parsed.location,
          jobType: parsed.jobType,
          description: item.description,
          url: item.link,
          posted: item.pubDate,
          deadline: parsed.deadline,
        }
      })

      if (flags.limit) jobs = jobs.slice(0, flags.limit)

      if (flags.format === "table") {
        console.log(formatTable(jobs))
        console.log(`\n${jobs.length} results shown${total ? ` of ${total} total` : ""} (RSS caps at 100).`)
      } else if (flags.format === "plain") {
        for (const j of jobs) console.log(`[${j.id}] ${j.title} — ${j.company} — ${j.location}`)
      } else {
        console.log(JSON.stringify({ meta: { total }, results: jobs }, null, 2))
      }
    } catch (err) {
      writeError(err instanceof Error ? err.message : String(err), "SEARCH_FAILED")
      process.exit(1)
    }
  },
})
