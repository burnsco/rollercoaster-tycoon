import type { AttractionDefinition, GameState, Guest } from '../entities/types';
import { createId } from '../utils/id';
import { findPath } from './pathfinding';
import { isWalkablePathTile, manhattanDistance, neighbors4 } from './grid';

interface GuestSystemDeps {
  attractionById: Record<string, AttractionDefinition>;
}

const GUEST_MOVE_SPEED = 3.3;

export function spawnGuest(state: GameState): Guest {
  const guest: Guest = {
    id: createId('guest'),
    tile: { ...state.map.entrance },
    path: [],
    moveProgress: 0,
    queueTimer: 0,
    state: 'idle',
    targetAttractionId: null,
    happiness: 62 + Math.random() * 25,
    hunger: 6 + Math.random() * 20,
    thirst: 8 + Math.random() * 24,
    money: 24 + Math.random() * 70,
    nausea: Math.random() * 14,
    energy: 70 + Math.random() * 25,
    decisionTimer: Math.random() * 3,
    litterTimer: 0,
    thought: 'Just arrived!',
  };

  state.guests[guest.id] = guest;
  return guest;
}

export function updateGuests(state: GameState, dt: number, deps: GuestSystemDeps): void {
  const guestIds = Object.keys(state.guests);

  for (const guestId of guestIds) {
    const guest = state.guests[guestId];
    if (!guest) {
      continue;
    }

    updateNeeds(state, guest, dt);

    switch (guest.state) {
      case 'walking':
      case 'leaving': {
        moveAlongPath(state, guest, dt);
        break;
      }
      case 'queuing': {
        handleQueueWaiting(state, guest, dt);
        break;
      }
      case 'riding': {
        guest.happiness = Math.min(100, guest.happiness + dt * 0.2);
        break;
      }
      default:
        break;
    }

    if (guest.state === 'idle') {
      guest.decisionTimer -= dt;
      if (guest.decisionTimer <= 0) {
        guest.decisionTimer = 2 + Math.random() * 4;
        chooseNewDestination(state, guest, deps.attractionById);
      }
    }

    if (guest.state === 'leaving' && guest.tile.x === state.map.entrance.x && guest.tile.y === state.map.entrance.y) {
      delete state.guests[guest.id];
      continue;
    }

    if (guest.money <= 0 || guest.happiness < 8) {
      beginLeavingPark(state, guest);
    }

    clampGuestStats(guest);
  }
}

function updateNeeds(state: GameState, guest: Guest, dt: number): void {
  guest.hunger = Math.min(100, guest.hunger + dt * 1.35);
  guest.thirst = Math.min(100, guest.thirst + dt * 1.6);
  guest.nausea = Math.max(0, guest.nausea - dt * 0.45);

  if (guest.state === 'walking') {
    guest.energy = Math.max(0, guest.energy - dt * 1.05);
  } else {
    guest.energy = Math.min(100, guest.energy + dt * 0.3);
  }

  const tile = state.map.tiles[guest.tile.y][guest.tile.x];
  if (tile.litter > 45) {
    guest.happiness -= dt * 0.85;
  }

  if (guest.hunger > 70 || guest.thirst > 70) {
    guest.happiness -= dt * 0.4;
  }

  if (guest.nausea > 65) {
    guest.happiness -= dt * 0.6;
  }

  guest.litterTimer += dt;
  if (guest.litterTimer > 12) {
    guest.litterTimer = 0;
    maybeDropLitter(state, guest);
  }
}

function maybeDropLitter(state: GameState, guest: Guest): void {
  const tile = state.map.tiles[guest.tile.y][guest.tile.x];
  if (!tile.hasPath) {
    return;
  }

  let nearBin = false;
  for (const [sceneryId, scenery] of Object.entries(state.scenery)) {
    if (state.scenery[sceneryId]?.type !== 'bin') {
      continue;
    }
    if (manhattanDistance(guest.tile, scenery.origin) <= 3) {
      nearBin = true;
      break;
    }
  }

  const chance = nearBin ? 0.03 : 0.18;
  if (Math.random() < chance) {
    tile.litter = Math.min(100, tile.litter + 15 + Math.random() * 15);
  }
}

function moveAlongPath(state: GameState, guest: Guest, dt: number): void {
  if (guest.path.length === 0) {
    onDestinationReached(state, guest);
    return;
  }

  guest.moveProgress += dt * GUEST_MOVE_SPEED;
  while (guest.moveProgress >= 1 && guest.path.length > 0) {
    const next = guest.path.shift();
    if (!next) {
      break;
    }
    guest.tile = next;
    guest.moveProgress -= 1;
  }

  if (guest.path.length === 0) {
    onDestinationReached(state, guest);
  }
}

function handleQueueWaiting(state: GameState, guest: Guest, dt: number): void {
  guest.queueTimer += dt;
  if (guest.queueTimer > 16) {
    guest.happiness -= dt * 1.2;
  }

  const attraction = guest.targetAttractionId ? state.attractions[guest.targetAttractionId] : null;
  if (!attraction || !attraction.open || attraction.broken) {
    guest.state = 'idle';
    guest.targetAttractionId = null;
    guest.queueTimer = 0;
    guest.thought = 'That ride is unavailable.';
    return;
  }

  if (guest.queueTimer > 34 && Math.random() < 0.08) {
    attraction.queue = attraction.queue.filter((id) => id !== guest.id);
    guest.state = 'idle';
    guest.targetAttractionId = null;
    guest.queueTimer = 0;
    guest.happiness -= 6;
    guest.thought = 'Queue is too long!';
  }
}

function onDestinationReached(state: GameState, guest: Guest): void {
  if (guest.state === 'leaving') {
    return;
  }

  const targetId = guest.targetAttractionId;
  if (!targetId) {
    guest.state = 'idle';
    return;
  }

  const attraction = state.attractions[targetId];
  if (!attraction || !attraction.open || attraction.broken) {
    guest.state = 'idle';
    guest.targetAttractionId = null;
    guest.thought = 'I need another plan.';
    return;
  }

  const alreadyQueued = attraction.queue.includes(guest.id);
  if (!alreadyQueued) {
    if (attraction.queue.length >= attraction.maxQueue) {
      guest.state = 'idle';
      guest.targetAttractionId = null;
      guest.happiness -= 4;
      guest.thought = 'That queue is impossible.';
      return;
    }

    attraction.queue.push(guest.id);
  }

  guest.state = 'queuing';
  guest.queueTimer = 0;
  guest.thought = `Waiting for ${attraction.name}.`;
}

function chooseNewDestination(
  state: GameState,
  guest: Guest,
  attractionById: Record<string, AttractionDefinition>,
): void {
  if (guest.state === 'leaving' || !isWalkablePathTile(state.map, guest.tile)) {
    return;
  }

  const candidates = Object.values(state.attractions)
    .filter((attraction) => attraction.open && !attraction.broken)
    .map((attraction) => {
      const definition = attractionById[attraction.definitionId];
      if (!definition) {
        return null;
      }

      const distancePenalty = manhattanDistance(guest.tile, attraction.accessTile) * 1.2;
      const queuePenalty = attraction.queue.length * 1.7;
      let score = 0;

      if (definition.category === 'ride') {
        score += definition.excitement;
        score -= Math.max(0, definition.intensity - (100 - guest.nausea)) * 0.4;
        score += Math.max(0, guest.energy - 35) * 0.2;
      } else {
        score += guest.hunger * (definition.hungerRelief / 60);
        score += guest.thirst * (definition.thirstRelief / 60);
      }

      score -= distancePenalty;
      score -= queuePenalty;
      score -= attraction.ticketPrice * 0.6;
      score += Math.random() * 18;

      return { attraction, score };
    })
    .filter((item): item is { attraction: (typeof state.attractions)[string]; score: number } => Boolean(item))
    .sort((a, b) => b.score - a.score);

  const best = candidates[0];

  if (!best || best.score < 8) {
    roamOrLeave(state, guest);
    return;
  }

  if (guest.money < best.attraction.ticketPrice) {
    guest.thought = 'I am out of cash.';
    beginLeavingPark(state, guest);
    return;
  }

  const path = findPath(state.map, guest.tile, best.attraction.accessTile);
  if (path.length === 0) {
    roamOrLeave(state, guest);
    return;
  }

  guest.targetAttractionId = best.attraction.id;
  guest.path = path;
  guest.moveProgress = 0;
  guest.state = 'walking';
  guest.thought = `Heading to ${best.attraction.name}.`;
}

function roamOrLeave(state: GameState, guest: Guest): void {
  const walkableNeighbors = neighbors4(state.map, guest.tile).filter((point) => isWalkablePathTile(state.map, point));

  if (walkableNeighbors.length === 0 || guest.happiness < 15) {
    beginLeavingPark(state, guest);
    return;
  }

  const target = walkableNeighbors[Math.floor(Math.random() * walkableNeighbors.length)];
  guest.path = [target];
  guest.state = 'walking';
  guest.targetAttractionId = null;
  guest.moveProgress = 0;
  guest.thought = 'Looking around.';
}

export function beginLeavingPark(state: GameState, guest: Guest): void {
  if (guest.state === 'leaving') {
    return;
  }

  if (guest.targetAttractionId) {
    const target = state.attractions[guest.targetAttractionId];
    if (target) {
      target.queue = target.queue.filter((id) => id !== guest.id);
      target.riders = target.riders.filter((id) => id !== guest.id);
    }
  }

  guest.targetAttractionId = null;
  const path = findPath(state.map, guest.tile, state.map.entrance);

  if (path.length === 0) {
    delete state.guests[guest.id];
    return;
  }

  guest.state = 'leaving';
  guest.path = path;
  guest.thought = 'Leaving the park.';
}

export function removeGuestFromPark(state: GameState, guestId: string): void {
  const guest = state.guests[guestId];
  if (!guest) {
    return;
  }

  if (guest.targetAttractionId) {
    const target = state.attractions[guest.targetAttractionId];
    if (target) {
      target.queue = target.queue.filter((id) => id !== guestId);
      target.riders = target.riders.filter((id) => id !== guestId);
    }
  }

  delete state.guests[guestId];
}

function clampGuestStats(guest: Guest): void {
  guest.happiness = clamp(guest.happiness, 0, 100);
  guest.hunger = clamp(guest.hunger, 0, 100);
  guest.thirst = clamp(guest.thirst, 0, 100);
  guest.money = clamp(guest.money, 0, 500);
  guest.nausea = clamp(guest.nausea, 0, 100);
  guest.energy = clamp(guest.energy, 0, 100);
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
