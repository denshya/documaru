# documaru

Fast Build, Low FCP/LCP Documentation Site Generator | GitHub Action

`documaru` is a GitHub Action that builds a static documentation site from a plain folder of markdown files. No config file, no build tooling, no dependencies in your repository. Navigation and sidebar are generated from the file tree, page titles come from the first heading.

## Usage

Put your pages in a `docs` folder, add this workflow, and you are done.

```yaml
name: Deploy documentation

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: true

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: denshya/documaru@v1
        with:
          path: docs

      - uses: actions/upload-pages-artifact@v3
        with:
          path: _site

  deploy:
    needs: build
    environment: github-pages
    runs-on: ubuntu-latest
    steps:
      - uses: actions/deploy-pages@v4
```

A copy lives at `examples/docs-site.yml`.

## Inputs

Everything is optional.

| Name | Default | Description |
| ---- | ------- | ----------- |
| `path` | `docs` | Folder with the `.md`/`.mdx` pages, relative to the repository root. |
| `title` | repository name | Site title shown in the top bar and in page titles. |
| `description` | first paragraph of the home page | One sentence about the project, for search engines and link previews. |
| `logo` | a letter icon | Logo next to the title, also the favicon. A path relative to the docs folder, or a URL. |
| `accent-color` | `#3451d1` | Color of links and highlights. |
| `base-url` | `/<repository>/` | Base URL the site is served from. Set to `/` for a user or organization page (`user.github.io`). |
| `footer` | site title | Text shown in the footer. |
| `repository` | current repository | Repository behind the GitHub and "Edit this page" links. An empty string hides them. |

```yaml
- uses: denshya/documaru@v1
  with:
    title: My Project
    accent-color: "#0f766e"
    base-url: /my-project/
```

## Outputs

| Name | Description |
| ---- | ----------- |
| `path` | Built site folder, relative to the repository root. Always `_site`. |

## Docs structure

- `index.md` is the home page. It is required.
- `404.md` is the not-found page. It is required, the app throws without it.
- Any other `.md`/`.mdx` file becomes a page at its folder path. `docs/learn/deep.md` serves at `/learn/deep`.
- `index.md` or a file named after its folder (`learn/learn.md`) is the page of that folder.
- Files and folders starting with `_` are skipped.
- Images and other files are published as they are, relative links and images just work.

### Sidebar

The sidebar is the file tree. Top-level folders are sections, deeper folders collapse.

- Labels are page titles: the `title` from frontmatter, otherwise the first `#` heading. `sidebar_label` overrides it for the sidebar only.
- Order is `order` (or `sidebar_position`) from frontmatter, or a number prefix in the name: `01-install.md`, `02-usage/`. The prefix is not part of the address. Everything else follows alphabetically.
- A folder is labelled by its name. `_category_.json` with `{ "label": "…", "position": 2 }` changes that.
- `hidden: true` keeps a page out of the sidebar, `search: false` keeps it out of search.

### Frontmatter

```md
---
title: Installation
description: Shown in search engines and link previews.
order: 1
---
```

### Landing page

A page with `hero` in its frontmatter is rendered without sidebar. The markdown below the frontmatter follows the hero.

```md
---
hero:
  title: My Project
  tagline: One sentence that sells it.
  actions:
    - text: Get started
      link: /learn
    - text: GitHub
      link: https://github.com/me/my-project
features:
  - title: Fast
    description: Why it is fast.
    link: /learn/speed
---
```

### Writing

- GitHub-flavored markdown: tables, task lists, footnotes, strikethrough.
- Admonitions: `> [!NOTE]`, `[!TIP]`, `[!IMPORTANT]`, `[!WARNING]`, `[!CAUTION]`. A custom title goes after a colon: `> [!TIP: Did you know]`.
- Code blocks are highlighted and get a copy button. `title="src/app.ts"` adds a title bar, `showLineNumbers` adds line numbers.
- `// [!code highlight]`, `// [!code ++]` and `// [!code --]` mark lines.

## What you get

- Light and dark themes, following the system with a switch to override.
- Search over pages and sections: <kbd>Ctrl</kbd> + <kbd>K</kbd> or <kbd>/</kbd>.
- "On this page" outline, breadcrumbs, previous and next links.
- "Edit this page" links and last-updated dates.
- Prerendered pages with titles and descriptions for search engines and link previews.

Last-updated dates come from git history. `actions/checkout` fetches a single commit by default, so they only show up with the full history:

```yaml
- uses: actions/checkout@v4
  with:
    fetch-depth: 0
```

## GitHub Pages setup

Enable Pages at Settings → Pages → Source: **GitHub Actions**. Nothing else.

The base URL is detected from the repository name, so both page kinds work out of the box:

- Project pages (`user.github.io/repo`): the base URL defaults to `/repo/`.
- User and organization pages (`user.github.io`): pass `base-url: /`.

## Local development

```bash
bun install --frozen-lockfile
bun run build
bun run build:ssg
```

The static site lands in `build/`. Serve it with `bun run preview`, or work on it live with `bun run dev`.

Pages are read from `docs/`. Action inputs are environment variables here: `DOCUMARU_TITLE`, `DOCUMARU_DESCRIPTION`, `DOCUMARU_LOGO`, `DOCUMARU_ACCENT`, `DOCUMARU_BASE`, `DOCUMARU_FOOTER`, `DOCUMARU_REPO`.

## Known limitations

- Raw HTML inside `.md` files is dropped, use `.mdx` for it.
