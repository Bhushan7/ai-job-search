import { defineCommand, option } from "@bunli/core"
import { z } from "zod"
import { BASE_URL, fetchWithUA, writeError } from "../helpers.js"

interface JsonLdJobPosting {
  identifier?: { value?: string }
  url?: string
  title?: string
  description?: string
  datePosted?: string
  validThrough?: string
  employmentType?: string | string[]
  hiringOrganization?: { name?: string; logo?: string }
  jobLocation?: {
    address?: {
      streetAddress?: string
      addressLocality?: string
      postalCode?: string
      addressCountry?: string
    }
  }
}

function stripTags(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()
}

export const detail = defineCommand({
  name: "detail",
  description: "Fetch full detail for a single Jobbank job posting",
  options: {
    id: option(z.string().min(1), { description: "Numeric job ID from search results" }),
    format: option(z.enum(["json", "plain"]).default("json"), { description: "Output format" }),
  },
  handler: async ({ flags, positional }) => {
    try {
      const jobId = flags.id || positional?.[0]
      if (!jobId) {
        writeError("Missing job id argument", "MISSING_ARG")
        process.exit(1)
        return
      }

      const url = `${BASE_URL}/job/${jobId}/`
      const response = await fetchWithUA(url)
      if (response.status === 404) {
        writeError("Job not found", "NOT_FOUND")
        process.exit(1)
        return
      }
      if (!response.ok) {
        throw new Error(`Failed to fetch job page: ${response.status} ${response.statusText}`)
      }
      const html = await response.text()

      const ldMatch = html.match(
        /<script type="application\/ld\+json">([\s\S]*?)<\/script>/i
      )
      if (!ldMatch) {
        writeError("No JSON-LD found on job page", "PARSE_ERROR")
        process.exit(1)
        return
      }

      let ld: JsonLdJobPosting
      try {
        ld = JSON.parse(ldMatch[1])
      } catch {
        writeError("No JSON-LD found on job page", "PARSE_ERROR")
        process.exit(1)
        return
      }

      const employmentType = Array.isArray(ld.employmentType)
        ? ld.employmentType
        : ld.employmentType
          ? [ld.employmentType]
          : []

      const card = {
        id: ld.identifier?.value ?? jobId,
        url: ld.url ?? url,
        title: ld.title ?? "Untitled",
        description: ld.description ?? "",
        datePosted: ld.datePosted ?? null,
        deadline: ld.validThrough ?? null,
        employmentType,
        company: {
          name: ld.hiringOrganization?.name ?? null,
          logo: ld.hiringOrganization?.logo ?? null,
        },
        location: {
          streetAddress: ld.jobLocation?.address?.streetAddress ?? "",
          city: ld.jobLocation?.address?.addressLocality ?? "",
          postalCode: ld.jobLocation?.address?.postalCode ?? "",
          country: ld.jobLocation?.address?.addressCountry ?? "",
        },
      }

      if (flags.format === "plain") {
        console.log(`Title:    ${card.title}`)
        console.log(`Company:  ${card.company.name ?? "-"}`)
        console.log(`Location: ${card.location.city || "-"}`)
        console.log(`Posted:   ${card.datePosted ?? "-"}`)
        console.log(`Deadline: ${card.deadline ?? "-"}`)
        console.log(`URL:      ${card.url}`)
        console.log("")
        console.log(stripTags(card.description) || "(no description available)")
      } else {
        console.log(JSON.stringify(card, null, 2))
      }
    } catch (err) {
      writeError(err instanceof Error ? err.message : String(err), "DETAIL_FAILED")
      process.exit(1)
    }
  },
})
