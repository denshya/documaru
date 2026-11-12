import { PathRouter } from "@denshya/router"
import { PageInfo, pages, site } from "virtual:documaru"

import { PageModule } from "./page-module.types"

type PageResource = () => Promise<PageModule>

const modules = import.meta.glob("~docs/**/*.{md,mdx}")
const fileRouter = new PathRouter<PageResource>

/** Page details by route pattern. */
export const pageByPattern = new Map<string, PageInfo>()

for (const page of pages) {
  const filePath = "/docs/" + page.file
  const resource = modules[filePath] as PageResource | undefined
  if (resource == null) continue

  const pattern = patternOf(page.route)
  pageByPattern.set(pattern, page)
  fileRouter.routes.push({ filePath, pattern, resource })
}

export default fileRouter


/** Full path of a route, including the site base path. */
export function href(route: string) {
  return site.base + route.slice(1)
}

function patternOf(route: string) {
  // The not-found page is looked up by this exact pattern.
  if (route === "/404") return route
  if (route === "/") return site.base === "/" ? "/" : site.base.slice(0, -1) + "{/}?"

  return href(route) + "{/}?"
}
