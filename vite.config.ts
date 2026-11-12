import path from "path"
import { defineConfig } from "vite"

import generateBundleMap from "./vite.bundle-map"
import articleMdx from "./vite.mdx"
import documaruSite, { SiteOptions } from "./vite.site"


const site: SiteOptions = {
  docsDir: path.resolve(__dirname, "./docs"),
  base: normalizeBase(process.env.DOCUMARU_BASE),
}

// https://vitejs.dev/config/
export default defineConfig({
  base: site.base,
  plugins: [generateBundleMap(), ...documaruSite(site), articleMdx(site)],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "~docs": site.docsDir,
    },
  },
  server: {
    host: "0.0.0.0"
  },
  build: {
    outDir: "build",

    sourcemap: true,
    emptyOutDir: true,
    modulePreload: false,

    emitAssets: true,
    assetsInlineLimit: 0,

    // ssr: true,
    ssrEmitAssets: true,
    rollupOptions: {
      input: {
        index: "./index.html",
        essential: "./src/essential.ts",
        routes: "./src/routes.ts",
      },
      preserveEntrySignatures: "exports-only"
    },

    minify: false
  },
  esbuild: {
    keepNames: false,
    supported: {
      // https://stackoverflow.com/questions/72618944/get-error-to-build-my-project-in-vite-top-level-await-is-not-available-in-the
      "top-level-await": true
    },
  },
})

/** `repo`, `/repo` and `/repo/` all mean `/repo/`. */
function normalizeBase(input: string | undefined) {
  const trimmed = (input ?? "").trim().replace(/^\/+|\/+$/g, "")
  return trimmed.length > 0 ? `/${trimmed}/` : "/"
}
