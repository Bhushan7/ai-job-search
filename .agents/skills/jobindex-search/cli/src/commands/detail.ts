import { defineCommand, option } from "@bunli/core"
import { z } from "zod"
import { htmlFetch, writeError, BASE_URL } from "../helpers.js"

function extractJobId(idOrUrl: string): string {
  const urlMatch = idOrUrl.match(/\/jobannonce\/([a-zA-Z0-9]+)/)
  if (urlMatch) return urlMatch[1]
  return idOrUrl
}

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
}

function stripTags(html: string): string {
  return html.replace(/<[^>]+>/g, "").trim()
}

export const detail = defineCommand({
  name: "detail",
  description: "Fetch full detail for a single Jobindex job listing",
  options: {
    id: option(z.string().min(1), {
      description: "Job ID from search results (e.g. h1647303), or a full Jobindex URL",
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
        return
      }
      const jobId = extractJobId(raw)
      const url = raw.startsWith("http") ? raw : `${BASE_URL}/jobannonce/${jobId}`

      const html = await htmlFetch(url)

      const titleMatch = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)
      const title = titleMatch ? decodeHtmlEntities(stripTags(titleMatch[1])) : "Untitled"

      const jsonLdMatch = html.match(
        /<script type="application\/ld\+json">([\s\S]*?)<\/script>/i
      )
      let company: string | null = null
      let description: string | null = null
      let deadline: string | null = null
      let datePosted: string | null = null

      if (jsonLdMatch) {
        try {
          const ld = JSON.parse(jsonLdMatch[1])
          company = ld.hiringOrganization?.name ?? null
          description = ld.description ? stripTags(decodeHtmlEntities(ld.description)) : null
          deadline = ld.validThrough ?? null
          datePosted = ld.datePosted ?? null
        } catch {
          // fall through to null fields if JSON-LD is malformed
        }
      }

      const card = {
        id: jobId,
        title,
        company,
        url,
        datePosted,
        deadline,
        description,
      }

      if (flags.format === "plain") {
        console.log(`Title:    ${card.title}`)
        console.log(`Company:  ${card.company ?? "-"}`)
        console.log(`Posted:   ${card.datePosted ?? "-"}`)
        console.log(`Deadline: ${card.deadline ?? "-"}`)
        console.log(`URL:      ${card.url}`)
        console.log("")
        console.log(card.description ?? "(no description available)")
      } else {
        console.log(JSON.stringify(card, null, 2))
      }
    } catch (err) {
      writeError(err instanceof Error ? err.message : String(err), "DETAIL_FAILED")
      process.exit(1)
    }
  },
})


