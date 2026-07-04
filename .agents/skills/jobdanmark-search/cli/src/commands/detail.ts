import { defineCommand, option } from "@bunli/core"
import { z } from "zod"
import { BASE_URL, stripHtml, writeError } from "../helpers.js"

interface JsonLdJobPosting {
  title?: string
  datePosted?: string
  validThrough?: string
  employmentType?: string | string[]
  hiringOrganization?: { name?: string; logo?: string }
  jobLocation?: {
    address?: {
      streetAddress?: string
      addressLocality?: string
      addressRegion?: string
      postalCode?: string
      addressCountry?: string
    }
  }
  description?: string
}

export const detail = defineCommand({
  name: "detail",
  description: "Fetch full detail for a single Jobdanmark job posting",
  options: {
    slug: option(z.string().min(1), { description: "Job slug from search results" }),
    format: option(z.enum(["json", "plain"]).default("json"), { description: "Output format" }),
  },
  handler: async ({ flags, positional }) => {
    try {
      const slug = flags.slug || positional?.[0]
      if (!slug) {
        writeError("Missing slug argument", "MISSING_ARG")
        process.exit(1)
        return
      }

      const url = `${BASE_URL}/job/${slug}`
      const response = await fetch(url)
      if (response.status === 404) {
        writeError("Job not found", "NOT_FOUND")
        process.exit(1)
        return
      }
      if (!response.ok) {
        throw new Error(`API request failed: ${response.status} ${response.statusText}`)
      }
      const html = await response.text()

      const ldMatch = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/i)
      if (!ldMatch) {
        writeError("Failed to parse JSON-LD from job page", "PARSE_ERROR")
        process.exit(1)
        return
      }

      let ld: JsonLdJobPosting
      try {
        ld = JSON.parse(ldMatch[1])
      } catch {
        writeError("Failed to parse JSON-LD from job page", "PARSE_ERROR")
        process.exit(1)
        return
      }

      const employmentType = Array.isArray(ld.employmentType)
        ? ld.employmentType
        : ld.employmentType
          ? [ld.employmentType]
          : []

      const card = {
        slug,
        url,
        title: ld.title ?? "Untitled",
        datePosted: ld.datePosted ?? null,
        validThrough: ld.validThrough ?? null,
        employmentType,
        hiringOrganization: {
          name: ld.hiringOrganization?.name ?? null,
          logo: ld.hiringOrganization?.logo ?? null,
        },
        jobLocation: {
          streetAddress: ld.jobLocation?.address?.streetAddress ?? null,
          addressLocality: ld.jobLocation?.address?.addressLocality ?? null,
          addressRegion: ld.jobLocation?.address?.addressRegion ?? null,
          postalCode: ld.jobLocation?.address?.postalCode ?? null,
          addressCountry: ld.jobLocation?.address?.addressCountry ?? null,
        },
        description: ld.description ?? "",
      }

      if (flags.format === "plain") {
        console.log(`Title:    ${card.title}`)
        console.log(`Company:  ${card.hiringOrganization.name ?? "-"}`)
        console.log(`Location: ${card.jobLocation.addressLocality ?? "-"}`)
        console.log(`Posted:   ${card.datePosted ?? "-"}`)
        console.log(`Deadline: ${card.validThrough ?? "-"}`)
        console.log(`URL:      ${card.url}`)
        console.log("")
        console.log(stripHtml(card.description) || "(no description available)")
      } else {
        console.log(JSON.stringify(card, null, 2))
      }
    } catch (err) {
      writeError(err instanceof Error ? err.message : String(err), "DETAIL_FAILED")
      process.exit(1)
    }
  },
})
