import { defineCommand, option } from "@bunli/core"
import { z } from "zod"
import { apiFetch, writeError } from "../helpers.js"

export const suggestions = defineCommand({
  name: "suggestions",
  description: "Typeahead suggestions for job title / keyword search",
  options: {
    query: option(z.string().min(1), {
      description: "Partial search string to complete",
    }),
    limit: option(z.coerce.number().int().min(1).optional(), {
      description: "Cap number of suggestions returned",
    }),
    format: option(z.enum(["json", "table", "plain"]).default("json"), {
      description: "Output format",
    }),
  },
  handler: async ({ flags }) => {
    try {
      if (!flags.query) {
        writeError("--query is required", "MISSING_REQUIRED")
        process.exit(1)
        return
      }
      let data = await apiFetch<string[]>("/FindJob/GetTypeaheadSuggestions", {
        query: flags.query,
      })
      if (flags.limit) data = data.slice(0, flags.limit)

      if (flags.format === "table" || flags.format === "plain") {
        for (const s of data) console.log(s)
      } else {
        console.log(JSON.stringify(data, null, 2))
      }
    } catch (err) {
      writeError(err instanceof Error ? err.message : String(err), "SUGGESTIONS_FAILED")
      process.exit(1)
    }
  },
})


