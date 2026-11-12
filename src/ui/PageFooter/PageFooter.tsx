import "./PageFooter.scss"

import { PageInfo, pages, site } from "virtual:documaru"

import { href } from "@/app/router/file-router"
import Icon from "@/ui/Icon/Icon"

/** Pages the reader walks through with "previous" and "next". */
const sequence = pages.filter(page => page.nav && !page.landing)

function PageFooter(props: { page: PageInfo }) {
  const { page } = props
  if (page.landing || page.route === "/404") return null

  const index = sequence.indexOf(page)
  const previous = index > 0 ? sequence[index - 1] : null
  const next = index !== -1 && index < sequence.length - 1 ? sequence[index + 1] : null

  return (
    <footer className="page-footer">
      <div className="page-footer__meta">
        {site.editUrl ? (
          <a className="page-footer__edit" href={site.editUrl + page.file} target="_blank" rel="noopener noreferrer">
            <Icon name="pencil" /> Edit this page
          </a>
        ) : null}
        {page.updated ? (
          <span className="page-footer__updated">Last updated <time dateTime={page.updated}>{formatDate(page.updated)}</time></span>
        ) : null}
      </div>
      {previous || next ? (
        <nav className="page-footer__pager" aria-label="Pages">
          {previous ? (
            <a className="page-footer__step" href={href(previous.route)}>
              <span className="page-footer__direction"><Icon name="arrow-left" /> Previous</span>
              <span className="page-footer__title">{previous.label}</span>
            </a>
          ) : <span />}
          {next ? (
            <a className="page-footer__step page-footer__step--next" href={href(next.route)}>
              <span className="page-footer__direction">Next <Icon name="arrow-right" /></span>
              <span className="page-footer__title">{next.label}</span>
            </a>
          ) : null}
        </nav>
      ) : null}
    </footer>
  )
}

export default PageFooter


function formatDate(date: string) {
  // A fixed locale and time zone keep the prerendered page and the live one identical.
  return new Date(date).toLocaleDateString("en", { year: "numeric", month: "short", day: "numeric", timeZone: "UTC" })
}
