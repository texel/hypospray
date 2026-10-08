import { inject } from '@hypospray/core';

export class CrewMember {
  constructor(
    public name: string,
    public rank: string,
  ) {}
}

export function getCrewMembers(): CrewMember[] {
  return [
    new CrewMember('Jean Luc Picard', 'Captain'),
    new CrewMember('William Riker', 'Commander'),
    new CrewMember('Data', 'Lieutenant'),
    new CrewMember('Wesley Crusher', 'E'),
  ];
}

export function createAwayTeam(crew = inject(getCrewMembers)) {
  return {
    crew,
  };
}
