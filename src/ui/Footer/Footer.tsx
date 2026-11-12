import "./Footer.scss"

import { site } from "virtual:documaru"

function Footer() {
  return (
    <footer className="footer">
      <div className="footer__inner">
        <span>{site.footer ?? site.title}</span>
        <span>Built with <a href="https://github.com/denshya/documaru" target="_blank" rel="noopener noreferrer">documaru</a></span>
      </div>
    </footer>
  )
}

export default Footer
