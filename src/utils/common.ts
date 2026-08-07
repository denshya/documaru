/**
 * https://stackoverflow.com/questions/38304401/javascript-check-if-dictionary/71975382#71975382
 */
export function isRecord(object: unknown): object is Record<keyof never, unknown> {
  return object instanceof Object && object.constructor === Object
}

export function castArray<T>(value: T | T[]): T[] {
  if (value instanceof Array === false) return [value]
  return value
}

/**
 * Converts a string to Start Case (capitalizing the first letter of each word).
 * 
 * @param input - The string to convert.
 * @returns The start-cased string.
 */
export function startCase(input: string): string {
  if (input.length === 0) return ""

  return input
    // Insert a space between lowercase/number and uppercase letters (camelCase/PascalCase)
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    // Replace non-alphanumeric characters (underscores, hyphens, symbols) with spaces
    .replace(/[^a-zA-Z0-9]+/g, " ")
    // Trim leading/trailing whitespace
    .trim()
    // Capitalize the first letter of each word
    .toLowerCase()
    .replace(/\b[a-z]/g, (char) => char.toUpperCase())
}

/**
 * Converts a string to snake_case.
 * 
 * @param input - The string to convert.
 * @returns The snake-cased string.
 */
export function snakeCase(input: string): string {
  if (input.length === 0) return ""

  return input
    // Insert space/delimiter between lowercase/number and uppercase letters
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    // Insert space between sequence of uppercase letters and a titlecase word (e.g., "HTMLElement" -> "HTML Element")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2")
    // Replace non-alphanumeric characters with spaces
    .replace(/[^a-zA-Z0-9]+/g, " ")
    // Trim leading/trailing whitespace
    .trim()
    // Convert to lowercase and replace spaces with underscores
    .toLowerCase()
    .replace(/\s+/g, "_")
}
