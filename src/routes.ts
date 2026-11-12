import { pages, site } from "virtual:documaru"

import router, { href, pageByPattern } from "@/app/router/file-router"

/** Everything static generation needs to know about each page. */
const routes = router.routes.map(route => {
  const page = pageByPattern.get(route.pattern)!
  return { ...route, page, path: href(page.route) }
})

export { pages, routes, site }
