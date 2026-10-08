// #region example
import { createInjector, inject, provideFactory } from '@hypospray/core';

export function getMenu() {
  return ['Tea, Earl Grey, hot'];
}

export function createReplicator(menu = inject(getMenu)) {
  return (order: string) => (menu.includes(order) ? `Replicating: ${order}` : 'Unable to comply.');
}

const worfsQuarters = createInjector({
  providers: [provideFactory(getMenu, () => ['Gagh', 'Prune juice'])],
});

const replicate = worfsQuarters.get(createReplicator);

replicate('Prune juice'); // "Replicating: Prune juice"
replicate('Tea, Earl Grey, hot'); // "Unable to comply."
// #endregion
