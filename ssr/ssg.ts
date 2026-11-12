import * as path from "path"

import { injectDOMPolyfill } from "./dom"



if (globalThis.URLPattern == null) {
  await import("urlpattern-polyfill")
}

injectDOMPolyfill(globalThis)


const buildPath = (...segments: string[]) => path.resolve(import.meta.dirname, "../build/", ...segments)

const { entries, modules } = await import("../build/bundle.json.map", { with: { type: "json" } })
const { component, inflator } = await import("../build/" + entries.essential.fileName)

const { WebJSXSerializerAsync } = await import("@denshya/tama")
const jsxSerializer = new WebJSXSerializerAsync
jsxSerializer.inherit(inflator)

const { default: templateHTML } = await import("../build/index.html?raw")

const { routes, site } = await import("../build/" + entries.routes.fileName)

/** `/learn/deep` is written to `learn/deep`, the home page to `index`. */
const outputName = (route: string) => route.slice(1) || "index"

// Markdown sources stay available next to the pages, e.g. `/learn/deep.md`.
routes.forEach(route => {
  Bun.write(Bun.file(buildPath(outputName(route.page.route) + ".md")), Bun.file(route.filePath.slice(1)))
})

const styles = await Promise.all(
  entries.essential.assets.map(async cssPath => {
    const { default: cssContent } = await import("../build/" + cssPath + "?raw")
    return `<style>${cssContent}</style>`
  })
)

for await (const route of routes) {
  const preloads = [
    modules[route.filePath].fileName,
    ...entries.index.imports,
    ...modules[route.filePath].imports ?? []
  ].map(importPath => `<link rel="preload" as="script" crossorigin href="${site.base}${importPath}">`)

  window.location.pathname = route.path
  window.dispatchEvent(new PopStateEvent("popstate"))

  const appString = await jsxSerializer.asyncComponentToString(component)
  let html = templateHTML
    .replace(/<title>[\s\S]*?<\/title>/, () => metaTags(route.page))
    .replace("<!--head-->", () => [...preloads, ...styles].join("\n"))
    .replace("<!--element-->", () => appString)

  entries.essential.assets.forEach(x => html = html.replace(`<link rel="stylesheet" crossorigin href="${site.base}${x}">`, ""))

  await Bun.write(Bun.file(buildPath(outputName(route.page.route) + ".html")), html)
}


function metaTags(page: { route: string, title: string, description: string }) {
  const isHome = page.route === "/"
  const title = isHome
    ? (site.description ? `${site.title} - ${site.description}` : site.title)
    : `${page.title} · ${site.title}`
  const description = page.description || site.description

  const tags = [
    `<title>${escapeHtml(title)}</title>`,
    `<meta property="og:title" content="${escapeHtml(isHome ? site.title : page.title)}">`,
    `<meta property="og:site_name" content="${escapeHtml(site.title)}">`,
    `<meta property="og:type" content="${isHome ? "website" : "article"}">`,
    `<meta name="twitter:card" content="summary">`,
  ]
  if (description) {
    tags.push(`<meta name="description" content="${escapeHtml(description)}">`)
    tags.push(`<meta property="og:description" content="${escapeHtml(description)}">`)
  }
  if (page.route === "/404") tags.push(`<meta name="robots" content="noindex">`)

  return tags.join("\n    ")
}

function escapeHtml(text: string) {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")
}
