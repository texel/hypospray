// #region example
import { createInjector, extendProvider } from '@hypospray/core';

export class CrewMember {
  constructor(
    public name: string,
    public rank: string,
  ) {}
}

export function getCrew() {
  return [
    new CrewMember('Jean-Luc Picard', 'Captain'),
    new CrewMember('William Riker', 'Commander'),
  ];
}

const cube = createInjector({
  providers: [
    extendProvider(getCrew, (crew) => {
      const [captain] = crew;

      // Add his uniqueness to our own...
      const locutus = new CrewMember(`Locutus, formerly ${captain.name}`, 'Drone');

      return [locutus];
    }),
  ],
});

cube.get(getCrew).map((member) => member.name);
// ["Locutus, formerly Jean-Luc Picard"]
// #endregion
