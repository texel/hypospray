import { codeToTokens } from 'shiki';

import { CH } from './text';

/**
 * Code drawn as a page: highlighted at build time, laid out in rows, with the file's name in a bar
 * along the bottom. Shared by the diagrams that show files as their code.
 */
export const BAR = 16;
export const EAR = 10;
export const LINE = 18;
// Padding round code: more at the top and right, clear of the fold.
export const CODE_PAD = { top: 13, right: 14 + EAR, bottom: 8, left: 14 };

/** A file drawn as its code. */
export interface Code {
  file: string;
  code: string;
}
export type Page = Awaited<ReturnType<typeof highlight>>;

/** A file's code, highlighted by its extension, one row of coloured runs per line. */
export const highlight = async ({ file, code }: Code) => {
  const lang = file.startsWith('.env') ? 'dotenv' : file.endsWith('.tsx') ? 'tsx' : 'ts';
  const { tokens } = await codeToTokens(code, { lang, theme: 'github-light' });
  const lines = code.split('\n');
  const w = Math.max(...lines.map((line) => line.length * CH)) + CODE_PAD.left + CODE_PAD.right;
  const h = lines.length * LINE + CODE_PAD.top + CODE_PAD.bottom + BAR;
  return { file, lines, tokens, w, h };
};

/** The centre line of a row of code, on a page whose top is at `top`. */
/** Nudge from a row's centre to where its text looks centred; text sits on a fixed baseline. */
export const INK = 0;
export const rowY = (top: number, row: number) => top + CODE_PAD.top + LINE / 2 + row * LINE;
