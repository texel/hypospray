import { ts } from '../../lib/template-helpers';

/**
 * Everything the Why scratch page draws, kept out of its prose (`pages/scratch/why.mdx`). Each
 * export is a ready set of props for `TreeDiagram` or `CaseDiagram`: spread it in.
 */
const leaves = ['UserMenu', 'OrdersTable', 'RevenueChart'];
const services = ['AuthClient', 'OrdersApi', 'AnalyticsApi', 'HttpClient', 'Logger', 'Config'];
const usesEdges = ['UserMenu>AuthClient', 'OrdersTable>OrdersApi', 'RevenueChart>AnalyticsApi'];
const needsEdges = [
  'AuthClient>HttpClient',
  'OrdersApi>HttpClient',
  'AnalyticsApi>HttpClient',
  'AnalyticsApi>Logger',
  'HttpClient>Config',
  'Logger>Config',
];
const renders = [
  'Root>App',
  'App>Header',
  'App>Dashboard',
  'Header>UserMenu',
  'Dashboard>OrdersTable',
  'Dashboard>RevenueChart',
];
// The composition root's code, as drawn in its node; the graph beside it is what fixes the order.
const mainCode = [
  'const config = loadConfig();',
  'const http = createHttpClient(config);',
  'const logger = createLogger(config);',
  'const auth = createAuthClient(http);',
  'const orders = createOrdersApi(http);',
  'const analytics = createAnalyticsApi(http, logger);',
  '',
  'const props = { auth, orders, analytics };',
  'render(<App {...props} />);',
].join('\n');
const all = <T extends string>(keys: string[], value: T) =>
  Object.fromEntries(keys.map((key) => [key, value])) as Record<string, T>;
const notYet = (ids: string[]) => all(ids, 'ghost');

/** Beat 1, one per step, top-down (kept to compare with `wiring`). */
export const wiringTopDown = [
  {},
  {
    marks: {
      OrdersTable: 'purple',
      OrdersApi: 'purple-soft',
      HttpClient: 'purple-soft',
      Config: 'purple-soft',
    },
    edges: all(['OrdersTable>OrdersApi', 'OrdersApi>HttpClient', 'HttpClient>Config'], 'purple'),
  },
].map((step) =>
  Object.assign(
    {
      services: 'instance',
      uses: 'import { $dep }',
      needs: 'import { $dep }',
      focus: 'services',
    },
    step,
  ),
);

/** Beat 1, one per step: first the graph, then the imports that wire it. */
export const wiring = [
  {},
  {
    marks: {
      OrdersTable: 'purple',
      OrdersApi: 'purple-soft',
      HttpClient: 'purple-soft',
      Config: 'purple-soft',
    },
    edges: all(['OrdersTable>OrdersApi', 'OrdersApi>HttpClient', 'HttpClient>Config'], 'purple'),
  },
].map((step) =>
  Object.assign(
    {
      layout: 'outline',
      services: 'instance',
      uses: 'import { $dep }',
      needs: 'import { $dep }',
      focus: 'services',
    },
    step,
  ),
);

/** Beat 3: every node takes what its children need; it piles up at the root. */
export const cascade = {
  labels: {
    App: '<App {auth}{orders}{analytics}>',
    Header: '<Header {auth}>',
    Dashboard: '<Dashboard {orders}{analytics}>',
    UserMenu: '<UserMenu {auth}>',
    OrdersTable: '<OrdersTable {orders}>',
    RevenueChart: '<RevenueChart {analytics}>',
  },
  layout: 'beside',
  uses: 'prop',
  root: { text: mainCode, mark: 'orange-soft', title: 'main.tsx' },
  marks: Object.assign(
    all(['App', 'Header', 'Dashboard', ...leaves], 'orange-soft'),
    all(services, 'orange-soft'),
  ),
  edges: all([...renders, ...usesEdges, ...needsEdges], 'orange'),
  strands: {
    'Root>App': ['auth', 'orders', 'analytics'],
    'App>Header': ['auth'],
    'App>Dashboard': ['orders', 'analytics'],
    'Header>UserMenu': ['auth'],
    'Dashboard>OrdersTable': ['orders'],
    'Dashboard>RevenueChart': ['analytics'],
  },
};

/** Beat 3, step 2: `RevenueChart` wants the logger too, and every ancestor's signature changes. */
export const cascadeLogger = Object.assign({}, cascade, {
  labels: Object.assign({}, cascade.labels, {
    App: '<App {auth}{orders}{analytics}{logger}>',
    Dashboard: '<Dashboard {orders}{analytics}{logger}>',
    RevenueChart: '<RevenueChart {analytics}{logger}>',
  }),
  root: {
    text: mainCode.replace('analytics };', 'analytics, logger };'),
    mark: 'orange-soft',
    title: 'main.tsx',
  },
  strands: Object.assign({}, cascade.strands, {
    'Root>App': ['auth', 'orders', 'analytics', 'logger'],
    'App>Dashboard': ['orders', 'analytics', 'logger'],
    'Dashboard>RevenueChart': ['analytics', 'logger'],
  }),
  highlight: 'logger',
});
export const cascadeSteps = [cascade, cascadeLogger];

/**
 * Beat 3, first: the root builds every service, each after everything it needs, then renders the
 * app with them. Each line that builds one is numbered, and so is what it builds.
 */
const buildOrder = ['Config', 'HttpClient', 'Logger', 'AuthClient', 'OrdersApi', 'AnalyticsApi'];
const components = ['App', 'Header', 'Dashboard', ...leaves];
export const building = {
  layout: 'build',
  root: {
    text: [
      ...mainCode.split('\n').slice(0, buildOrder.length),
      '',
      'render(<App {auth}{orders}{analytics} />);',
    ].join('\n'),
    mark: 'orange-soft',
    title: 'main.tsx',
  },
  marks: Object.assign(all(components, 'hidden'), all(services, 'orange-soft')),
  edges: all(needsEdges, 'orange'),
  order: buildOrder,
};

/** Beat 3, then: the root hands them all down the tree, to whoever uses them. */
const drillRoot = (props: string) => ({
  text: `render(<App ${props} />);`,
  mark: 'orange-soft' as const,
  title: 'main.tsx',
});
export const drilling = [
  { root: drillRoot('{auth}{orders}{analytics}') },
  Object.assign({}, cascadeLogger, {
    root: drillRoot('{auth}{orders}{analytics}{logger}'),
  }),
].map((step) =>
  Object.assign({}, cascade, step, {
    marks: Object.assign(all(components, 'orange-soft'), all(services, 'hidden')),
    edges: all(['Root>App', ...renders], 'orange'),
    drill: true,
  }),
);

/** Beat 4: context, working, then with a provider forgotten. */
export const context = {
  layout: 'beside',
  marks: Object.assign({ App: 'orange-soft' }, all(services, 'hidden')),
  labels: { App: '<App> provides { auth, orders, analytics }' },
  teleport: { from: leaves, label: 'useContext().$dep' },
};
export const contextBroken = Object.assign({}, context, {
  marks: Object.assign({}, context.marks, { RevenueChart: 'red' }),
  labels: { App: '<App> provides { auth, orders, ~analytics~ }' },
  teleport: { from: leaves, label: 'useContext().$dep', broken: ['RevenueChart'] },
  notes: { RevenueChart: ['TypeError: analytics is undefined', 'below', 'red'] },
});

/**
 * Beat 5, one per step: `main.tsx` creates the injector and renders `<App>` inside it. The
 * injector builds a service only when something first asks for it, deepest dependency first, then
 * shares it; what it hasn't built isn't there yet.
 */
const hide = (ids: string[]) => all(ids, 'hidden');
export const lazy = [
  {
    marks: Object.assign(notYet(['App', 'Header', 'Dashboard', ...leaves]), hide(services)),
    edges: [],
    notes: {},
  },
  {
    marks: Object.assign(
      notYet(['Dashboard', 'OrdersTable', 'RevenueChart']),
      hide(['OrdersApi', 'AnalyticsApi', 'Logger']),
      { UserMenu: 'blue' },
      all(['AuthClient', 'HttpClient', 'Config'], 'blue-soft'),
    ),
    edges: ['UserMenu>AuthClient', 'AuthClient>HttpClient', 'HttpClient>Config'],
    notes: {},
  },
  {
    marks: Object.assign(notYet(['RevenueChart']), hide(['AnalyticsApi', 'Logger']), {
      OrdersTable: 'blue',
      OrdersApi: 'blue-soft',
    }),
    edges: ['OrdersTable>OrdersApi', 'OrdersApi>HttpClient'],
    notes: { HttpClient: ['shared', 'below'] },
  },
  {
    marks: Object.assign({ RevenueChart: 'blue' }, all(['AnalyticsApi', 'Logger'], 'blue-soft')),
    edges: [
      'RevenueChart>AnalyticsApi',
      'AnalyticsApi>HttpClient',
      'AnalyticsApi>Logger',
      'Logger>Config',
    ],
    notes: { HttpClient: ['shared', 'below'], Config: ['shared', 'below'] },
  },
].map((step) => ({
  layout: 'injector',
  uses: 'inject({$dep}$fn)',
  root: {
    text: 'const injector = createInjector();\ninjector.run(() => render(<App />));',
    mark: 'blue',
    title: 'main.tsx',
  },
  marks: step.marks,
  edges: all(step.edges, 'blue'),
  notes: step.notes,
}));

/** Beat 6, variant B: case ② on the full graph, everything it doesn't touch ghosted. */
export const variantB = {
  services: 'factory',
  uses: 'inject({$dep}$fn)',
  needs: 'inject({$dep}$fn)',
  root: { text: 'server.ts: createInjector({ providers })', mark: 'blue' },
  marks: Object.assign(
    all(['App', 'Header', 'Dashboard', ...leaves, 'Logger', 'Config'], 'ghost'),
    { HttpClient: 'blue' },
    all(['AuthClient', 'OrdersApi', 'AnalyticsApi'], 'blue-soft'),
  ),
  edges: all(['AuthClient>HttpClient', 'OrdersApi>HttpClient', 'AnalyticsApi>HttpClient'], 'blue'),
  notes: { HttpClient: ['undici + retries', 'left'] },
};

// Beats 2 and 6: the same three cases, zoomed in. Beat 2 works around imports; beat 6 provides.
export const importCases = {
  config: {
    tone: 'purple',
    consumers: [
      { text: 'const http', file: 'http.ts' },
      { text: 'const logger', file: 'logger.ts' },
    ],
    replacement: { text: 'const config', file: 'config.ts' },
    control: {
      file: '.env.production',
      code: 'VITE_API_URL=https://eu.api.example.com\nVITE_RETRIES=3',
    },
    note: 'Env variables are strings... even if they look like numbers',
  },
  swap: {
    tone: 'purple',
    consumers: [
      { text: 'const auth', file: 'auth.ts' },
      { text: 'const orders', file: 'orders.ts' },
      { text: 'const analytics', file: 'analytics.ts' },
    ],
    original: { text: 'const http', file: 'http.ts' },
    replacement: { text: 'const http', file: 'http.server.ts' },
    control: {
      file: 'vite.config.ts',
      code: "// a separate server build\nresolve: {\n  alias: { './http': './http.server' },\n},",
    },
    note: 'Keeping your build config up to date is easy, right?',
  },
  test: {
    tone: 'purple',
    consumers: [{ text: '<OrdersTable>', component: true }],
    original: { text: 'const orders', file: 'orders.ts' },
    replacement: { text: '{orders} fakeOrders' },
    control: {
      file: 'OrdersTable.test.tsx',
      code: ts`
const fakeOrders = vi.hoisted(() => ({
  list: async () => [{ id: 1, customer: 'Ada', total: 42 }],
}));

vi.mock('./orders', () => ({ orders: fakeOrders }));
`,
    },
    note: 'Look at this code. What are you doing with your life?',
  },
};
export const injectCases = {
  config: {
    tone: 'blue',
    consumer: {
      file: 'http.ts',
      row: 1,
      code: ts`
export function getHttpClient(
  config = inject(getConfig)
) {
  console.log(config.apiUrl);
  // Logs 'https://acme.dev'
  // ...
}
`,
    },
    contract: {
      file: 'config.ts',
      key: '{config} getConfig',
      returns: 8,
      fallback: "{ apiUrl: '/api', retries: 0 }",
      code: ts`
export interface Config {
  apiUrl: string;
  retries: number;
}

export function getConfig(): Config {
  // Return a default value, useful
  // for dev or testing.
  return { apiUrl: '/api', retries: 0 };
}
`,
    },
    value: "{ apiUrl: 'https://acme.dev', retries: 3 }",
    control: {
      file: 'main.ts',
      code: ts`
const env = import.meta.env;

createInjector({ providers: [
  provideValue(getConfig, {
    apiUrl: env.VITE_API_URL,
    retries: Number(env.VITE_RETRIES),
  }),
] });
`,
    },
    note: 'Provide values at runtime with full type safety',
  },
  swap: {
    tone: 'blue',
    consumer: {
      file: 'orders.ts',
      row: 1,
      code: ts`
export function getOrdersApi(
  http = inject(getHttpClient)
) {
  // ...
}
`,
    },
    contract: {
      file: 'http.ts',
      key: '{http} getHttpClient',
      returns: 3,
      code: ts`
export function getHttpClient(
  config = inject(getConfig),
): HttpClient {
  return createFetchClient(config.apiUrl);
}
`,
    },
    value: 'withRetries(undiciClient)',
    control: {
      file: 'server.ts',
      code: 'createInjector({ providers: [\n  provideFactory(getHttpClient, createUndiciClient),\n  extendProvider(getHttpClient, withRetries),\n] });',
    },
    note: 'Provide server config without all the build headaches',
  },
  test: {
    tone: 'blue',
    consumer: {
      file: 'OrdersTable.tsx',
      row: 1,
      code: ts`
export function OrdersTable() {
  const orders = inject(getOrdersApi);
  // ...
}
`,
    },
    contract: {
      file: 'orders.ts',
      key: '{orders} getOrdersApi',
      returns: 3,
      code: ts`
export function getOrdersApi(
  http = inject(getHttpClient),
): OrdersApi {
  return { list: () => http.get('/orders') };
}
`,
    },
    value: 'fakeOrders',
    control: {
      file: 'OrdersTable.test.tsx',
      code: ts`
const fakeOrders: OrdersApi = {
  list: async () => [{ id: 1, customer: 'Ada', total: 42 }],
};

const injector = createInjector({ providers: [
  provideValue(getOrdersApi, fakeOrders),
] });

injector.run(() => render(<OrdersTable />));
`,
    },
    note: 'No import mocking, no hoisting, just easy-to-understand setup code',
  },
};

/**
 * Beat 6's config case in steps: what you'd get from `getConfig` itself, then what `main.ts`
 * provides over it, then `http.ts` asking for it.
 */
export const configSteps = [
  { ...injectCases.config, provided: false, asked: false },
  { ...injectCases.config, provided: true, asked: false },
  { ...injectCases.config, provided: true, asked: true },
];
