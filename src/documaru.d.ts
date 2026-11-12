declare module "virtual:documaru" {
  export interface Site {
    title: string
    description: string
    /** Image URL (or data URI) shown next to the title. */
    logo: string | null
    favicon: string
    accent: string | null
    /** Base path, always starts and ends with `/`. */
    base: string
    repo: string | null
    repoUrl: string | null
    /** Prefix for "Edit this page" links, ends with `/`. */
    editUrl: string | null
    footer: string | null
  }

  export interface Crumb {
    label: string
    route?: string
  }

  export interface PageInfo {
    /** Path relative to the docs folder. */
    file: string
    /** Route without the base path, e.g. `/learn/deep`. */
    route: string
    title: string
    /** Sidebar label. */
    label: string
    description: string
    /** Page with a `hero` in its frontmatter: rendered without sidebar. */
    landing: boolean
    /** Whether the page is listed in the sidebar. */
    nav: boolean
    crumbs: Crumb[]
    /** ISO date of the last commit that touched the page. */
    updated?: string
  }

  export interface NavNode {
    label: string
    route?: string
    children?: NavNode[]
  }

  export const site: Site
  /** All pages in sidebar order. */
  export const pages: PageInfo[]
  export const tree: NavNode[]
}

declare module "virtual:documaru/search" {
  export interface SearchRecord {
    route: string
    /** Title of the page. */
    page: string
    /** Section heading, empty for the page intro. */
    heading: string
    anchor: string
    text: string
  }

  const records: SearchRecord[]
  export default records
}
