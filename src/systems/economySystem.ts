import { DAY_LENGTH_SECONDS } from '../data/constants';
import type { AttractionDefinition, GameState } from '../entities/types';

export function updateEconomy(
  state: GameState,
  dt: number,
  attractionById: Record<string, AttractionDefinition>,
): void {
  const runningCostPerDay = Object.values(state.attractions).reduce((sum, attraction) => {
    const definition = attractionById[attraction.definitionId];
    return sum + (definition?.runningCost ?? 0);
  }, 0);

  const staffWagesPerDay = Object.values(state.staff).reduce((sum, staff) => sum + staff.wage, 0);
  const expense = ((runningCostPerDay + staffWagesPerDay) / DAY_LENGTH_SECONDS) * dt;

  state.economy.expensesToday += expense;
  state.economy.totalExpenses += expense;

  if (!state.stats.sandboxMode) {
    state.economy.cash -= expense;
  }
}

export function recordBuildExpense(state: GameState, amount: number): void {
  state.economy.expensesToday += amount;
  state.economy.totalExpenses += amount;
  if (!state.stats.sandboxMode) {
    state.economy.cash -= amount;
  }
}

export function canAfford(state: GameState, amount: number): boolean {
  return state.stats.sandboxMode || state.economy.cash >= amount;
}
