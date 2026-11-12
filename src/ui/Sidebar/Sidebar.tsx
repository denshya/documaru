import "./Sidebar.scss"

import { StateBoolean } from "@denshya/reactive"
import { NavNode, tree } from "virtual:documaru"

import { currentRoute } from "@/app/navigation/navigation"
import { href } from "@/app/router/file-router"
import Icon from "@/ui/Icon/Icon"

/** Pages of the docs folder. Top-level folders are sections, deeper ones collapse. */
function Sidebar() {
  const pages = tree.filter(node => node.children == null)
  const sections = tree.filter(node => node.children != null)

  return (
    <nav className="sidebar" aria-label="Documentation">
      {pages.length > 0 ? <Items nodes={pages} /> : null}
      {sections.map(section => (
        <section className="sidebar__section">
          <h2 className="sidebar__heading">{section.label}</h2>
          <Items nodes={section.children!} />
        </section>
      ))}
    </nav>
  )
}

export default Sidebar


function Items(props: { nodes: NavNode[] }) {
  return (
    <ul className="sidebar__list">
      {props.nodes.map(node => (
        <li>
          {node.children != null ? <Group node={node} /> : (
            <a className="sidebar__link" classMods={{ active: currentRoute.is(node.route!) }} href={href(node.route!)}>{node.label}</a>
          )}
        </li>
      ))}
    </ul>
  )
}

function Group(props: { node: NavNode }) {
  const routes = routesOf(props.node)
  const expanded = new StateBoolean(routes.includes(currentRoute.current))
  // Opening a page reveals where it is, but never collapses what the reader opened.
  currentRoute.subscribe(route => routes.includes(route) && expanded.set(true))

  return (
    <div className="sidebar__group" classMods={{ expanded }}>
      <button className="sidebar__toggle" type="button" on={{ click: () => expanded.toggle() }}>
        <span>{props.node.label}</span>
        <Icon name="chevron-right" />
      </button>
      <div className="sidebar__nested">
        <Items nodes={props.node.children!} />
      </div>
    </div>
  )
}

function routesOf(node: NavNode): string[] {
  if (node.children == null) return node.route ? [node.route] : []
  return node.children.flatMap(routesOf)
}
