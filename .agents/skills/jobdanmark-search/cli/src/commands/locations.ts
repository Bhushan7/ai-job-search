import { defineCommand, option } from "@bunli/core"
import { z } from "zod"
import { apiFetch, writeError } from "../helpers.js"

interface LocationItem {
  id: string
  text: string
  value: string
  category: string
  slug: string
}

interface LocationGroup {
  title: string
  items: LocationItem[]
}

function formatTable(groups: LocationGroup[]): string {
  const rows: string[][] = []
  for (const g of groups) {
    for (const item of g.items) {
      rows.push([g.title, item.text, item.value])
    }
  }
  if (rows.length === 0) return "No locations found."
  const header = ["Group", "Text", "Value"]
  const widths = header.map((h, i) => Math.max(h.length, ...rows.map((r) => r[i].length)))
  const line = (cols: string[]) => cols.map((c, i) => c.padEnd(widths[i])).join("  ")
  return [line(header), line(widths.map((w) => "-".repeat(w))), ...rows.map(line)].join("\n")
}

export const locations = defineCommand({
  name: "locations",
  description: "Suggest municipalities, zip codes, and regions for a query",
  options: {
    query: option(z.string().min(1), { description: "Location text to search (city, zip code, region)" }),
    limit: option(z.coerce.number().int().min(1).optional(), { description: "Cap total suggestions returned" }),
    format: option(z.enum(["json", "table", "plain"]).default("json"), { description: "Output format" }),
  },
  handler: async ({ flags }) => {
    try {
      if (!flags.query) {
        writeError("--query is required", "MISSING_REQUIRED")
        process.exit(1)
        return
      }
      let data = await apiFetch<LocationGroup[]>("/api/search/locations", { q: flags.query })

      if (flags.limit) {
        let remaining = flags.limit
        data = data
          .map((g) => {
            const items = g.items.slice(0, remaining)
            remaining -= items.length
            return { ...g, items }
          })
          .filter((g) => g.items.length > 0)
      }

      if (flags.format === "table") {
        console.log(formatTable(data))
      } else if (flags.format === "plain") {
        for (const g of data) {
          for (const item of g.items) console.log(`[${g.title}] ${item.text} (value: ${item.value})`)
        }
      } else {
        console.log(JSON.stringify(data, null, 2))
      }
    } catch (err) {
      writeError(err instanceof Error ? err.message : String(err), "LOCATIONS_FAILED")
      process.exit(1)
    }
  },
})
