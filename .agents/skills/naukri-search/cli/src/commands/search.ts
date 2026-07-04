import { defineCommand, option } from "@bunli/core"
import { z } from "zod"
import { apiFetch, parseJobCards, formatTable, writeError, type NaukriRawJob } from "../helpers.js"

interface SearchResponse {
  jobDetails?: NaukriRawJob[]
  noOfJobs?: string | number
}

const search = defineCommand({
  name: "search",
  description: "Search job listings on Naukri.com",
  options: {
    keyword: option(z.string().min(1), {
      short: "k",
      description: "Keyword search (job title, skill, company). Required.",
    }),
    location: option(z.string().default(""), {
      short: "l",
      description: 'City name, e.g. "bangalore", "mumbai", "delhi ncr" (optional)',
    }),
    experience: option(z.string().default(""), {
      short: "e",
      description: "Minimum years of experience, e.g. 8 (optional)",
    }),
    page: option(z.coerce.number().int().min(1).default(1), {
      description: "Page number (1-indexed)",
    }),
    limit: option(z.coerce.number().int().min(1).max(100).default(20), {
      description: "Number of results to fetch (Naukri returns up to 100 per page)",
    }),
    format: option(z.enum(["json", "table", "plain"]).default("json"), {
      description: "Output format",
    }),
  },
  handler: async ({ flags }) => {
    try {
      const params: Record<string, string> = {
        noOfResults: String(flags.limit),
        urlType: "search_by_key_loc",
        searchType: "adv",
        keyword: flags.keyword,
        pageNo: String(flags.page),
        k: flags.keyword,
      }
      if (flags.location) {
        params.location = flags.location
        params.l = flags.location
      }
      if (flags.experience) {
        params.experience = flags.experience
      }

      const data = await apiFetch<SearchResponse>("/jobapi/v3/search", params)
      const jobs = parseJobCards(data.jobDetails ?? [])
      const total = data.noOfJobs ? Number(data.noOfJobs) : jobs.length

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

export default search
