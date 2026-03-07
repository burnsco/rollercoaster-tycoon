import type { AttractionDefinition, GameState, NotificationKind, StallDefinition } from '../entities/types';

interface AttractionSystemDeps {
  attractionById: Record<string, AttractionDefinition>;
  notify: (message: string, kind?: NotificationKind) => void;
}

export function updateAttractions(state: GameState, dt: number, deps: AttractionSystemDeps): void {
  for (const attraction of Object.values(state.attractions)) {
    const definition = deps.attractionById[attraction.definitionId];
    if (!definition) {
      continue;
    }

    if (attraction.broken || !attraction.open) {
      attraction.queue = releaseQueue(state, attraction.queue, attraction.id, attraction.broken);
    }

    if (definition.category === 'ride' && attraction.open && !attraction.broken) {
      const breakdownChanceThisFrame = (definition.breakdownChancePerMinute / 60) * dt;
      if (Math.random() < breakdownChanceThisFrame) {
        attraction.broken = true;
        attraction.repairAssigned = false;
        attraction.open = false;
        attraction.timesBroken += 1;
        deps.notify(`${attraction.name} broke down and needs a mechanic.`, 'warning');
      }
    }

    if (attraction.broken) {
      attraction.downtime += dt;
      continue;
    }

    if (!attraction.open) {
      continue;
    }

    attraction.uptime += dt;
    attraction.cycleTimer -= dt;

    if (attraction.cycleTimer > 0) {
      continue;
    }

    unloadRiders(state, attraction.riders, definition);
    attraction.riders = [];

    const boarded = boardQueue(state, attraction.id, attraction.queue, definition, attraction.ticketPrice);
    attraction.riders = boarded;

    if (boarded.length > 0) {
      attraction.cycleTimer = definition.cycleDuration;
    } else {
      attraction.cycleTimer = Math.min(2, definition.cycleDuration);
    }
  }
}

function releaseQueue(
  state: GameState,
  queue: string[],
  attractionId: string,
  broken: boolean,
): string[] {
  for (const guestId of queue) {
    const guest = state.guests[guestId];
    if (!guest) {
      continue;
    }
    if (guest.targetAttractionId === attractionId && guest.state === 'queuing') {
      guest.state = 'idle';
      guest.targetAttractionId = null;
      guest.queueTimer = 0;
      guest.thought = broken ? 'Ride is broken.' : 'Ride is currently closed.';
      guest.happiness -= broken ? 7 : 4;
    }
  }

  return [];
}

function unloadRiders(state: GameState, riders: string[], definition: AttractionDefinition): void {
  for (const guestId of riders) {
    const guest = state.guests[guestId];
    if (!guest) {
      continue;
    }

    guest.state = 'idle';
    guest.targetAttractionId = null;
    guest.queueTimer = 0;

    if (definition.category === 'ride') {
      guest.happiness = Math.min(100, guest.happiness + definition.excitement * 0.11);
      guest.energy = Math.max(0, guest.energy - definition.intensity * 0.09);
      guest.nausea = Math.min(100, guest.nausea + definition.nausea * 0.16);
      guest.thought = `That was fun: ${definition.name}!`;
    } else {
      const stall = definition as StallDefinition;
      guest.hunger = Math.max(0, guest.hunger - stall.hungerRelief);
      guest.thirst = Math.max(0, guest.thirst - stall.thirstRelief);
      guest.nausea = Math.max(0, guest.nausea - stall.nauseaRelief);
      guest.happiness = Math.min(100, guest.happiness + stall.quality * 0.08);
      guest.thought = `Nice snack at ${definition.name}.`;
    }
  }
}

function boardQueue(
  state: GameState,
  attractionId: string,
  queue: string[],
  definition: AttractionDefinition,
  ticketPrice: number,
): string[] {
  const riders: string[] = [];

  while (queue.length > 0 && riders.length < definition.capacity) {
    const guestId = queue.shift();
    if (!guestId) {
      continue;
    }

    const guest = state.guests[guestId];
    if (!guest || guest.state !== 'queuing' || guest.targetAttractionId !== attractionId) {
      continue;
    }

    if (guest.money < ticketPrice) {
      guest.state = 'idle';
      guest.targetAttractionId = null;
      guest.happiness -= 4;
      guest.thought = 'Too expensive for me.';
      continue;
    }

    guest.money -= ticketPrice;
    guest.state = 'riding';
    guest.queueTimer = 0;

    state.economy.cash += ticketPrice;
    state.economy.incomeToday += ticketPrice;
    state.economy.totalIncome += ticketPrice;

    riders.push(guestId);
  }

  return riders;
}
