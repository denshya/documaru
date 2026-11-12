export interface PageHeading {
  depth: number
  text: string
  id: string
}

export interface PageMeta {
  /** Path relative to the docs folder. */
  file: string
  frontmatter: Record<string, unknown>
  /** Second and third level headings, in document order. */
  headings: PageHeading[]
}

export interface PageModule {
  default: () => unknown
  /** Added to every page at build time, see `vite.site.ts`. */
  meta?: PageMeta
}
