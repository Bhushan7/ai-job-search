import { defineCommand, option } from "@bunli/core"
import { z } from "zod"
import { apiFetch, writeError } from "../helpers.js"

interface Occupation {
  conceptUriDa: string
  preferredLabelDa: string
}

function formatTable(items: Occupation[]): string {
  if (items.length === 0) return "No occupations found."
  const rows = items.map((o) => [o.preferredLabelDa, o.conceptUriDa.split("/").pop() ?? "-"])
  const header = ["Label", "Identifier"]
  const widths = header.map((h, i) => Math.max(h.length, ...rows.map((r) => r[i].length)))
  const line = (cols: string[]) => cols.map((c, i) => c.padEnd(widths[i])).join("  ")
  return [line(header), line(widths.map((w) => "-".repeat(w))), ...rows.map(line)].join("\n")
}

export const occupations = defineCommand({
  name: "occupations",
  description: "Search occupation types (for building search filters)",
  options: {
    searchString: option(z.string().min(1), {
      description: "Search term for occupation, e.g. sygeplejerske",
    }),
    perPage: option(z.coerce.number().int().min(1).default(10), {
      description: "Max results to return",
    }),
    format: option(z.enum(["json", "table", "plain"]).default("json"), {
      description: "Output format",
    }),
  },
  handler: async ({ flags }) => {
    try {
      if (!flags.searchString) {
        writeError("--search-string is required", "MISSING_REQUIRED")
        process.exit(1)
        return
      }
      const data = await apiFetch<Occupation[]>("/OccupationSearch", {
        searchString: flags.searchString,
        perPage: String(flags.perPage),
      })

      if (flags.format === "table") {
        console.log(formatTable(data))
      } else if (flags.format === "plain") {
        for (const o of data) console.log(`${o.preferredLabelDa} — ${o.conceptUriDa}`)
      } else {
        console.log(JSON.stringify(data, null, 2))
      }
    } catch (err) {
      writeError(err instanceof Error ? err.message : String(err), "OCCUPATIONS_FAILED")
      process.exit(1)
    }
  },
})


