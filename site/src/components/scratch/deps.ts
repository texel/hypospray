/**
 * One icon per service on the Why scratch page. Wherever a service's name appears in a diagram
 * (its own node, a prop, an argument), its icon goes in front, so each dependency can be followed
 * by eye. Icons are drawn on a 16×16 grid in `currentColor`.
 */
export const deps = {
  auth: {
    name: 'auth client',
    icon: '<circle cx="5" cy="8" r="3"/><path d="M8 8h7M12.5 8v3M14.5 8v2"/>',
  },
  orders: {
    name: 'orders api',
    icon: '<path d="M2 5 8 2l6 3v6l-6 3-6-3zM2 5l6 3 6-3M8 8v6"/>',
  },
  analytics: {
    name: 'analytics api',
    icon: '<path d="M3 14V9M8 14V3M13 14V7" stroke-width="2.5"/>',
  },
  http: {
    name: 'http client',
    icon: '<circle cx="8" cy="8" r="6"/><ellipse cx="8" cy="8" rx="2.5" ry="6"/><path d="M2 8h12"/>',
  },
  logger: {
    name: 'logger',
    icon: '<rect x="3" y="1.5" width="10" height="13" rx="1"/><path d="M5.5 5.5h5M5.5 8.5h5M5.5 11.5h3"/>',
  },
  config: {
    name: 'config',
    icon: '<path d="M2 4h12M2 8h12M2 12h12"/><circle cx="5" cy="4" r="1.8" fill="currentColor"/><circle cx="11" cy="8" r="1.8" fill="currentColor"/><circle cx="7" cy="12" r="1.8" fill="currentColor"/>',
  },
} as const;

export type Dep = keyof typeof deps;
export const depPattern = new RegExp(`\\b(${Object.keys(deps).join('|')})\\b`);
