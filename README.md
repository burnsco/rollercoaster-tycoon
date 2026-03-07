# Park Tycoon (Browser)

A browser-based RollerCoaster Tycoon inspired management game built with TypeScript, React, and HTML5 Canvas.

## Features

- Top-down grid park map with camera pan (`right-drag` or `WASD/Arrow`) and zoom (`mouse wheel`)
- Build tools with live placement preview:
  - Paths
  - Rides (Ferris Wheel, Carousel, Small Coaster, Bumper Cars)
  - Food/Drink stalls (Burger, Lemonade)
  - Scenery (Tree, Bench, Bin, Flower Bed)
  - Demolish tool
- Guests with lightweight simulation:
  - Spawn at entrance
  - Walk along paths
  - Pick rides/stalls based on needs, prices, queue length, and distance
  - Track happiness, hunger, thirst, money, nausea, energy
- Ride and stall operations:
  - Capacity, cycle times, ticket prices, queueing
  - Open/close rides from inspector
  - Ride breakdowns and mechanic repair
- Staff:
  - Janitors clean littered paths
  - Mechanics repair broken rides
- Economy and management:
  - Build costs, running costs, wages
  - Revenue from tickets
  - Daily summary and park rating
  - Notifications and objective tracking
- Save/load to `localStorage`
- Optional sandbox mode toggle

## Tech Stack

- TypeScript
- React 19 + Vite
- HTML5 Canvas for world rendering
- Local storage persistence

## Run

```bash
npm install
npm run dev
```

Build for production:

```bash
npm run build
npm run preview
```

## Controls

- `Left click`: Place or inspect (depending on selected tool)
- `Right mouse drag`: Pan camera
- `W/A/S/D` or `Arrow keys`: Pan camera
- `Mouse wheel`: Zoom in/out

## Architecture

The project keeps simulation logic separate from rendering/UI.

```text
src/
  app/
    useGame.ts                 # React hook wiring UI to game controller
  data/
    attractions.ts             # Ride/stall definitions
    scenery.ts                 # Scenery definitions
    objectives.ts              # Objective rules
    constants.ts               # Shared constants
  engine/
    GameLoop.ts                # Fixed timestep loop
    Camera.ts                  # Camera pan/zoom state
    CanvasRenderer.ts          # Canvas map/entity rendering
    GameController.ts          # Input + simulation + render orchestration
  entities/
    types.ts                   # Core game models/interfaces
  simulation/
    createInitialState.ts      # Park bootstrap state
    Simulation.ts              # Main simulation coordinator and actions
    saveLoad.ts                # localStorage persistence
  systems/
    grid.ts                    # Grid helpers
    pathfinding.ts             # BFS pathfinding
    placementSystem.ts         # Build/validate/demolish logic
    guestSystem.ts             # Guest behavior + needs
    attractionSystem.ts        # Ride/stall queue + cycles + breakdown handling
    staffSystem.ts             # Janitor/mechanic behavior
    economySystem.ts           # Expenses and affordability
    ratingSystem.ts            # Park rating calculation
  ui/components/
    HUD.tsx
    BuildMenu.tsx
    InspectorPanel.tsx
    ObjectivesPanel.tsx
    NotificationsPanel.tsx
```

## Gameplay Phases Covered

- Phase 1:
  - App setup with Vite + TypeScript + React
  - Map render, path placement, ride placement, guest spawning/pathing, basic money flow
- Phase 2:
  - Stalls, staff, breakdown/repair, guest needs, ride management UI
- Phase 3:
  - Park rating, save/load, notifications, objectives, UI polish

## Notes

- The coaster is currently a prebuilt attraction template (no custom track editor yet).
- AI and simulation are intentionally lightweight for performance and readability.

## Future Improvements

- Custom coaster track builder/editor
- More rides, stalls, and scenery sets
- Weather and seasonal effects
- Staff patrol zones and work priorities
- Advanced guest thoughts/memory/personality traits
- Scenario/campaign mode with win/lose conditions
