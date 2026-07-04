export const BASE_URL = "https://www.naukri.com"

// Naukri's internal jobapi requires these two headers on every request.
// They are the same values Naukri's own web frontend sends — not a secret,
// but undocumented, so this can change without notice.
const NAUKRI_HEADERS: Record<string, string> = {
  "appid": "109",
  "systemid": "Naukri",
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
  "Accept": "application/json",
}

export function writeError(error: string, code: string): void {
  process.stderr.write(JSON.stringify({ error, code }) + "\n")
}

export async function apiFetch<T>(path: string, params?: Record<string, string>): Promise<T> {
  let url = `${BASE_URL}${path}`
  if (params && Object.keys(params).length > 0) {
    const qs = new URLSearchParams(params)
    url += `?${qs.toString()}`
  }

  const maxRetries = 6
  let delay = 500
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const response = await fetch(url, { headers: NAUKRI_HEADERS })
    if (response.status === 429 || response.status >= 500) {
      if (attempt === maxRetries) {
        throw new Error(`API request failed: ${response.status} ${response.statusText}`)
      }
      const jitter = Math.floor(Math.random() * 500)
      await new Promise((resolve) => setTimeout(resolve, delay + jitter))
      delay = Math.min(delay * 2, 5000)
      continue
    }
    if (response.status === 403) {
      throw new Error(
        "Naukri returned 403. This usually means the appid/systemid headers " +
          "or endpoint shape have changed upstream, or requests are being " +
          "rate-limited/blocked from this network. Try again later or from a " +
          "different network; this is an undocumented API and can shift without notice."
      )
    }
    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`)
    }
    return response.json() as Promise<T>
  }
  throw new Error("API request failed after max retries")
}

export interface NaukriRawJob {
  jobId?: string
  title?: string
  companyName?: string
  staticUrl?: string
  jdURL?: string
  jobDescription?: string
  placeholders?: Array<{ type?: string; label?: string }>
  footerPlaceholderLabel?: string
  createdDate?: number
  vacancyType?: string
  detailsUrl?: string
}

export interface JobCard {
  id: string
  title: string
  company: string | null
  location: string | null
  experience: string | null
  salary: string | null
  postedDate: string | null
  url: string
  description: string | null
}

/**
 * Extract a labeled field (experience, location, salary) from the
 * `placeholders` array Naukri's search API returns per job card.
 */
function findPlaceholder(job: NaukriRawJob, type: string): string | null {
  const match = job.placeholders?.find((p) => p.type === type)
  return match?.label ?? null
}

export function parseJobCards(rawJobs: NaukriRawJob[]): JobCard[] {
  return rawJobs.map((job) => {
    const id = job.jobId ?? ""
    const url =
      job.jdURL ??
      job.staticUrl ??
      (id ? `${BASE_URL}/job-listings-${id}` : BASE_URL)

    return {
      id,
      title: job.title ?? "Untitled",
      company: job.companyName ?? null,
      location: findPlaceholder(job, "location"),
      experience: findPlaceholder(job, "experience"),
      salary: findPlaceholder(job, "salary"),
      postedDate: job.createdDate ? new Date(job.createdDate).toISOString().slice(0, 10) : null,
      url,
      description: job.jobDescription ? job.jobDescription.slice(0, 300) : null,
    }
  })
}

export function formatTable(jobs: JobCard[]): string {
  if (jobs.length === 0) return "No jobs found."
  const rows = jobs.map((j) => [
    j.id,
    j.title.slice(0, 40),
    (j.company ?? "-").slice(0, 25),
    (j.location ?? "-").slice(0, 20),
    j.experience ?? "-",
    j.salary ?? "Not disclosed",
  ])
  const header = ["ID", "Title", "Company", "Location", "Experience", "Salary"]
  const widths = header.map((h, i) => Math.max(h.length, ...rows.map((r) => r[i].length)))
  const line = (cols: string[]) => cols.map((c, i) => c.padEnd(widths[i])).join("  ")
  return [line(header), line(widths.map((w) => "-".repeat(w))), ...rows.map(line)].join("\n")
}

export function formatPlain(job: JobCard & { fullDescription?: string | null }): string {
  const lines = [
    `Title:       ${job.title}`,
    `Company:     ${job.company ?? "-"}`,
    `Location:    ${job.location ?? "-"}`,
    `Experience:  ${job.experience ?? "-"}`,
    `Salary:      ${job.salary ?? "Not disclosed"}`,
    `Posted:      ${job.postedDate ?? "-"}`,
    `URL:         ${job.url}`,
    "",
    job.fullDescription ?? job.description ?? "(no description available)",
  ]
  return lines.join("\n")
}
