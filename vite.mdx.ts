import mdx from "@mdx-js/rollup"
import rehypeHighlight, { RehypeShikiOptions } from "@shikijs/rehype"
import { transformerNotationDiff, transformerNotationHighlight, transformerRenderIndentGuides } from "@shikijs/transformers"
import { ShikiTransformer } from "@shikijs/types"
import { Element, ElementContent, Root } from "hast"
import * as path from "path"
import rehypeAutolinkHeadings from "rehype-autolink-headings"
import rehypeSlug from "rehype-slug"
import remarkGfm from "remark-gfm"
import githubAdmonitions from "remark-github-beta-blockquote-admonitions"
import { visit } from "unist-util-visit"
import { Plugin } from "vite"

import { createRouteTable, SiteOptions } from "./vite.site"

const ADMONITIONS = ["note", "tip", "important", "warning", "caution"]
const CODE_ICONS = new Set(["ts", "tsx", "css", "json"])

function articleMdx(options: SiteOptions): Plugin {
  const icons = options.base + "static/icons.svg"

  return mdx({
    jsxImportSource: "@denshya/tama/jsx/virtual",
    remarkPlugins: [
      remarkGfm,
      [githubAdmonitions, {
        classNameMaps: {
          block: (title: string) => ["admonition", `admonition--${admonitionType(title)}`],
          title: "admonition-title",
        },
        titleFilter: (title: string) => /^\[!\w+[^\]]*\]$/.test(title) && ADMONITIONS.includes(admonitionType(title.slice(2, -1))),
        titleTextMap: (title: string) => {
          // `[!NOTE]` or `[!NOTE: Custom title]`.
          const [type, ...custom] = title.slice(2, -1).split(":")
          const displayTitle = custom.join(":").trim() || type.charAt(0).toUpperCase() + type.slice(1).toLowerCase()

          return { displayTitle, checkedTitle: type }
        },
      }],
    ],
    rehypePlugins: [
      rehypeSlug,
      [rehypeAutolinkHeadings, {
        behavior: "append",
        test: (element: Element) => element.tagName !== "h1",
        properties: { className: ["heading-anchor"], ariaLabel: "Link to this section" },
        content: { type: "text", value: "#" },
      }],
      [rehypeHighlight, shikiConfig(icons)],
      [rehypeLinks, options],
      rehypeTables,
    ],
  }) as Plugin
}

export default articleMdx


function admonitionType(title: string) {
  return title.split(":")[0].trim().toLowerCase()
}

function shikiConfig(icons: string) {
  return {
    themes: { light: "github-light", dark: "github-dark" },
    defaultColor: false,
    defaultLanguage: "text",
    fallbackLanguage: "text",
    mergeSameStyleTokens: true,
    transformers: [
      transformerNotationDiff(),
      transformerNotationHighlight(),
      transformerRenderIndentGuides(),
      transformerCodeFrame(icons),
    ],
  } satisfies RehypeShikiOptions
}

/** Wraps a code block with its chrome: optional title bar, language label and copy button. */
function transformerCodeFrame(icons: string): ShikiTransformer {
  return {
    name: "code-frame",
    pre(hast) {
      const meta = parseMeta(this.options.meta?.__raw ?? "")
      const lang = this.options.lang
      const title = meta.get("title")

      const classes = ["code-block"]
      if (title != null) classes.push("code-block--titled")
      if (meta.has("showLineNumbers")) classes.push("code-block--numbered")
      this.addClassToHast(hast, classes)

      if (title != null) {
        hast.children.unshift(element("div", { className: ["code-block__header"] }, [
          svgIcon(icons, CODE_ICONS.has(lang) ? lang : "file"),
          element("span", {}, [{ type: "text", value: title }]),
        ]))
      } else if (lang && lang !== "text") {
        hast.children.push(element("span", { className: ["code-block__lang"], ariaHidden: "true" }, [{ type: "text", value: lang }]))
      }

      hast.children.push(element("button", { className: ["code-block__copy"], type: "button", ariaLabel: "Copy code", title: "Copy code" }, [
        svgIcon(icons, "copy"),
        svgIcon(icons, "check"),
      ]))

      return hast
    },
  }
}

function parseMeta(raw: string) {
  const meta = new Map<string, string>()
  for (const match of raw.matchAll(/([\w-]+)(?:=(?:"([^"]*)"|'([^']*)'|(\S+)))?/g)) {
    meta.set(match[1], match[2] ?? match[3] ?? match[4] ?? "")
  }
  return meta
}

function element(tagName: string, properties: Element["properties"], children: ElementContent[] = []): Element {
  return { type: "element", tagName, properties, children }
}

function svgIcon(icons: string, name: string): Element {
  return element("svg", { className: ["icon", `icon--${name}`], ariaHidden: "true" }, [
    element("use", { href: `${icons}#${name}` }),
  ])
}


/**
 * Makes links and images work from any page:
 * - links to `.md`/`.mdx` files become links to their pages
 * - relative links and images are resolved against the file they are written in
 * - root links get the site base path
 * - external links open in a new tab
 */
function rehypeLinks(options: SiteOptions) {
  const routes = createRouteTable(options)

  return (tree: Root, file: { path?: string }) => {
    const directory = file.path ? path.posix.dirname(toPosix(path.relative(options.docsDir, file.path))) : "."

    const resolve = (target: string) => {
      const [pathname, suffix] = splitSuffix(target)
      if (pathname.length === 0) return target

      const resolved = pathname.startsWith("/")
        ? path.posix.normalize(pathname).slice(1)
        : path.posix.normalize(path.posix.join(directory, pathname))
      if (resolved.startsWith("..")) return target

      const route = routes.get(resolved) ?? routes.get(resolved.replace(/\/$/, "") + ".md")
      const withoutBase = route ?? "/" + resolved.replace(/\.(md|mdx)$/, "")

      return options.base + withoutBase.slice(1) + suffix
    }

    visit(tree, "element", node => {
      if (node.tagName === "a" && typeof node.properties.href === "string") {
        const href = node.properties.href
        if (href.startsWith("#")) return

        if (isExternal(href)) {
          if (/^https?:/.test(href)) {
            node.properties.target = "_blank"
            node.properties.rel = ["noopener", "noreferrer"]
          }
          return
        }

        node.properties.href = resolve(href)
      }

      if (node.tagName === "img" && typeof node.properties.src === "string") {
        const src = node.properties.src
        if (!isExternal(src)) node.properties.src = resolve(src)
        node.properties.loading ??= "lazy"
      }
    })
  }
}

function isExternal(url: string) {
  return /^([a-z][a-z0-9+.-]*:|\/\/)/i.test(url)
}

function splitSuffix(url: string): [string, string] {
  const index = url.search(/[?#]/)
  return index === -1 ? [url, ""] : [url.slice(0, index), url.slice(index)]
}

function toPosix(file: string) {
  return file.split(path.sep).join("/")
}

/** Wide tables scroll on their own instead of stretching the page. */
function rehypeTables() {
  return (tree: Root) => {
    visit(tree, "element", (node, index, parent) => {
      if (node.tagName !== "table" || parent == null || index == null) return
      if (parent.type === "element" && parent.properties.className?.toString().includes("table-scroll")) return

      parent.children[index] = element("div", { className: ["table-scroll"] }, [node])
    })
  }
}
