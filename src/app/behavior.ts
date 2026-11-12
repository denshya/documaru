import globalNavigation, { navigateTo } from "./navigation/navigation"
import fileRouter from "./router/file-router"
import { activeHeading, menuOpen, searchOpen } from "./state"

/**
 * Page-wide behavior that is not tied to a component:
 * in-app navigation for every link, code copying, shortcuts and scroll tracking.
 */

/** How far below the top bar a heading is considered reached. */
const HEADING_REACH = 96
const COPIED_CLASS = "code-block__copy--copied"

export function installBehavior() {
  document.addEventListener("click", onClick)
  document.addEventListener("keydown", onKeyDown)
  document.addEventListener("pointerover", onPointerOver, { passive: true })

  let scheduled = false
  const onScroll = () => {
    if (scheduled) return
    scheduled = true

    requestAnimationFrame(() => {
      scheduled = false
      updateActiveHeading()
    })
  }
  window.addEventListener("scroll", onScroll, { passive: true })
  window.addEventListener("resize", onScroll, { passive: true })

  updateActiveHeading()
}

/** Finds the heading the reader is at and marks it in the table of contents. */
export function updateActiveHeading() {
  const links = document.querySelectorAll<HTMLAnchorElement>(".toc__link")
  if (links.length === 0) return activeHeading.set("")

  const ids = [...links].map(link => decodeURIComponent(link.hash.slice(1)))
  let active = ""

  for (const id of ids) {
    const heading = document.getElementById(id)
    if (heading == null) continue
    if (heading.getBoundingClientRect().top > HEADING_REACH) break

    active = id
  }

  // The last sections may be too short to ever reach the top.
  const atBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2
  if (atBottom && window.scrollY > 0) active = ids.at(-1)!

  activeHeading.set(active)
}


function onClick(event: MouseEvent) {
  if (!(event.target instanceof Element)) return

  const copyButton = event.target.closest<HTMLElement>(".code-block__copy")
  if (copyButton != null) return void copyCode(copyButton)

  const anchor = event.target.closest<HTMLAnchorElement>("a[href]")
  if (anchor != null) followLink(event, anchor)
}

async function copyCode(button: HTMLElement) {
  const code = button.closest("pre")?.querySelector("code")
  if (code == null) return

  try {
    await navigator.clipboard.writeText(code.innerText.replace(/\n$/, ""))
  } catch {
    return
  }

  button.classList.add(COPIED_CLASS)
  setTimeout(() => button.classList.remove(COPIED_CLASS), 1600)
}

/** Opens links to other pages in place, everything else is left to the browser. */
function followLink(event: MouseEvent, anchor: HTMLAnchorElement) {
  if (event.defaultPrevented || event.button !== 0) return
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
  if (anchor.target && anchor.target !== "_self") return
  if (anchor.hasAttribute("download")) return

  const url = new URL(anchor.href, window.location.href)
  if (url.origin !== window.location.origin) return

  const samePage = url.pathname === window.location.pathname && url.search === window.location.search
  if (samePage) {
    menuOpen.set(false)
    // Links to sections are regular anchors.
    if (url.hash) return

    event.preventDefault()
    window.scrollTo(0, 0)
    return
  }

  if (fileRouter.match(url.pathname) == null) return

  event.preventDefault()
  navigateTo(url.pathname, url.hash)
}

/** Starts loading a page as soon as its link is pointed at. */
function onPointerOver(event: PointerEvent) {
  if (!(event.target instanceof Element)) return

  const anchor = event.target.closest<HTMLAnchorElement>("a[href]")
  if (anchor == null || anchor.origin !== window.location.origin) return
  if (anchor.pathname === window.location.pathname) return

  const match = fileRouter.match(anchor.pathname)
  if (match == null || match === globalNavigation.match.current) return

  match.route.resource().catch(() => { /* It is reported when the page is actually opened. */ })
}

function onKeyDown(event: KeyboardEvent) {
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
    event.preventDefault()
    searchOpen.set(!searchOpen.current)
    return
  }

  if (event.key === "Escape") {
    searchOpen.set(false)
    menuOpen.set(false)
    return
  }

  if (event.key === "/" && !isTyping(event.target)) {
    event.preventDefault()
    searchOpen.set(true)
  }
}

function isTyping(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false
  return target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)
}
