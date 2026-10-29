export interface NoteLink {
  /** The side to switch to, by its example folder name, e.g. `with`. Omitted for the current side. */
  side?: string;
  /** The file tab to select, e.g. `stardate.ts`. */
  file?: string;
  /** Code to flash in that file, e.g. `StarDate.now()`. */
  text?: string;
}

/**
 * Parses a notes link target:
 *
 * - `#stardate.ts` selects a file's tab on the current side;
 * - `#stardate.ts:StarDate.now()` also flashes the first match of the text after the colon;
 * - `#with/` switches to another side, and `#with/stardate.ts` (with an optional `:text`) also
 *   selects a file there.
 *
 * Returns undefined for anything else, including malformed percent-encoding.
 */
export function parseNoteLink(href: string): NoteLink | undefined {
  if (!href.startsWith('#')) return undefined;

  let target: string;
  try {
    target = decodeURIComponent(href.slice(1));
  } catch {
    return undefined;
  }

  const colon = target.indexOf(':');
  const path = colon === -1 ? target : target.slice(0, colon);
  const text = colon === -1 ? '' : target.slice(colon + 1);
  const slash = path.indexOf('/');
  const side = slash === -1 ? '' : path.slice(0, slash);
  const file = slash === -1 ? path : path.slice(slash + 1);

  if (slash !== -1 && side === '') return undefined; // `#/x`
  if (file.includes('/')) return undefined; // `#a/b/c`
  if (file === '' && (side === '' || text !== '')) return undefined; // nothing, or text without a file

  const link: NoteLink = {};
  if (side !== '') link.side = side;
  if (file !== '') link.file = file;
  if (text !== '') link.text = text;
  return link;
}
