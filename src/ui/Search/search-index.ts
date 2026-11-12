import type { SearchRecord } from "virtual:documaru/search"

export interface SearchResult {
  record: SearchRecord
  /** Text around the first match, split so that every odd part is a match. */
  excerpt: string[]
}

interface IndexedRecord {
  record: SearchRecord
  page: string
  heading: string
  text: string
}

const RESULTS_LIMIT = 12
const EXCERPT_RADIUS = 60

let index: Promise<IndexedRecord[]> | null = null

/** The index is a separate chunk, downloaded when search is opened for the first time. */
export function loadSearchIndex() {
  index ??= import("virtual:documaru/search").then(module => module.default.map(record => ({
    record,
    page: record.page.toLowerCase(),
    heading: record.heading.toLowerCase(),
    text: record.text.toLowerCase(),
  })))

  return index
}

export async function search(query: string): Promise<SearchResult[]> {
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean)
  if (terms.length === 0) return []

  const scored: { score: number, item: IndexedRecord }[] = []

  for (const item of await loadSearchIndex()) {
    let score = 0

    for (const term of terms) {
      const title = item.heading || item.page
      let termScore = 0

      if (title.includes(term)) termScore += title.startsWith(term) ? 14 : 10
      // A match in the page title counts most for the page intro, sections only inherit a bit of it.
      if (item.heading && item.page.includes(term)) termScore += 3
      if (item.text.includes(term)) termScore += 2

      if (termScore === 0) {
        score = 0
        break
      }
      score += termScore
    }

    if (score > 0) scored.push({ score: score + (item.heading ? 0 : 1), item })
  }

  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, RESULTS_LIMIT)
    .map(({ item }) => ({ record: item.record, excerpt: excerptOf(item, terms) }))
}

function excerptOf(item: IndexedRecord, terms: string[]): string[] {
  const { text } = item.record
  if (text.length === 0) return []

  const first = terms.map(term => item.text.indexOf(term)).filter(position => position !== -1).sort((a, b) => a - b)[0] ?? 0
  const start = Math.max(0, first - EXCERPT_RADIUS)
  const end = Math.min(text.length, first + EXCERPT_RADIUS * 2)

  const excerpt = (start > 0 ? "…" : "") + text.slice(start, end) + (end < text.length ? "…" : "")
  const pattern = new RegExp(`(${terms.map(escapeRegExp).join("|")})`, "gi")

  return excerpt.split(pattern)
}

function escapeRegExp(text: string) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}
