// #region example
import { createInjector, inject, provideValue } from '@hypospray/core';

export function getLocation() {
  return 'Deck 11, USS Enterprise';
}

export function describeSurroundings(location = inject(getLocation)) {
  return `You are in ${location}.`;
}

const ship = createInjector();

const holodeck = ship.createChild({
  providers: [describeSurroundings, provideValue(getLocation, 'Victorian London, 1890')],
});

ship.get(describeSurroundings); // "You are in Deck 11, USS Enterprise."
holodeck.get(describeSurroundings); // "You are in Victorian London, 1890."
// #endregion
