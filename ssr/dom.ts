import { Window } from "happy-dom"


/** Normalizes the site base URL to a leading and trailing slash form. */
export function normalizeBaseURL(value: string | undefined): string {
  let base = value?.trim() || "/"
  if (!base.startsWith("/")) base = "/" + base
  if (!base.endsWith("/")) base += "/"
  return base
}

/** Base URL the generated site is served from. */
export const baseURL = normalizeBaseURL(process.env.DOCUMARU_BASE_URL)

export function injectDOMPolyfill(context: typeof globalThis) {
  const window = new Window({
    width: 1300,
    height: 1080,

    // Placeholder origin plus base path, so prerendered hrefs carry the base.
    url: `http://documaru.local${baseURL}`,
    settings: {
      disableComputedStyleRendering: true,
      disableCSSFileLoading: true,
      disableJavaScriptEvaluation: true,
      disableJavaScriptFileLoading: true,
      handleDisabledFileLoadingAsSuccess: true,
    }
  })

  // Keep `document.baseURI` stable while the renderer walks route locations.
  window.document.head.insertAdjacentHTML("afterbegin", `<base href="${baseURL}">`)

  // Resolve CSS files to "load".
  const originalAddEventListener = window.HTMLLinkElement.prototype.addEventListener
  window.HTMLLinkElement.prototype.addEventListener = function (type, listener, options) {
    if (type === "load") return listener.call(this)
    return originalAddEventListener.call(this, type, listener, options)
  }

  for (const key of Object.getOwnPropertyNames(window)) {
    if (key in context) continue

    try {
      context[key] = window[key]
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error) {
      // skip
    }
  }

  context.requestIdleCallback = () => { return 2 }
  context.requestAnimationFrame = (callback: (a: number) => void) => { callback(1); return 2 }
}
