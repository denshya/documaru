import "./TableOfContents.scss"

import { PageHeading } from "@/app/router/page-module.types"
import { activeHeading } from "@/app/state"

function TableOfContents(props: { headings: PageHeading[] }) {
  if (props.headings.length === 0) return null

  return (
    <nav className="toc" aria-label="On this page">
      <div className="toc__title">On this page</div>
      <ul className="toc__list">
        {props.headings.map(heading => (
          <li className={heading.depth > 2 ? "toc__item toc__item--nested" : "toc__item"}>
            <a className="toc__link" classMods={{ active: activeHeading.is(heading.id) }} href={"#" + heading.id}>{heading.text}</a>
          </li>
        ))}
      </ul>
    </nav>
  )
}

export default TableOfContents
