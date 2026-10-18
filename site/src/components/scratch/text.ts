/**
 * Text layout shared by the scratch diagrams: monospace runs with a dependency's icon in front of
 * its name, so every diagram measures and draws labels the same way.
 */
import { type Dep, depPattern, deps } from './deps';

export const H = 30;
/** Monospace advance at 12px; text runs are pinned to it with textLength so icons line up. */
export const CH = 7.2;
export const ICON = 14;
export const ICON_STEP = ICON + 4;

/**
 * Splits a label into text runs and dependency icons: one before each service name, and one in
 * place of each `{name}` (an icon with no text).
 */
const tokens = new RegExp(`\\{${depPattern.source}\\}|${depPattern.source}`, 'g');
export type Seg = ({ icon: Dep } | { text: string }) & { missing?: boolean };
const isDep = (name: string | undefined): name is Dep => name !== undefined && name in deps;
const segmentPart = (text: string, missing: boolean) => {
  const out: Seg[] = [];
  let last = 0;
  for (const match of text.matchAll(tokens)) {
    if (match.index > last) out.push({ text: text.slice(last, match.index) });
    const [, iconOnly, named] = match;
    if (isDep(iconOnly)) out.push({ icon: iconOnly });
    else if (isDep(named)) out.push({ icon: named }, { text: named });
    last = match.index + match[0].length;
  }
  if (last < text.length) out.push({ text: text.slice(last) });
  return missing ? out.map((seg) => ({ ...seg, missing })) : out;
};
/** Splits text into runs and icons. `~analytics~` marks something that should be there but isn't. */
export const segment = (text: string) =>
  text.split('~').flatMap((part, i) => segmentPart(part, i % 2 === 1));
export const contentWidth = (text: string) =>
  segment(text).reduce((sum, seg) => sum + ('icon' in seg ? ICON_STEP : seg.text.length * CH), 0);
