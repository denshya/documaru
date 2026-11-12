import "./Search.scss"

import { State, StateArray } from "@denshya/reactive"

import { navigateTo } from "@/app/navigation/navigation"
import { href } from "@/app/router/file-router"
import { searchOpen } from "@/app/state"
import Icon from "@/ui/Icon/Icon"

import { loadSearchIndex, search, SearchResult } from "./search-index"

const INPUT_ID = "search-input"
/** `role` is missing from the JSX element types. */
const DIALOG: object = { role: "dialog" }

function Search() {
  const query = new State("")
  const results = new State<SearchResult[]>([])
  const selected = new State(0)

  searchOpen.subscribe(open => {
    if (!open) return

    query.set("")
    results.set([])
    selected.set(0)

    void loadSearchIndex()
    requestAnimationFrame(() => document.getElementById(INPUT_ID)?.focus())
  })

  async function onInput(event: Event) {
    const value = (event.currentTarget as HTMLInputElement).value
    query.set(value)

    const found = await search(value)
    // Typing went on while searching: a newer search is on its way.
    if (query.current !== value) return

    results.set(found)
    selected.set(0)
  }

  function onKeyDown(event: KeyboardEvent) {
    const count = results.current.length

    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault()
      if (count === 0) return

      const step = event.key === "ArrowDown" ? 1 : -1
      selected.set((selected.current + step + count) % count)
      document.querySelector(".search__result--selected")?.scrollIntoView({ block: "nearest" })
    }
    if (event.key === "Enter") {
      event.preventDefault()
      open(results.current[selected.current])
    }
  }

  function open(result: SearchResult | undefined) {
    if (result == null) return

    searchOpen.set(false)
    navigateTo(href(result.record.route), result.record.anchor ? "#" + result.record.anchor : "")
  }

  const hint = query.to(query => query.trim() ? `Nothing found for "${query.trim()}"` : "Type to search pages and sections")

  function onBackdropClick(event: MouseEvent) {
    if (event.target === event.currentTarget) searchOpen.set(false)
  }

  return (
    <div className="search" mounted={searchOpen} on={{ click: onBackdropClick }}>
      <div className="search__panel" {...DIALOG} aria-modal="true" aria-label="Search">
        <div className="search__field">
          <Icon name="loupe" />
          <input id={INPUT_ID} type="text" placeholder="Search the docs" aria-label="Search the docs" autocomplete="off" spellcheck={false} on={{ input: onInput, keydown: onKeyDown }} />
          <kbd>Esc</kbd>
        </div>
        <div className="search__results">
          <p className="search__hint" mounted={results.to(results => results.length === 0)}>{hint}</p>
          {new StateArray(results).map((result, index) => (
            <a
              className="search__result"
              classMods={{ selected: selected.is(index) }}
              href={href(result.record.route) + (result.record.anchor ? "#" + result.record.anchor : "")}
              on={{
                click: (event: MouseEvent) => {
                  event.preventDefault()
                  open(result)
                },
                pointermove: () => selected.set(index),
              }}
            >
              <span className="search__title">
                {result.record.heading || result.record.page}
                {result.record.heading ? <span className="search__page">{result.record.page}</span> : null}
              </span>
              {result.excerpt.length > 0 ? (
                <span className="search__excerpt">
                  {result.excerpt.map((part, index) => index % 2 === 1 ? <mark>{part}</mark> : part)}
                </span>
              ) : null}
            </a>
          ))}
        </div>
      </div>
    </div>
  )
}

export default Search
