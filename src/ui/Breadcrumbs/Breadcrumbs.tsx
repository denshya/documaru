import "./Breadcrumbs.scss"

import { State, StateArray } from "@denshya/reactive"

import Link from "@/app/navigation/Link"
import { startCase } from "@/utils/common"

import Icon from "../static/Icon/Icon"


type BreadcrumbsProps = {
  path: State<string>
}

export default function Breadcrumbs(props: BreadcrumbsProps) {
  const slugs = new StateArray(props.path.to(path => path.split("/").filter(Boolean)))

  return (
    <nav className="breadcrumbs" aria-label="Breadcrumb">
      <ol>
        {slugs.map((slug, index) => (
          <li>
            <Icon name="chevron-right" mounted={index !== 0} />
            <Link to={"/" + slugs.current.slice(0, index + 1).join("/")}>{startCase(slug)}</Link>
          </li>
        ))}
      </ol>
    </nav>
  )
}
