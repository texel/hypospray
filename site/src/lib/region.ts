const MARKER = /^\s*\/\/\s*#(end)?region\b\s*(\S*)\s*$/;

function isMarker(line: string): boolean {
  return MARKER.test(line);
}

function dedent(lines: string[]): string[] {
  const indents = lines
    .filter((line) => line.trim() !== '')
    .map((line) => line.length - line.trimStart().length);
  const min = indents.length > 0 ? Math.min(...indents) : 0;
  return lines.map((line) => line.slice(min));
}

function trimBlankEdges(lines: string[]): string[] {
  let start = 0;
  let end = lines.length;
  while (start < end && lines[start].trim() === '') start++;
  while (end > start && lines[end - 1].trim() === '') end--;
  return lines.slice(start, end);
}

/**
 * Returns the lines between `// #region name` and its matching `// #endregion`,
 * dedented, with every region marker removed. Without a name, returns the whole
 * source with markers removed. Throws if the region is missing or unclosed.
 */
export function extractRegion(source: string, name?: string): string {
  const lines = source.split('\n');

  if (name === undefined) {
    return trimBlankEdges(lines.filter((line) => !isMarker(line))).join('\n');
  }

  const start = lines.findIndex((line) => {
    const match = MARKER.exec(line);
    return match !== null && match[1] === undefined && match[2] === name;
  });
  if (start === -1) throw new Error(`Region "${name}" not found`);

  const body: string[] = [];
  let depth = 1;
  for (const line of lines.slice(start + 1)) {
    const match = MARKER.exec(line);
    if (match) {
      depth += match[1] === undefined ? 1 : -1;
      if (depth === 0) return dedent(trimBlankEdges(body)).join('\n');
      continue;
    }
    body.push(line);
  }
  throw new Error(`Region "${name}" is not closed`);
}
