import { defineCommand, option } from "@bunli/core"
import { z } from "zod"
import { apiFetch, writeError } from "../helpers.js"

interface JobResult {
  jobAdId: string
  title: string
  hiringOrgName: string
  occupation?: string
  municipality?: string
  postalDistrictName?: string
  publicationDate?: string
  applicationDeadline?: string
}

interface SearchResponse {
  meta?: { totalJobAdCount?: number; pageNumber?: number; resultsPerPage?: number }
  results?: JobResult[]
}

function formatTable(jobs: JobResult[]): string {
  if (jobs.length === 0) return "No jobs found."
  const rows = jobs.map((j) => [
    j.jobAdId.slice(0, 8),
    j.title.slice(0, 40),
    j.hiringOrgName.slice(0, 25),
    (j.municipality ?? "-").slice(0, 20),
    j.applicationDeadline ? j.applicationDeadline.slice(0, 10) : "-",
  ])
  const header = ["ID", "Title", "Employer", "Municipality", "Deadline"]
  const widths = header.map((h, i) => Math.max(h.length, ...rows.map((r) => r[i].length)))
  const line = (cols: string[]) => cols.map((c, i) => c.padEnd(widths[i])).join("  ")
  return [line(header), line(widths.map((w) => "-".repeat(w))), ...rows.map(line)].join("\n")
}

export const search = defineCommand({
  name: "search",
  description: "Search for job ads on Jobnet.dk",
  options: {
    searchString: option(z.string().default(""), {
      description: "Free-text keyword search (job title, skills, employer)",
    }),
    region: option(z.string().default(""), {
      description:
        "Region: HovedstadenOgBornholm, Midtjylland, Syddanmark, OevrigeSjaelland, Nordjylland",
    }),
    postalCode: option(z.string().default(""), {
      description: "Postal code for radius search, e.g. 2100",
    }),
    radius: option(z.coerce.number().int().default(50), {
      description: "Radius in km from postal code (requires --postal-code)",
    }),
    workHours: option(z.enum(["FullTime", "PartTime"]).optional(), {
      description: "FullTime or PartTime",
    }),
    duration: option(z.enum(["Permanent", "Temporary"]).optional(), {
      description: "Permanent or Temporary",
    }),
    jobType: option(z.string().default(""), {
      description: "Announcement type: Ordinaert, Efterloenner, Foertidspension",
    }),
    occupationArea: option(z.string().default(""), {
      description: "Occupation area identifier, e.g. 10000",
    }),
    occupationGroup: option(z.string().default(""), {
      description: "Occupation group identifier, e.g. 10060",
    }),
    page: option(z.coerce.number().int().min(1).default(1), {
      description: "Page number (1-indexed)",
    }),
    perPage: option(z.coerce.number().int().min(1).default(10), {
      description: "Results per page",
    }),
    limit: option(z.coerce.number().int().min(1).optional(), {
      description: "Cap total results returned by CLI",
    }),
    order: option(z.enum(["PublicationDate", "BestMatch", "ApplicationDate"]).default("PublicationDate"), {
      description: "Sort order",
    }),
    format: option(z.enum(["json", "table", "plain"]).default("json"), {
      description: "Output format",
    }),
  },
  handler: async ({ flags }) => {
    try {
      // resultsPerPage and pageNumber must always be provided (see README) —
      // omitting them while searchString is set causes API error 1014.
      const params: Record<string, string> = {
        pageNumber: String(flags.page),
        resultsPerPage: String(flags.perPage),
        order: flags.order,
      }
      if (flags.searchString) params.searchString = flags.searchString
      if (flags.region) params.region = flags.region
      if (flags.postalCode) {
        params.postalCode = flags.postalCode
        params.radius = String(flags.radius)
      }
      if (flags.workHours) params.workHours = flags.workHours
      if (flags.duration) params.duration = flags.duration
      if (flags.jobType) params.jobType = flags.jobType
      if (flags.occupationArea) params.occupationArea = flags.occupationArea
      if (flags.occupationGroup) params.occupationGroup = flags.occupationGroup

      const data = await apiFetch<SearchResponse>("/FindJob/Search", params)
      let jobs = data.results ?? []
      const total = data.meta?.totalJobAdCount ?? jobs.length

      if (flags.limit) jobs = jobs.slice(0, flags.limit)

      if (flags.format === "table") {
        console.log(formatTable(jobs))
        console.log(`\n${jobs.length} of ${total} total results shown.`)
      } else if (flags.format === "plain") {
        for (const j of jobs) {
          console.log(`[${j.jobAdId}] ${j.title} — ${j.hiringOrgName} — ${j.municipality ?? "-"}`)
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


