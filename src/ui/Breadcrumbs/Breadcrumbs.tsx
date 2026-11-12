import "./Breadcrumbs.scss"

import { Crumb } from "virtual:documaru"

import { href } from "@/app/router/file-router"

/** Folders the page lives in. The page itself is not repeated: its title is right below. */
function Breadcrumbs(props: { crumbs: Crumb[] }) {
  if (props.crumbs.length === 0) return null

  return (
    <nav className="breadcrumbs" aria-label="Breadcrumb">
      <ol>
        {props.crumbs.map(crumb => (
          <li>
            {crumb.route ? <a href={href(crumb.route)}>{crumb.label}</a> : <span>{crumb.label}</span>}
          </li>
        ))}
      </ol>
    </nav>
  )
}

export default Breadcrumbs
