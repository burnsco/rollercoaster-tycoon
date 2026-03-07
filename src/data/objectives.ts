import type { GameState, ObjectiveState } from '../entities/types';

interface ObjectiveDefinition {
  id: string;
  title: string;
  description: string;
  evaluate: (state: GameState) => boolean;
}

const OBJECTIVE_DEFINITIONS: ObjectiveDefinition[] = [
  {
    id: 'guests-100',
    title: 'Growing Crowd',
    description: 'Reach 100 guests in your park.',
    evaluate: (state) => Object.keys(state.guests).length >= 100,
  },
  {
    id: 'happiness-75',
    title: 'Happy Park',
    description: 'Keep average guest happiness at 75 or above.',
    evaluate: (state) => {
      const guests = Object.values(state.guests);
      if (guests.length === 0) {
        return false;
      }
      const average = guests.reduce((sum, guest) => sum + guest.happiness, 0) / guests.length;
      return average >= 75;
    },
  },
  {
    id: 'cash-12000',
    title: 'Profitable Park',
    description: 'Earn and hold $12,000 cash.',
    evaluate: (state) => state.economy.cash >= 12000,
  },
];

export function createInitialObjectives(): ObjectiveState[] {
  return OBJECTIVE_DEFINITIONS.map((objective) => ({
    id: objective.id,
    title: objective.title,
    description: objective.description,
    completed: false,
  }));
}

export function evaluateObjectives(state: GameState): void {
  for (const objective of state.objectives) {
    const definition = OBJECTIVE_DEFINITIONS.find((item) => item.id === objective.id);
    if (!definition || objective.completed) {
      continue;
    }
    objective.completed = definition.evaluate(state);
  }
}
