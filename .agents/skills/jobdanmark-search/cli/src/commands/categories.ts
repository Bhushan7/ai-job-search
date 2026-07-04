import { defineCommand, option } from "@bunli/core"
import { z } from "zod"
import { apiFetch, writeError } from "../helpers.js"

interface Category {
  id: number
  title: string
  helpText?: string
  count: number
}

function formatTable(items: Category[]): string {
  if (items.length === 0) return "No categories found."
  const rows = items.map((c) => [String(c.id), c.title.slice(0, 45), String(c.count)])
  const header = ["ID", "Title", "Count"]
  const widths = header.map((h, i) => Math.max(h.length, ...rows.map((r) => r[i].length)))
  const line = (cols: string[]) => cols.map((c, i) => c.padEnd(widths[i])).join("  ")
  return [line(header), line(widths.map((w) => "-".repeat(w))), ...rows.map(line)].join("\n")
}

export const categories = defineCommand({
  name: "categories",
  description: "List all Jobdanmark job categories with live job counts",
  options: {
    limit: option(z.coerce.number().int().min(1).optional(), { description: "Cap number of categories returned" }),
    format: option(z.enum(["json", "table", "plain"]).default("json"), { description: "Output format" }),
  },
  handler: async ({ flags }) => {
    try {
      let data = await apiFetch<Category[]>("/api/categorycount/getcounts")
      if (flags.limit) data = data.slice(0, flags.limit)

      if (flags.format === "table") {
        console.log(formatTable(data))
      } else if (flags.format === "plain") {
        for (const c of data) console.log(`[${c.id}] ${c.title} (${c.count} jobs)`)
      } else {
        console.log(JSON.stringify(data, null, 2))
      }
    } catch (err) {
      writeError(err instanceof Error ? err.message : String(err), "CATEGORIES_FAILED")
      process.exit(1)
    }
  },
})
