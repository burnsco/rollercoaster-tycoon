import { ATTRACTION_BY_ID } from '../data/attractions';
import {
  DAY_LENGTH_SECONDS,
  GUEST_SPAWN_INTERVAL,
  MAX_GUESTS_SOFT_CAP,
  MAX_NOTIFICATIONS,
  STAFF_HIRE_COST,
} from '../data/constants';
import { evaluateObjectives } from '../data/objectives';
import { SCENERY_BY_ID } from '../data/scenery';
import type {
  AttractionInstance,
  BuildTool,
  GameState,
  Notification,
  NotificationKind,
  PlacementResult,
  PlacementValidation,
  Point,
  StaffType,
  UISnapshot,
} from '../entities/types';
import { updateAttractions } from '../systems/attractionSystem';
import { canAfford, recordBuildExpense, updateEconomy } from '../systems/economySystem';
import { beginLeavingPark, spawnGuest, updateGuests } from '../systems/guestSystem';
import { updateParkRating } from '../systems/ratingSystem';
import {
  applyPlacement,
  getBuildCost,
  getPlacementFootprint,
  validatePlacement,
} from '../systems/placementSystem';
import { hireStaff, updateStaff } from '../systems/staffSystem';
import { createInitialState } from './createInitialState';
import { loadGame, saveGame } from './saveLoad';
import { createId } from '../utils/id';
import { inBounds } from '../systems/grid';

export class Simulation {
  private state: GameState;
  private guestSpawnTimer = 0;
  private saveTimer = 0;
  private lowCashWarningCooldown = 0;
  private previousDay = 1;

  constructor() {
    const loaded = loadGame();
    this.state = loaded ? this.hydrateState(loaded) : createInitialState(false);
    this.previousDay = this.state.stats.day;
  }

  getState(): GameState {
    return this.state;
  }

  update(dt: number): void {
    this.state.stats.elapsedSeconds += dt;
    this.state.stats.day = Math.floor(this.state.stats.elapsedSeconds / DAY_LENGTH_SECONDS) + 1;
    this.state.stats.timeOfDay = this.state.stats.elapsedSeconds % DAY_LENGTH_SECONDS;

    if (this.state.stats.day > this.previousDay) {
      this.finalizePreviousDay(this.previousDay);
      this.previousDay = this.state.stats.day;
    }

    this.guestSpawnTimer += dt;
    const targetGuests = Math.max(35, Math.floor(this.state.stats.parkRating * 2.2));
    const spawnInterval =
      this.state.stats.parkRating > 70 ? Math.max(1.8, GUEST_SPAWN_INTERVAL - 1.1) : GUEST_SPAWN_INTERVAL;

    while (
      this.guestSpawnTimer >= spawnInterval &&
      Object.keys(this.state.guests).length < Math.min(MAX_GUESTS_SOFT_CAP, targetGuests)
    ) {
      spawnGuest(this.state);
      this.guestSpawnTimer -= spawnInterval;
    }

    updateAttractions(this.state, dt, {
      attractionById: ATTRACTION_BY_ID,
      notify: this.notify,
    });

    updateGuests(this.state, dt, {
      attractionById: ATTRACTION_BY_ID,
    });

    updateStaff(this.state, dt, {
      attractionById: ATTRACTION_BY_ID,
      notify: this.notify,
    });

    updateEconomy(this.state, dt, ATTRACTION_BY_ID);

    if (this.state.economy.cash < 0) {
      this.lowCashWarningCooldown -= dt;
      if (this.lowCashWarningCooldown <= 0) {
        this.lowCashWarningCooldown = 20;
        this.notify('Your park is in debt. Raise prices or cut costs.', 'warning');
      }
    }

    updateParkRating(this.state);
    evaluateObjectives(this.state);

    this.saveTimer += dt;
    if (this.saveTimer >= 12) {
      this.saveTimer = 0;
      this.save();
    }
  }

  getPlacementValidation(tool: BuildTool, tile: Point | null): PlacementValidation | null {
    if (!tile) {
      return null;
    }
    return validatePlacement(this.state, tool, tile, {
      attractionById: ATTRACTION_BY_ID,
      sceneryById: SCENERY_BY_ID,
    });
  }

  getToolFootprint(tool: BuildTool): { width: number; height: number } {
    return getPlacementFootprint(tool, {
      attractionById: ATTRACTION_BY_ID,
      sceneryById: SCENERY_BY_ID,
    });
  }

  placeAt(tool: BuildTool, tile: Point): PlacementResult {
    const cost = getBuildCost(tool, {
      attractionById: ATTRACTION_BY_ID,
      sceneryById: SCENERY_BY_ID,
    });

    if (cost > 0 && !canAfford(this.state, cost)) {
      this.notify('Not enough cash.', 'error');
      return { success: false, reason: 'Not enough cash.' };
    }

    const result = applyPlacement(this.state, tool, tile, {
      attractionById: ATTRACTION_BY_ID,
      sceneryById: SCENERY_BY_ID,
    });

    if (!result.success) {
      if (result.reason) {
        this.notify(result.reason, 'warning');
      }
      return result;
    }

    if (cost > 0) {
      recordBuildExpense(this.state, cost);
    }

    if (result.removedAttractionId) {
      this.onAttractionRemoved(result.removedAttractionId);
    }

    return result;
  }

  selectAtTile(tile: Point): void {
    if (!inBounds(this.state.map, tile)) {
      this.state.selection = { type: 'none', id: null };
      return;
    }

    const tileData = this.state.map.tiles[tile.y][tile.x];
    if (tileData.attractionId) {
      this.state.selection = {
        type: 'attraction',
        id: tileData.attractionId,
      };
      return;
    }

    const guest = Object.values(this.state.guests).find(
      (candidate) => candidate.tile.x === tile.x && candidate.tile.y === tile.y,
    );
    if (guest) {
      this.state.selection = { type: 'guest', id: guest.id };
      return;
    }

    const staff = Object.values(this.state.staff).find(
      (candidate) => candidate.tile.x === tile.x && candidate.tile.y === tile.y,
    );
    if (staff) {
      this.state.selection = { type: 'staff', id: staff.id };
      return;
    }

    this.state.selection = { type: 'none', id: null };
  }

  setAttractionOpen(attractionId: string, open: boolean): void {
    const attraction = this.state.attractions[attractionId];
    if (!attraction || attraction.broken) {
      return;
    }
    attraction.open = open;
  }

  setAttractionPrice(attractionId: string, nextPrice: number): void {
    const attraction = this.state.attractions[attractionId];
    if (!attraction) {
      return;
    }
    attraction.ticketPrice = Math.max(1, Math.min(30, Math.round(nextPrice)));
  }

  hire(type: StaffType): boolean {
    const cost = STAFF_HIRE_COST[type];
    if (!canAfford(this.state, cost)) {
      this.notify('Not enough cash to hire staff.', 'error');
      return false;
    }

    hireStaff(this.state, type);
    recordBuildExpense(this.state, cost);
    this.notify(`Hired a ${type}.`, 'info');
    return true;
  }

  setSandboxMode(enabled: boolean): void {
    this.state.stats.sandboxMode = enabled;
    this.notify(enabled ? 'Sandbox mode enabled.' : 'Sandbox mode disabled.', 'info');
  }

  save(): void {
    saveGame(this.state);
  }

  getSnapshot(): UISnapshot {
    const selectedAttraction =
      this.state.selection.type === 'attraction' && this.state.selection.id
        ? this.state.attractions[this.state.selection.id] ?? null
        : null;

    const selectedGuest =
      this.state.selection.type === 'guest' && this.state.selection.id
        ? this.state.guests[this.state.selection.id] ?? null
        : null;

    const selectedStaff =
      this.state.selection.type === 'staff' && this.state.selection.id
        ? this.state.staff[this.state.selection.id] ?? null
        : null;

    return {
      money: Math.round(this.state.economy.cash),
      guestCount: Object.keys(this.state.guests).length,
      janitorCount: Object.values(this.state.staff).filter((staff) => staff.type === 'janitor').length,
      mechanicCount: Object.values(this.state.staff).filter((staff) => staff.type === 'mechanic').length,
      rating: this.state.stats.parkRating,
      day: this.state.stats.day,
      dayProgress: this.state.stats.timeOfDay / DAY_LENGTH_SECONDS,
      incomeToday: Math.round(this.state.economy.incomeToday),
      expensesToday: Math.round(this.state.economy.expensesToday),
      notifications: this.state.notifications,
      objectives: this.state.objectives,
      selectedAttraction,
      selectedGuest,
      selectedStaff,
      sandboxMode: this.state.stats.sandboxMode,
      lastDaySummary: this.state.lastDaySummary,
    };
  }

  private finalizePreviousDay(day: number): void {
    const income = this.state.economy.incomeToday;
    const expenses = this.state.economy.expensesToday;
    const profit = income - expenses;

    this.state.lastDaySummary = {
      day,
      income: Math.round(income),
      expenses: Math.round(expenses),
      profit: Math.round(profit),
    };

    this.notify(
      `Day ${day} closed. Profit: $${Math.round(profit)} (Income $${Math.round(income)}, Expenses $${Math.round(expenses)}).`,
      profit >= 0 ? 'info' : 'warning',
    );

    this.state.economy.incomeToday = 0;
    this.state.economy.expensesToday = 0;
  }

  private onAttractionRemoved(attractionId: string): void {
    for (const guest of Object.values(this.state.guests)) {
      if (guest.targetAttractionId === attractionId) {
        beginLeavingPark(this.state, guest);
      }
    }

    if (this.state.selection.type === 'attraction' && this.state.selection.id === attractionId) {
      this.state.selection = { type: 'none', id: null };
    }
  }

  private hydrateState(raw: GameState): GameState {
    const fallback = createInitialState(false);

    const state: GameState = {
      ...fallback,
      ...raw,
      map: {
        ...fallback.map,
        ...raw.map,
      },
      attractions: raw.attractions ?? {},
      scenery: raw.scenery ?? {},
      guests: raw.guests ?? {},
      staff: raw.staff ?? {},
      notifications: raw.notifications ?? [],
      objectives: raw.objectives ?? fallback.objectives,
      selection: raw.selection ?? { type: 'none', id: null },
      lastDaySummary: raw.lastDaySummary ?? null,
    };

    for (const attraction of Object.values(state.attractions)) {
      if (!attraction.maxQueue) {
        const definition = ATTRACTION_BY_ID[attraction.definitionId];
        attraction.maxQueue = definition?.maxQueue ?? 20;
      }
    }

    return state;
  }

  private notify = (message: string, kind: NotificationKind = 'info'): void => {
    const notification: Notification = {
      id: createId('note'),
      message,
      kind,
      day: this.state.stats.day,
      timeOfDay: this.state.stats.timeOfDay,
    };

    this.state.notifications = [notification, ...this.state.notifications].slice(0, MAX_NOTIFICATIONS);
  };
}

export function isRide(attraction: AttractionInstance | null): boolean {
  return Boolean(attraction && attraction.category === 'ride');
}
