import "@/assets/scss/reset.scss"
import "@/assets/scss/tokens.scss"
import "@/assets/scss/base.scss"
import "@/assets/scss/layout.scss"
import "@/assets/scss/prose.scss"
import "@/assets/scss/code.scss"

import { updateActiveHeading } from "./behavior"
import Layout from "./Layout"

function AppRoot() {
  requestIdleCallback(() => {
    const scrollTarget = window.document.getElementById(decodeURIComponent(window.location.hash.substring(1)))
    scrollTarget?.scrollIntoView()

    updateActiveHeading()
  })

  return <Layout />
}

export default AppRoot
