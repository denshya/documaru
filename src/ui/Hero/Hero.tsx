import "./Hero.scss"

import { site } from "virtual:documaru"

import { href } from "@/app/router/file-router"

interface HeroAction {
  text: string
  link: string
  variant?: "primary" | "secondary"
}

interface Feature {
  title: string
  description?: string
  link?: string
}

/**
 * Landing page header, described in the page frontmatter:
 *
 * ```yaml
 * hero:
 *   title: Project
 *   tagline: One sentence about it
 *   actions:
 *     - { text: Get started, link: /learn }
 *     - { text: GitHub, link: https://github.com/…, variant: secondary }
 * features:
 *   - { title: Fast, description: Why it is fast, link: /learn/speed }
 * ```
 */
function Hero(props: { frontmatter: Record<string, unknown> }) {
  const hero = props.frontmatter.hero
  if (!isRecord(hero)) return null

  const title = text(hero.title) ?? site.title
  const tagline = text(hero.tagline) ?? site.description
  const actions = list(hero.actions).filter((action): action is HeroAction => isRecord(action) && !!text(action.text) && !!text(action.link))
  const features = list(props.frontmatter.features).filter((feature): feature is Feature => isRecord(feature) && !!text(feature.title))

  return (
    <header className="hero">
      <h1 className="hero__title">{title}</h1>
      {tagline ? <p className="hero__tagline">{tagline}</p> : null}
      {actions.length > 0 ? (
        <div className="hero__actions">
          {actions.map((action, index) => (
            <a className={isSecondary(action, index) ? "hero__action hero__action--secondary" : "hero__action"} {...linkProps(action.link)}>{action.text}</a>
          ))}
        </div>
      ) : null}
      {features.length > 0 ? (
        <ul className="hero__features">
          {features.map(feature => (
            <li className="hero__feature">
              <h2>{feature.link ? <a {...linkProps(feature.link)}>{feature.title}</a> : feature.title}</h2>
              {feature.description ? <p>{feature.description}</p> : null}
            </li>
          ))}
        </ul>
      ) : null}
    </header>
  )
}

export default Hero


/** The first action is the main one unless said otherwise. */
function isSecondary(action: HeroAction, index: number) {
  return action.variant ? action.variant === "secondary" : index > 0
}

function linkProps(link: string) {
  if (/^[a-z][a-z0-9+.-]*:/i.test(link)) return { href: link, target: "_blank", rel: "noopener noreferrer" }
  if (link.startsWith("/")) return { href: href(link) }

  return { href: link }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value != null && typeof value === "object" && !Array.isArray(value)
}

function list(value: unknown): unknown[] {
  return Array.isArray(value) ? value : []
}

function text(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined
}
