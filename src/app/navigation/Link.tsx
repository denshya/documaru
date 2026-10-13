import { StateOrPlain } from "@denshya/reactive"

import globalNavigation from "./navigation"


interface LinkProps {
  to: StateOrPlain<string> | undefined | null
  className?: StateOrPlain<string>
  classMods?: JSX.CustomAttributes["classMods"]
  label?: string
  children?: unknown
  id?: string
  style?: JSX.CustomAttributes["style"]
}

function Link(props: LinkProps & { label: string, children?: never }): unknown
function Link(props: LinkProps & { label?: never, children: unknown }): unknown
function Link(props: LinkProps) {
  // `/rest-api-facade` on project pages, empty on user pages.
  const basePath = new URL(document.baseURI).pathname.replace(/\/$/, "")

  const resolvedPath = globalNavigation.toResolved(props.to)
  const href = resolvedPath.to(path => path === "" || path.startsWith("http") ? path : basePath + path)
  const active = globalNavigation.whenWithin(href)

  function onClick(event: MouseEvent) {
    const to = href.current
    if (to.includes("://")) return

    event.preventDefault()

    if (to == null) return
    if (to === window.location.pathname) return

    globalNavigation.navigate(to)
  }

  return (
    <a
      id={props.id}
      className={props.className ?? "nav-link"}
      classMods={[{ active }, props.classMods]}
      style={props.style}
      href={href ?? undefined}
      on={{ click: onClick }}
      aria={{ ariaLabel: props.label }}
      target={resolvedPath.to(to => to.includes("://") ? "_blank" : "")}
    >{props.children}</a>
  )
}

export default Link
