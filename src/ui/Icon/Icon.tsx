import { site } from "virtual:documaru"

export type IconName =
  | "arrow-left"
  | "arrow-right"
  | "check"
  | "chevron-right"
  | "copy"
  | "cross"
  | "file"
  | "github"
  | "loupe"
  | "menu"
  | "moon"
  | "pencil"
  | "sun"
  | (string & {})

/** An icon from the `public/static/icons.svg` sprite. */
function Icon(props: { name: IconName }) {
  return (
    <svg class={`icon icon--${props.name}`} aria-hidden="true">
      <use href={`${site.base}static/icons.svg#${props.name}`} />
    </svg>
  )
}

export default Icon
