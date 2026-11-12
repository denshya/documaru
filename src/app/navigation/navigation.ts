import { RouteNavigation } from "@denshya/navigation"
import { PageInfo, site } from "virtual:documaru"

import fileRouter, { pageByPattern } from "../router/file-router"


const globalNavigation = new RouteNavigation(fileRouter)
export default globalNavigation

/** Details of the page that is currently open. */
export const currentPage = globalNavigation.match.to(match => pageOf(match))
export const currentRoute = currentPage.to(page => page.route)

export function pageOf(match: typeof globalNavigation.match.current): PageInfo {
  if (match == null) throw new TypeError("documaru: the page is not found and there is no `404.md` to show instead.")
  return pageByPattern.get(match.route.pattern)!
}

export function documentTitle(page: PageInfo) {
  if (page.route === "/") return site.description ? `${site.title} - ${site.description}` : site.title
  return `${page.title} · ${site.title}`
}


/** Where to scroll once the page that is being opened is shown. */
let pendingScroll: string | null = null

/** Opens a page without reloading the document. */
export function navigateTo(pathname: string, hash = "") {
  const previous = globalNavigation.match.current

  pendingScroll = hash || "top"
  globalNavigation.navigate({ pathname, search: "" } as Location)
  if (hash) window.history.replaceState(window.history.state, "", hash)

  // Same page: nothing is going to be rendered, scroll right away.
  if (globalNavigation.match.current === previous) settleScroll()
}

export function settleScroll() {
  if (pendingScroll == null) return

  const target = pendingScroll
  pendingScroll = null

  const element = target === "top" ? null : document.getElementById(decodeURIComponent(target.slice(1)))
  if (element != null) element.scrollIntoView()
  else window.scrollTo(0, 0)
}
