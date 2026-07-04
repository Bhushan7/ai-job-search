import { defineCommand, option } from "@bunli/core"
import { z } from "zod"
import { BASE_URL, apiPost, writeError } from "../helpers.js"

interface RawResult {
  title: string
  companyName: string
  companyLogo?: { url?: string } | null
  companyAddress?: string
  jobTypes?: string[]
  publishedDate?: string
  applicationDeadline?: string | null
  url: string
}

interface SearchResponse {
  meta?: { currentPage?: number; totalItems?: number; itemsPrPage?: number; totalPages?: number }
  results?: RawResult[]
}

interface Filter {
  type: string
  value: string | number
  displayText: string
}

function formatTable(jobs: RawResult[]): string {
  if (jobs.length === 0) return "No jobs found."
  const rows = jobs.map((j) => [
    j.title.slice(0, 40),
    j.companyName.slice(0, 25),
    (j.companyAddress ?? "-").slice(0, 25),
    j.applicationDeadline ?? "-",
  ])
  const header = ["Title", "Company", "Address", "Deadline"]
  const widths = header.map((h, i) => Math.max(h.length, ...rows.map((r) => r[i].length)))
  const line = (cols: string[]) => cols.map((c, i) => c.padEnd(widths[i])).join("  ")
  return [line(header), line(widths.map((w) => "-".repeat(w))), ...rows.map(line)].join("\n")
}

export const search = defineCommand({
  name: "search",
  description: "Search job listings on Jobdanmark.dk",
  options: {
    text: option(z.string().default(""), { description: "Free-text keyword search" }),
    category: option(z.coerce.number().int().optional(), { description: "Category ID" }),
    jobtitleId: option(z.coerce.number().int().optional(), { description: "Job title ID from autocomplete" }),
    municipality: option(z.string().default(""), { description: 'Municipality name, e.g. "Odense"' }),
    zip: option(z.string().default(""), { description: "Zip code, e.g. 5000" }),
    region: option(z.string().default(""), { description: "Region name" }),
    jobType: option(z.string().default(""), {
      description: "Comma-separated job types: fuldtid,deltid,fleksjob,elev,studiejob,praktik",
    }),
    page: option(z.coerce.number().int().min(1).default(1), { description: "Page number (30 per page, fixed)" }),
    limit: option(z.coerce.number().int().min(1).optional(), { description: "Cap total results returned by CLI" }),
    format: option(z.enum(["json", "table", "plain"]).default("json"), { description: "Output format" }),
  },
  handler: async ({ flags }) => {
    try {
      const filters: Filter[] = []
      if (flags.text) filters.push({ type: "freetext", value: flags.text, displayText: flags.text })
      if (flags.category) filters.push({ type: "category", value: flags.category, displayText: String(flags.category) })
      if (flags.jobtitleId) filters.push({ type: "jobtitle", value: flags.jobtitleId, displayText: String(flags.jobtitleId) })
      if (flags.municipality) filters.push({ type: "municipality", value: flags.municipality, displayText: flags.municipality })
      if (flags.zip) filters.push({ type: "zip", value: flags.zip, displayText: flags.zip })
      if (flags.region) filters.push({ type: "region", value: flags.region, displayText: flags.region })

      const jobTypes = flags.jobType
        ? flags.jobType.split(",").map((s: string) => s.trim()).filter(Boolean)
        : []

      const body = {
        jobTypes,
        filters,
        locationMode: "Text",
        distance: 50,
      }

      const data = await apiPost<SearchResponse>(`/api/jobsearch/search/${flags.page}`, body)
      let results = (data.results ?? []).map((r) => {
        const slugMatch = r.url.match(/\/job\/([^/?#]+)/)
        return {
          title: r.title,
          companyName: r.companyName,
          companyAddress: r.companyAddress ?? null,
          jobTypes: r.jobTypes ?? [],
          publishedDate: r.publishedDate ?? null,
          applicationDeadline: r.applicationDeadline ?? null,
          url: r.url.startsWith("http") ? r.url : `${BASE_URL}${r.url}`,
          slug: slugMatch ? slugMatch[1] : null,
        }
      })

      if (flags.limit) results = results.slice(0, flags.limit)

      const meta = data.meta ?? {}

      if (flags.format === "table") {
        console.log(formatTable(data.results ?? []))
        console.log(`\n${results.length} results shown of ${meta.totalItems ?? "?"} total (page ${meta.currentPage ?? flags.page} of ${meta.totalPages ?? "?"}).`)
      } else if (flags.format === "plain") {
        for (const r of results) console.log(`${r.title} — ${r.companyName} — ${r.slug ?? r.url}`)
      } else {
        console.log(JSON.stringify({ meta, results }, null, 2))
      }
    } catch (err) {
      writeError(err instanceof Error ? err.message : String(err), "SEARCH_FAILED")
      process.exit(1)
    }
  },
})
