interface Piece {
  node: Text;
  start: number;
}

/**
 * Finds the first occurrence of `text` across `lines` (one element per rendered code line, which
 * may split the text over many token spans) and returns a Range covering it. Lines are joined
 * with newlines, so a match can span lines.
 */
export function findText(lines: Element[], text: string): Range | undefined {
  const pieces: Piece[] = [];
  let joined = '';
  lines.forEach((line, i) => {
    if (i > 0) joined += '\n';
    if (line.textContent === '\n') return; // a blank line renders as a lone newline
    const walker = document.createTreeWalker(line, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      if (!(node instanceof Text)) continue;
      pieces.push({ node, start: joined.length });
      joined += node.data;
    }
  });

  const from = joined.indexOf(text);
  if (from === -1 || text === '') return undefined;
  const to = from + text.length;

  const first = pieces.find((p) => p.start <= from && from < p.start + p.node.length);
  const last = pieces.findLast((p) => p.start < to && to <= p.start + p.node.length);
  if (!first || !last) return undefined;

  const range = document.createRange();
  range.setStart(first.node, from - first.start);
  range.setEnd(last.node, to - last.start);
  return range;
}

/** One rect per line of text in the range, ignoring the boxes of elements it fully contains. */
function lineRects(range: Range): DOMRect[] {
  const byLine = new Map<number, DOMRect>();
  // When the range sits inside one text node, that node is the common ancestor; walk from its
  // parent, since a walker never visits its own root.
  const common = range.commonAncestorContainer;
  const root = common instanceof Text && common.parentNode ? common.parentNode : common;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    if (!range.intersectsNode(node)) continue;
    const part = document.createRange();
    part.selectNodeContents(node);
    if (node === range.startContainer) part.setStart(node, range.startOffset);
    if (node === range.endContainer) part.setEnd(node, range.endOffset);
    for (const rect of part.getClientRects()) {
      if (rect.width === 0) continue;
      const top = Math.round(rect.top);
      const seen = byLine.get(top);
      byLine.set(
        top,
        seen
          ? new DOMRect(
              Math.min(seen.left, rect.left),
              seen.top,
              Math.max(seen.right, rect.right) - Math.min(seen.left, rect.left),
              Math.max(seen.height, rect.height),
            )
          : rect,
      );
    }
  }
  return [...byLine.values()];
}

const PEAK = '0.55';

/**
 * Highlights the range with overlays in `host` (a positioned ancestor of the code that scrolls
 * with it) and scrolls the first one into view. Normally they hold briefly, fade out and are
 * removed. With reduced motion they don't animate at all: they stay until the next click or key
 * press. The overlay colour is `--hue`, inherited from the host.
 */
export function flashRange(range: Range, host: HTMLElement): void {
  for (const old of host.querySelectorAll('[data-code-flash]')) old.remove();
  if (getComputedStyle(host).position === 'static') host.style.position = 'relative';

  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const origin = host.getBoundingClientRect();
  const overlays = lineRects(range).map((rect) => {
    const el = document.createElement('span');
    el.dataset.codeFlash = '';
    el.setAttribute('aria-hidden', 'true');
    Object.assign(el.style, {
      position: 'absolute',
      left: `${rect.left - origin.left + host.scrollLeft - host.clientLeft - 3}px`,
      top: `${rect.top - origin.top + host.scrollTop - host.clientTop - 1}px`,
      width: `${rect.width + 6}px`,
      height: `${rect.height + 2}px`,
      borderRadius: '3px',
      background: 'var(--hue)',
      mixBlendMode: 'screen',
      pointerEvents: 'none',
      opacity: reduce ? PEAK : '0',
      scrollMargin: '120px 24px 24px',
    });
    host.append(el);
    return el;
  });

  overlays[0]?.scrollIntoView({
    block: 'nearest',
    inline: 'nearest',
    behavior: reduce ? 'auto' : 'smooth',
  });

  if (reduce) {
    const clear = () => {
      for (const el of overlays) el.remove();
      document.removeEventListener('pointerdown', clear);
      document.removeEventListener('keydown', clear);
    };
    document.addEventListener('pointerdown', clear);
    document.addEventListener('keydown', clear);
    return;
  }

  for (const el of overlays) {
    const animation = el.animate(
      [{ opacity: PEAK }, { opacity: PEAK, offset: 0.25 }, { opacity: 0 }],
      {
        duration: 1600,
        easing: 'ease-out',
      },
    );
    animation.addEventListener('finish', () => el.remove());
  }
}
