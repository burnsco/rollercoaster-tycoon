import type { GameState } from '../entities/types';

export function updateParkRating(state: GameState): void {
  const guests = Object.values(state.guests);
  const attractions = Object.values(state.attractions);

  const averageHappiness =
    guests.length > 0
      ? guests.reduce((sum, guest) => sum + guest.happiness, 0) / guests.length
      : 60;

  let pathCount = 0;
  let litterTotal = 0;
  for (let y = 0; y < state.map.height; y += 1) {
    for (let x = 0; x < state.map.width; x += 1) {
      const tile = state.map.tiles[y][x];
      if (!tile.hasPath) {
        continue;
      }
      pathCount += 1;
      litterTotal += tile.litter;
    }
  }

  const cleanliness = pathCount > 0 ? 100 - litterTotal / pathCount : 100;
  const rideVariety = new Set(
    attractions
      .filter((attraction) => attraction.category === 'ride')
      .map((attraction) => attraction.definitionId),
  ).size;

  const uptimeRatios = attractions
    .filter((attraction) => attraction.category === 'ride')
    .map((attraction) => {
      const total = attraction.uptime + attraction.downtime;
      return total > 0 ? attraction.uptime / total : 1;
    });

  const averageUptime =
    uptimeRatios.length > 0
      ? (uptimeRatios.reduce((sum, ratio) => sum + ratio, 0) / uptimeRatios.length) * 100
      : 100;

  const score =
    20 +
    averageHappiness * 0.42 +
    cleanliness * 0.22 +
    Math.min(100, rideVariety * 16) * 0.2 +
    averageUptime * 0.16;

  state.stats.parkRating = Math.round(clamp(score, 0, 100));
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
