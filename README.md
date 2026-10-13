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

| Name | Required | Default | Description |
| ---- | -------- | ------- | ----------- |
| `path` | no | `docs` | Folder with the `.md`/`.mdx` pages, relative to the repository root. |
| `base-url` | no | repository name | URL prefix the site is served from, for example `/my-repo/`. Defaults to `/<repo>/` so project pages work without extra config. Set to `/` for a user or organization page (`user.github.io`). |

## Outputs

| Name | Description |
| ---- | ----------- |
| `path` | Built site folder, relative to the repository root. Always `_site`. |

## Docs structure

- `index.md` is the landing page. It is required.
- `404.md` is the not-found page. It is required, the app throws without it.
- Any other `.md`/`.mdx` file becomes a page at its folder path. `docs/learn/deep.md` serves at `/learn/deep`.
- Page title comes from the first `#` heading. Navigation labels come from the file name.

## GitHub Pages setup

Enable Pages at Settings → Pages → Source: **GitHub Actions**. Nothing else.

Both page kinds work out of the box:

- Project pages (`user.github.io/repo`): the base URL defaults to `/<repo>/`.
- User and organization pages (`user.github.io`): pass `base-url: /`.

The base URL can be overridden with the `base-url` input:

```yaml
      - uses: denshya/documaru@v1
        with:
          path: docs
          base-url: /docs/
```

## Local development

```bash
bun install --frozen-lockfile
bun run build
bun run build:ssg
```

The static site lands in `build/`. Serve it with `bun run preview`.

## Known limitations

- Site brand text is fixed.
