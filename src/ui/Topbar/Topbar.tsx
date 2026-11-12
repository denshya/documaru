import "./Topbar.scss"

import { NavNode, site, tree } from "virtual:documaru"

import { currentRoute } from "@/app/navigation/navigation"
import { href } from "@/app/router/file-router"
import { menuOpen, searchOpen } from "@/app/state"
import Icon from "@/ui/Icon/Icon"

/** Top-level folders double as the main navigation. More than that does not fit. */
const SECTIONS_LIMIT = 5

function Topbar() {
  const sections = tree
    .filter(node => node.children != null)
    .slice(0, SECTIONS_LIMIT)
    .map(node => ({ label: node.label, routes: routesOf(node) }))

  const isApple = /Mac|iPhone|iPad/.test(globalThis.navigator?.platform ?? "")

  return (
    <header className="topbar">
      <div className="topbar__inner">
        <button className="topbar__button topbar__menu" type="button" aria-label="Open navigation" aria-controls="sidebar" on={{ click: () => menuOpen.set(true) }}>
          <Icon name="menu" />
        </button>
        <a className="topbar__brand" href={href("/")}>
          {site.logo ? <img src={site.logo} alt="" /> : null}
          <span>{site.title}</span>
        </a>
        <nav className="topbar__nav" aria-label="Sections">
          {sections.map(section => (
            <a className="topbar__link" classMods={{ active: currentRoute.to(route => section.routes.includes(route)) }} href={href(section.routes[0])}>
              {section.label}
            </a>
          ))}
        </nav>
        <div className="topbar__actions">
          <button className="topbar__search" type="button" aria-label="Search" on={{ click: () => searchOpen.set(true) }}>
            <Icon name="loupe" />
            <span>Search</span>
            <kbd>{isApple ? "⌘ K" : "Ctrl K"}</kbd>
          </button>
          <button className="topbar__button topbar__theme" type="button" aria-label="Switch between light and dark theme" on={{ click: toggleTheme }}>
            <Icon name="sun" />
            <Icon name="moon" />
          </button>
          {site.repoUrl ? (
            <a className="topbar__button" href={site.repoUrl} target="_blank" rel="noopener noreferrer" aria-label="GitHub repository">
              <Icon name="github" />
            </a>
          ) : null}
        </div>
      </div>
    </header>
  )
}

export default Topbar


function routesOf(node: NavNode): string[] {
  if (node.children == null) return node.route ? [node.route] : []
  return node.children.flatMap(routesOf)
}

function toggleTheme() {
  const root = document.documentElement
  const isDark = root.dataset.theme
    ? root.dataset.theme === "dark"
    : window.matchMedia("(prefers-color-scheme: dark)").matches

  const next = isDark ? "light" : "dark"
  root.dataset.theme = next

  try {
    window.localStorage.setItem("documaru-theme", next)
  } catch {
    // Storage is unavailable: the choice lives until the page is closed.
  }
}
