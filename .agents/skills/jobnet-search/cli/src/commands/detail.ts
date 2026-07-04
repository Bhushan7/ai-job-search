import { defineCommand, option } from "@bunli/core"
import { z } from "zod"
import { apiFetch, stripHtml, writeError } from "../helpers.js"

interface DetailResponse {
  id: string
  title: string
  body?: string
  publicationDateTime?: string
  employer?: { name?: string }
  job?: { address?: { city?: string; postalCode?: string } }
  application?: { deadlineDate?: string; url?: string }
}

export const detail = defineCommand({
  name: "detail",
  description: "Fetch full detail for a single Jobnet job ad",
  options: {
    id: option(z.string().min(1), {
      description: "The jobAdId UUID from search results",
    }),
    format: option(z.enum(["json", "plain"]).default("json"), {
      description: "Output format",
    }),
  },
  handler: async ({ flags, positional }) => {
    try {
      const jobAdId = flags.id || positional?.[0]
      if (!jobAdId) {
        writeError("Missing job ad id argument", "MISSING_ARG")
        process.exit(1)
        return
      }

      const data = await apiFetch<DetailResponse>(`/FindJob/JobAdDetails/${jobAdId}`, {
        incrementViews: "false",
      })

      if (flags.format === "plain") {
        console.log(`Title:    ${data.title}`)
        console.log(`Employer: ${data.employer?.name ?? "-"}`)
        console.log(`Location: ${data.job?.address?.city ?? "-"}`)
        console.log(`Deadline: ${data.application?.deadlineDate ?? "-"}`)
        console.log(`Apply:    ${data.application?.url || `https://jobnet.dk/job/${data.id}`}`)
        console.log("")
        console.log(data.body ? stripHtml(data.body) : "(no description available)")
      } else {
        console.log(JSON.stringify(data, null, 2))
      }
    } catch (err) {
      writeError(err instanceof Error ? err.message : String(err), "DETAIL_FAILED")
      process.exit(1)
    }
  },
})


