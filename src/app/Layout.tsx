import { State, StateArray } from "@denshya/reactive"
import { PageInfo } from "virtual:documaru"

import Breadcrumbs from "@/ui/Breadcrumbs/Breadcrumbs"
import Footer from "@/ui/Footer/Footer"
import Hero from "@/ui/Hero/Hero"
import PageFooter from "@/ui/PageFooter/PageFooter"
import Search from "@/ui/Search/Search"
import Sidebar from "@/ui/Sidebar/Sidebar"
import TableOfContents from "@/ui/TableOfContents/TableOfContents"
import Topbar from "@/ui/Topbar/Topbar"

import { updateActiveHeading } from "./behavior"
import globalNavigation, { documentTitle, pageOf, settleScroll } from "./navigation/navigation"
import { PageModule } from "./router/page-module.types"
import { menuOpen } from "./state"


interface PageView {
  page: PageInfo
  module: PageModule
}

async function Layout() {
  const initial = globalNavigation.match.current
  const view = new State<PageView>({ page: pageOf(initial), module: await initial!.route.resource() })

  // The prerendered title is right, unless a fallback document was served for this address.
  document.title = documentTitle(view.current.page)

  function show(next: PageView) {
    const apply = () => {
      view.set(next)
      document.title = documentTitle(next.page)

      menuOpen.set(false)
      settleScroll()
      updateActiveHeading()
    }

    const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
    if (document.startViewTransition == null || reducedMotion) return apply()

    document.startViewTransition(apply)
  }

  // Only the page opened last is shown, no matter in which order pages finish loading.
  let latest = 0
  globalNavigation.match.subscribe(async match => {
    const ticket = ++latest
    const page = pageOf(match)
    const module = await match!.route.resource()

    if (ticket === latest) show({ page, module })
  })

  return (
    <div className="layout" classMods={{ landing: view.to(view => view.page.landing), "menu-open": menuOpen }}>
      <a className="skip-link" href="#content">Skip to content</a>
      <Topbar />
      <div className="layout__body">
        <aside className="layout__sidebar" id="sidebar">
          <Sidebar />
        </aside>
        <div className="layout__backdrop" on={{ click: () => menuOpen.set(false) }} />
        <main className="layout__main" id="content">
          {dynamic(view, view => <Page view={view} />)}
        </main>
        <aside className="layout__toc">
          {dynamic(view, view => <TableOfContents headings={view.module.meta?.headings ?? []} />)}
        </aside>
      </div>
      <Footer />
      <Search />
    </div>
  )
}

export default Layout


/**
 * Renders a view that is replaced as a whole whenever the state changes.
 * A list of one item is what makes the replacement happen right at the change.
 */
function dynamic<T>(state: State<T>, render: (value: T) => unknown) {
  return new StateArray(state.to(value => [value])).map(render)
}

function Page(props: { view: PageView }) {
  const { page, module } = props.view

  return (
    <>
      <Hero frontmatter={module.meta?.frontmatter ?? {}} />
      <Breadcrumbs crumbs={page.crumbs} />
      <article className="prose">
        {module.default()}
      </article>
      <PageFooter page={page} />
    </>
  )
}
