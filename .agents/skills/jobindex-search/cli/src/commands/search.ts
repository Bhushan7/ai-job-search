import { defineCommand, option } from "@bunli/core"
import { z } from "zod"
import { apiFetch, parseJobCards, parseHitCount, writeError, type JobCard } from "../helpers.js"

interface SearchApiResponse {
  result_list_box_html?: string
}

function formatTable(jobs: JobCard[]): string {
  if (jobs.length === 0) return "No jobs found."
  const rows = jobs.map((j) => [
    j.id,
    j.title.slice(0, 40),
    (j.company ?? "-").slice(0, 25),
    (j.location ?? "-").slice(0, 20),
    j.date ?? "-",
  ])
  const header = ["ID", "Title", "Company", "Location", "Date"]
  const widths = header.map((h, i) => Math.max(h.length, ...rows.map((r) => r[i].length)))
  const line = (cols: string[]) => cols.map((c, i) => c.padEnd(widths[i])).join("  ")
  return [line(header), line(widths.map((w) => "-".repeat(w))), ...rows.map(line)].join("\n")
}

export const search = defineCommand({
  name: "search",
  description: "Search job listings on Jobindex.dk",
  options: {
    query: option(z.string().default(""), {
      short: "q",
      description: "Keyword search query (job title, skill, company, city)",
    }),
    jobage: option(z.coerce.number().int().default(9999), {
      description: "Max age of posting in days: 1, 7, 14, 30, or 9999 (all, default)",
    }),
    sort: option(z.enum(["score", "date"]).default("score"), {
      description: "Sort order: score (relevance) or date (newest first)",
    }),
    page: option(z.coerce.number().int().min(1).default(1), {
      description: "Page number (1-indexed, 20 results per page, fixed)",
    }),
    limit: option(z.coerce.number().int().min(1).optional(), {
      description: "Cap total results the CLI outputs (client-side)",
    }),
    format: option(z.enum(["json", "table", "plain"]).default("json"), {
      description: "Output format",
    }),
  },
  handler: async ({ flags }) => {
    try {
      const params: Record<string, string> = {
        page: String(flags.page),
        jobage: String(flags.jobage),
        sort: flags.sort,
      }
      if (flags.query) params.q = flags.query

      const data = await apiFetch<SearchApiResponse>("/jobsoegning.json", params)
      const html = data.result_list_box_html ?? ""
      let jobs = parseJobCards(html)
      const total = parseHitCount(html)

      if (flags.limit) jobs = jobs.slice(0, flags.limit)

      if (flags.format === "table") {
        console.log(formatTable(jobs))
        console.log(`\n${jobs.length} of ${total} total results shown.`)
      } else if (flags.format === "plain") {
        for (const j of jobs) {
          console.log(`[${j.id}] ${j.title} — ${j.company ?? "-"} — ${j.location ?? "-"}`)
        }
      } else {
        console.log(JSON.stringify({ meta: { total, page: flags.page }, jobs }, null, 2))
      }
    } catch (err) {
      writeError(err instanceof Error ? err.message : String(err), "SEARCH_FAILED")
      process.exit(1)
    }
  },
})


