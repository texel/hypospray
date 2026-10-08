const EXTERNAL = /^(?:[a-z][a-z\d+.-]*:|\/\/|#)/i;

/** Prefixes an internal path with the site's base path. External URLs and bare anchors pass through. */
export function withBase(path: string, base: string = import.meta.env.BASE_URL): string {
  if (EXTERNAL.test(path)) return path;
  const prefix = base.endsWith('/') ? base : `${base}/`;
  return prefix + path.replace(/^\//, '');
}
