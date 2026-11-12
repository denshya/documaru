import { execFileSync } from "child_process"
import * as fs from "fs"
import GithubSlugger from "github-slugger"
import { fromMarkdown } from "mdast-util-from-markdown"
import { gfmFromMarkdown } from "mdast-util-gfm"
import { toString } from "mdast-util-to-string"
import { gfm } from "micromark-extension-gfm"
import * as path from "path"
import { visit } from "unist-util-visit"
import { Plugin } from "vite"
import { parse as parseYaml } from "yaml"

/**
 * Everything the site knows about the docs folder at build time:
 * routes, titles, sidebar tree, per-page headings, search records and site config.
 *
 * - `virtual:documaru` - site config, ordered page list and sidebar tree.
 * - `virtual:documaru/search` - search records, loaded lazily by the search dialog.
 * - every page module gets an extra `meta` export (frontmatter, headings, edit path).
 */

const SITE_ID = "virtual:documaru"
const SEARCH_ID = "virtual:documaru/search"

const PAGE_EXTENSION = /\.(md|mdx)$/
const ORDER_PREFIX = /^(\d+)[-_.]\s*/
const FRONTMATTER = /^---\r?\n([\s\S]*?)\r?\n---[ \t]*(\r?\n|$)/

export interface SiteOptions {
  /** Absolute path of the docs folder that is being built. */
  docsDir: string
  /** Base path the site is served from, always starts and ends with `/`. */
  base: string
}

interface Heading { depth: number, text: string, id: string }
interface SearchRecord { route: string, page: string, heading: string, anchor: string, text: string }
interface Crumb { label: string, route?: string }
interface NavNode { label: string, route?: string, children?: NavNode[] }

interface Page {
  /** Path relative to the docs folder, e.g. `learn/01-intro.md`. */
  file: string
  route: string
  title: string
  label: string
  description: string
  order: number
  landing: boolean
  nav: boolean
  crumbs: Crumb[]
  updated?: string

  frontmatter: Record<string, unknown>
  headings: Heading[]
  sections: Omit<SearchRecord, "route" | "page">[]
}

interface Folder {
  name: string
  label: string
  order: number
  index?: Page
  pages: Page[]
  folders: Map<string, Folder>
}


export function splitFrontmatter(source: string): { data: Record<string, unknown>, body: string } {
  const match = source.match(FRONTMATTER)
  if (match == null) return { data: {}, body: source }

  let data: unknown
  try {
    data = parseYaml(match[1])
  } catch {
    data = null
  }

  // Blank lines keep line numbers in errors and source maps intact.
  const body = match[0].replace(/[^\n]/g, "") + source.slice(match[0].length)
  return { data: isRecord(data) ? data : {}, body }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value != null && typeof value === "object" && !Array.isArray(value)
}

function startCase(input: string): string {
  return input
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .trim()
    .replace(/\b[a-z]/g, char => char.toUpperCase())
}

function cleanSegment(segment: string) {
  return segment.replace(ORDER_PREFIX, "")
}

function prefixOrder(segment: string): number | undefined {
  const match = segment.match(ORDER_PREFIX)
  return match ? Number(match[1]) : undefined
}

function asNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined
}

function squash(text: string) {
  return text.replace(/\s+/g, " ").trim()
}

function truncate(text: string, length: number) {
  if (text.length <= length) return text
  return text.slice(0, length).replace(/\s+\S*$/, "") + "…"
}


function listFiles(directory: string, prefix = ""): string[] {
  if (!fs.existsSync(directory)) return []

  return fs.readdirSync(directory, { withFileTypes: true })
    .sort((a, b) => a.name.localeCompare(b.name, "en", { numeric: true }))
    .flatMap(entry => {
      const relative = prefix ? `${prefix}/${entry.name}` : entry.name
      if (entry.name.startsWith(".")) return []
      if (entry.isDirectory()) return listFiles(path.join(directory, entry.name), relative)
      return [relative]
    })
}

function routeOf(file: string) {
  const segments = file.replace(PAGE_EXTENSION, "").split("/")
  const last = cleanSegment(segments.at(-1)!)
  const parent = segments.length > 1 ? cleanSegment(segments.at(-2)!) : null
  const isIndex = last === "index" || last === parent

  const routeSegments = (isIndex ? segments.slice(0, -1) : segments).map(cleanSegment)
  return { route: "/" + routeSegments.join("/"), isIndex, directories: segments.slice(0, -1) }
}

function analyze(file: string, source: string): Pick<Page, "frontmatter" | "headings" | "sections" | "description"> & { title?: string } {
  const { data: frontmatter, body } = splitFrontmatter(source)
  // ESM lines of MDX files are not content.
  const markdown = file.endsWith(".mdx") ? body.replace(/^(import|export)\s.*$/gm, "") : body

  const tree = fromMarkdown(markdown, { extensions: [gfm()], mdastExtensions: [gfmFromMarkdown()] })

  // Mirrors `rehype-slug`: one slugger per file, every heading counts.
  const slugger = new GithubSlugger
  const ids = new Map<unknown, Heading>()
  visit(tree, "heading", node => {
    const text = squash(toString(node, { includeImageAlt: false }))
    ids.set(node, { depth: node.depth, text, id: slugger.slug(text) })
  })

  let title = asString(frontmatter.title)
  let description = asString(frontmatter.description)

  const headings: Heading[] = []
  const sections: Page["sections"] = [{ heading: "", anchor: "", text: "" }]

  for (const node of tree.children) {
    if (node.type === "heading") {
      const heading = ids.get(node)!
      if (node.depth === 1) {
        title ??= heading.text
        continue
      }

      if (node.depth <= 3) headings.push(heading)
      sections.push({ heading: heading.text, anchor: heading.id, text: "" })
      continue
    }
    if (node.type === "html" || node.type === "definition") continue

    const text = squash(toString(node, { includeImageAlt: false }))
    if (text.length === 0) continue

    if (node.type === "paragraph") description ??= truncate(text, 160)
    sections.at(-1)!.text += (sections.at(-1)!.text ? " " : "") + text
  }

  return {
    frontmatter,
    headings,
    sections: sections.filter(section => section.heading || section.text),
    title,
    description: description ?? "",
  }
}

function readCategory(directory: string): { label?: string, order?: number } {
  try {
    const category: unknown = JSON.parse(fs.readFileSync(path.join(directory, "_category_.json"), "utf8"))
    if (!isRecord(category)) return {}

    return { label: asString(category.label), order: asNumber(category.position) ?? asNumber(category.order) }
  } catch {
    return {}
  }
}

/** Last commit dates. Skipped for shallow clones, where every file would report the same commit. */
function createDateReader(directory: string) {
  try {
    const git = (...args: string[]) => execFileSync("git", args, { cwd: directory, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim()
    if (git("rev-parse", "--is-inside-work-tree") !== "true") return null
    if (git("rev-parse", "--is-shallow-repository") === "true") return null

    return (file: string) => {
      try {
        return git("log", "-1", "--format=%cI", "--", file) || undefined
      } catch {
        return undefined
      }
    }
  } catch {
    return null
  }
}

function dataUri(file: string) {
  const types: Record<string, string> = { ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp", ".gif": "image/gif", ".ico": "image/x-icon" }
  const type = types[path.extname(file).toLowerCase()]
  if (type == null) throw new Error(`documaru: unsupported logo format '${file}'.`)

  return `data:${type};base64,${fs.readFileSync(file).toString("base64")}`
}

/** Whether black text reads better than white on the color. Only hex colors are measured. */
function isLightColor(color: string) {
  const hex = color.match(/^#([0-9a-f]{3,8})$/i)?.[1]
  if (hex == null || hex.length === 5 || hex.length === 7) return false

  const digits = hex.length <= 4 ? [...hex.slice(0, 3)].map(digit => digit + digit) : hex.slice(0, 6).match(/../g)!
  const [red, green, blue] = digits.map(digit => {
    const channel = parseInt(digit, 16) / 255
    return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4
  })

  return 0.2126 * red + 0.7152 * green + 0.0722 * blue > 0.3
}

function letterIcon(letter: string, color: string, textColor: string) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="7" fill="${color}"/><text x="16" y="22.5" font-family="system-ui,sans-serif" font-size="19" font-weight="700" text-anchor="middle" fill="${textColor}">${letter}</text></svg>`
  return "data:image/svg+xml," + encodeURIComponent(svg)
}


function readSite(options: SiteOptions, homeTitle?: string, homeDescription?: string) {
  const env = process.env

  const repo = asString(env.DOCUMARU_REPO)?.replace(/^https?:\/\/github\.com\//, "").replace(/\/$/, "")
  const branch = asString(env.DOCUMARU_BRANCH) ?? "main"
  const docsPath = (asString(env.DOCUMARU_DOCS_PATH) ?? "docs").replace(/^\.?\/+|\/+$/g, "")

  const title = asString(env.DOCUMARU_TITLE) ?? (repo ? startCase(repo.split("/").at(-1)!) : homeTitle ?? "Documentation")
  const description = asString(env.DOCUMARU_DESCRIPTION) ?? homeDescription ?? ""

  const accentInput = asString(env.DOCUMARU_ACCENT)
  if (accentInput != null && /[;{}<>]/.test(accentInput)) throw new Error(`documaru: '${accentInput}' is not a color.`)
  const accent = accentInput ?? null
  // Text on accent backgrounds stays readable for light accents too.
  const accentOn = accent != null && isLightColor(accent) ? "#16181d" : "#ffffff"

  const logoInput = asString(env.DOCUMARU_LOGO)
  let logo: string | null = null
  if (logoInput != null) {
    logo = /^(https?:)?\/\//.test(logoInput) ? logoInput : dataUri(path.resolve(options.docsDir, logoInput))
  }
  const letter = (title.match(/[\p{L}\p{N}]/u)?.[0] ?? "D").toUpperCase()
  const favicon = logo ?? letterIcon(letter, accent && /^#[0-9a-f]{3,8}$/i.test(accent) ? accent : "#3451d1", accentOn)

  return {
    title,
    description,
    logo,
    favicon,
    accent,
    accentOn,
    base: options.base,
    repo: repo ?? null,
    repoUrl: repo ? `https://github.com/${repo}` : null,
    editUrl: repo ? `https://github.com/${repo}/edit/${branch}/${docsPath ? docsPath + "/" : ""}` : null,
    footer: asString(env.DOCUMARU_FOOTER) ?? null,
  }
}

function scan(options: SiteOptions, withDates: boolean) {
  const root: Folder = { name: "", label: "", order: 0, pages: [], folders: new Map }
  const files = listFiles(options.docsDir)
  const readDate = withDates ? createDateReader(process.env.DOCUMARU_SOURCE_DIR || options.docsDir) : null

  const byRoute = new Map<string, Page>()
  const special: Page[] = []
  let homeTitle: string | undefined

  for (const file of files) {
    if (!PAGE_EXTENSION.test(file)) continue
    if (file.split("/").some(segment => segment.startsWith("_"))) continue

    const { route, isIndex, directories } = routeOf(file)
    if (byRoute.has(route)) {
      console.warn(`documaru: '${file}' is skipped, '${byRoute.get(route)!.file}' already serves '${route}'.`)
      continue
    }

    const analysis = analyze(file, fs.readFileSync(path.join(options.docsDir, file), "utf8"))
    const { frontmatter } = analysis

    // A landing page usually has no heading of its own: the hero is its title.
    const ownTitle = analysis.title ?? (isRecord(frontmatter.hero) ? asString(frontmatter.hero.title) : undefined)
    const title = ownTitle ?? (route === "/" ? "Home" : startCase(cleanSegment(path.basename(file).replace(PAGE_EXTENSION, ""))))
    if (route === "/") homeTitle = ownTitle

    const page: Page = {
      ...analysis,
      title,
      file,
      route,
      label: asString(frontmatter.sidebar_label) ?? asString(frontmatter.label) ?? title,
      order: asNumber(frontmatter.order) ?? asNumber(frontmatter.sidebar_position) ?? prefixOrder(path.basename(file)) ?? Infinity,
      landing: isRecord(frontmatter.hero),
      nav: frontmatter.hidden !== true && frontmatter.sidebar !== false,
      crumbs: [],
      updated: readDate?.(file),
    }
    byRoute.set(route, page)

    if (route === "/404") {
      page.nav = false
      special.push(page)
      continue
    }

    let folder = root
    let directory = options.docsDir
    for (const name of directories) {
      directory = path.join(directory, name)
      if (!folder.folders.has(name)) {
        const category = readCategory(directory)
        folder.folders.set(name, {
          name,
          label: category.label ?? startCase(cleanSegment(name)),
          order: category.order ?? prefixOrder(name) ?? Infinity,
          pages: [],
          folders: new Map,
        })
      }
      folder = folder.folders.get(name)!
    }

    if (isIndex) folder.index = page
    else folder.pages.push(page)
  }

  // Flatten in sidebar order: that order is also what "previous / next" follows.
  const ordered: Page[] = []

  function build(folder: Folder, crumbs: Crumb[]): NavNode[] {
    const nodes: NavNode[] = []

    if (folder.index != null) {
      const index = folder.index
      index.crumbs = crumbs.slice(0, -1)
      ordered.push(index)

      if (index.nav && !index.landing) {
        nodes.push({ label: index.label === folder.label ? "Overview" : index.label, route: index.route })
      }
    }

    const entries = [
      ...folder.pages.map(page => ({ order: page.order, name: page.file, page })),
      ...[...folder.folders.values()].map(child => ({ order: child.order, name: child.name, folder: child })),
    ].sort((a, b) => (a.order - b.order) || a.name.localeCompare(b.name, "en", { numeric: true }))

    for (const entry of entries) {
      if ("page" in entry) {
        entry.page.crumbs = crumbs
        ordered.push(entry.page)
        if (entry.page.nav) nodes.push({ label: entry.page.label, route: entry.page.route })
        continue
      }

      const child = entry.folder
      const children = build(child, [...crumbs, { label: child.label, route: child.index?.route }])
      if (children.length > 0) nodes.push({ label: child.label, children })
    }

    return nodes
  }

  const tree = build(root, [])
  const pages = [...ordered, ...special]
  const site = readSite(options, homeTitle, root.index?.description)

  return { site, pages, tree }
}


function documaruSite(options: SiteOptions): Plugin[] {
  let cache: ReturnType<typeof scan> | null = null
  let isBuild = false

  const data = () => cache ??= scan(options, isBuild)
  const pageOf = (id: string) => {
    const file = path.relative(options.docsDir, id.split("?")[0]).split(path.sep).join("/")
    if (file.startsWith("..")) return null

    return data().pages.find(page => page.file === file) ?? null
  }

  const isPageModule = (id: string) => PAGE_EXTENSION.test(id.split("?")[0]) && !id.includes("?raw")

  const site: Plugin = {
    name: "documaru:site",
    enforce: "pre",

    configResolved(config) {
      isBuild = config.command === "build"
    },

    resolveId(id) {
      if (id === SITE_ID || id === SEARCH_ID) return "\0" + id
    },
    load(id) {
      if (id === "\0" + SITE_ID) {
        const { site, pages, tree } = data()
        const publicPages = pages.map(({ file, route, title, label, description, landing, nav, crumbs, updated }) => ({ file, route, title, label, description, landing, nav, crumbs, updated }))

        return [
          `export const site = ${JSON.stringify(site)}`,
          `export const pages = ${JSON.stringify(publicPages)}`,
          `export const tree = ${JSON.stringify(tree)}`,
        ].join("\n")
      }
      if (id === "\0" + SEARCH_ID) {
        const records: SearchRecord[] = data().pages
          .filter(page => page.route !== "/404" && page.frontmatter.search !== false)
          .flatMap(page => page.sections.map(section => ({ route: page.route, page: page.title, ...section })))

        return `export default ${JSON.stringify(records)}`
      }
    },

    // Frontmatter is not markdown: take it out before MDX sees the file.
    transform(code, id) {
      if (!isPageModule(id) || !FRONTMATTER.test(code)) return
      return { code: splitFrontmatter(code).body, map: null }
    },

    transformIndexHtml(html) {
      const { site } = data()
      // Doubled selector: wins over the default in the stylesheet regardless of their order.
      const accent = site.accent ? `<style>:root:root{--accent-base:${site.accent};--accent-on:${site.accentOn}}</style>` : ""

      return html
        .replace("<!--title-->", escapeHtml(site.title))
        .replace("<!--favicon-->", `<link rel="icon" href="${escapeHtml(site.favicon)}">`)
        .replace("<!--accent-->", accent)
    },

    // Images and other files next to the pages are served from their own paths.
    configureServer(server) {
      server.watcher.add(options.docsDir)
      server.middlewares.use((request, response, next) => {
        const pathname = decodeURIComponent((request.url ?? "").split("?")[0])
        if (!pathname.startsWith(options.base) || PAGE_EXTENSION.test(pathname)) return next()

        const file = path.join(options.docsDir, pathname.slice(options.base.length))
        if (!file.startsWith(options.docsDir) || !fs.existsSync(file) || !fs.statSync(file).isFile()) return next()
        // Let vite handle requests for modules it transforms itself.
        if (request.headers["sec-fetch-dest"] === "script") return next()

        fs.createReadStream(file).pipe(response)
      })
    },
    generateBundle() {
      for (const file of listFiles(options.docsDir)) {
        if (PAGE_EXTENSION.test(file) || path.basename(file) === "_category_.json") continue
        this.emitFile({ type: "asset", fileName: file, source: fs.readFileSync(path.join(options.docsDir, file)) })
      }
    },

    handleHotUpdate({ file, server }) {
      if (!file.startsWith(options.docsDir)) return
      cache = null

      for (const id of [SITE_ID, SEARCH_ID]) {
        const module = server.moduleGraph.getModuleById("\0" + id)
        if (module) server.moduleGraph.invalidateModule(module)
      }
      server.ws.send({ type: "full-reload" })
      return []
    },
  }

  const meta: Plugin = {
    name: "documaru:page-meta",
    enforce: "post",

    transform(code, id) {
      if (!isPageModule(id)) return

      const page = pageOf(id)
      if (page == null) return

      const meta = { file: page.file, frontmatter: page.frontmatter, headings: page.headings }
      return { code: `${code}\nexport const meta = ${JSON.stringify(meta)}\n`, map: null }
    },
  }

  return [site, meta]
}

export default documaruSite

/** File to route table for build-time link rewriting. */
export function createRouteTable(options: SiteOptions) {
  const table = new Map<string, string>()
  for (const file of listFiles(options.docsDir)) {
    if (!PAGE_EXTENSION.test(file)) continue
    const { route } = routeOf(file)
    if (![...table.values()].includes(route)) table.set(file, route)
  }
  return table
}

export function escapeHtml(text: string) {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")
}
