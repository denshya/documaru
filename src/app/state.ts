import { State, StateBoolean } from "@denshya/reactive"

/** Mobile navigation drawer. */
export const menuOpen = new StateBoolean(false)
export const searchOpen = new StateBoolean(false)
/** Id of the heading the reader is currently at, for the table of contents. */
export const activeHeading = new State("")
