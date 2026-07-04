import { defineCommand, option } from "@bunli/core"
import { z } from "zod"
import { apiFetch, formatPlain, writeError, BASE_URL, type NaukriRawJob } from "../helpers.js"

interface DetailResponse {
  jobDetails?: NaukriRawJob & {
    jobDescription?: string
    minimumExperience?: string
    maximumExperience?: string
    salaryDetail?: { minimumSalary?: number; maximumSalary?: number; label?: string }
  }
}

function extractJobId(idOrUrl: string): string {
  // Accept either a raw job ID or a full naukri.com job URL ending in -<id>
  const match = idOrUrl.match(/(\d{7,})/)
  return match ? match[1] : idOrUrl
}

const detail = defineCommand({
  name: "detail",
  description: "Fetch full detail for a single Naukri job listing",
  options: {
    id: option(z.string().min(1), {
      description: "Job ID from search results, or a full Naukri job URL",
    }),
    format: option(z.enum(["json", "plain"]).default("json"), {
      description: "Output format",
    }),
  },
  handler: async ({ flags, positional }) => {
    try {
      const raw = flags.id || positional?.[0]
      if (!raw) {
        writeError("Missing job id or URL argument", "MISSING_ARG")
        process.exit(1)
      }
      const jobId = extractJobId(raw)

      const data = await apiFetch<DetailResponse>(`/jobapi/v4/job/${jobId}`)
      const job = data.jobDetails
      if (!job) {
        writeError("Job not found", "NOT_FOUND")
        process.exit(1)
        return
      }

      const salary = job.salaryDetail?.label ?? "Not disclosed"
      const experience =
        job.minimumExperience && job.maximumExperience
          ? `${job.minimumExperience}-${job.maximumExperience} years`
          : null

      const card = {
        id: jobId,
        title: job.title ?? "Untitled",
        company: job.companyName ?? null,
        location: null,
        experience,
        salary,
        postedDate: job.createdDate ? new Date(job.createdDate).toISOString().slice(0, 10) : null,
        url: job.jdURL ?? `${BASE_URL}/job-listings-${jobId}`,
        description: job.jobDescription?.slice(0, 300) ?? null,
        fullDescription: job.jobDescription ?? null,
      }

      if (flags.format === "plain") {
        console.log(formatPlain(card))
      } else {
        console.log(JSON.stringify(card, null, 2))
      }
    } catch (err) {
      writeError(err instanceof Error ? err.message : String(err), "DETAIL_FAILED")
      process.exit(1)
    }
  },
})

export default detail
