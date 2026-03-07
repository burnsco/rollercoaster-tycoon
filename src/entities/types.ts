export type TileTerrain = 'grass' | 'water';

export type AttractionCategory = 'ride' | 'stall';

export type StaffType = 'janitor' | 'mechanic';

export type SceneryType = 'tree' | 'bench' | 'bin' | 'flowerbed';

export type NotificationKind = 'info' | 'warning' | 'error';

export type GuestState = 'idle' | 'walking' | 'queuing' | 'riding' | 'leaving';

export type StaffState = 'idle' | 'moving' | 'cleaning' | 'repairing';

export interface Point {
  x: number;
  y: number;
}

export interface RectSize {
  width: number;
  height: number;
}

export interface TileData {
  terrain: TileTerrain;
  hasPath: boolean;
  attractionId: string | null;
  sceneryId: string | null;
  litter: number;
}

interface BaseAttractionDefinition {
  id: string;
  name: string;
  category: AttractionCategory;
  buildCost: number;
  runningCost: number;
  capacity: number;
  cycleDuration: number;
  maxQueue: number;
  footprint: RectSize;
  baseColor: string;
  defaultTicketPrice: number;
}

export interface RideDefinition extends BaseAttractionDefinition {
  category: 'ride';
  excitement: number;
  intensity: number;
  nausea: number;
  breakdownChancePerMinute: number;
}

export interface StallDefinition extends BaseAttractionDefinition {
  category: 'stall';
  hungerRelief: number;
  thirstRelief: number;
  nauseaRelief: number;
  quality: number;
}

export type AttractionDefinition = RideDefinition | StallDefinition;

export interface AttractionInstance {
  id: string;
  definitionId: string;
  category: AttractionCategory;
  name: string;
  origin: Point;
  footprint: RectSize;
  accessTile: Point;
  open: boolean;
  ticketPrice: number;
  maxQueue: number;
  queue: string[];
  riders: string[];
  cycleTimer: number;
  broken: boolean;
  repairAssigned: boolean;
  timesBroken: number;
  uptime: number;
  downtime: number;
}

export interface SceneryInstance {
  id: string;
  type: SceneryType;
  origin: Point;
  footprint: RectSize;
}

export interface Guest {
  id: string;
  tile: Point;
  path: Point[];
  moveProgress: number;
  queueTimer: number;
  state: GuestState;
  targetAttractionId: string | null;
  happiness: number;
  hunger: number;
  thirst: number;
  money: number;
  nausea: number;
  energy: number;
  decisionTimer: number;
  litterTimer: number;
  thought: string;
}

export interface StaffMember {
  id: string;
  type: StaffType;
  tile: Point;
  path: Point[];
  state: StaffState;
  targetAttractionId: string | null;
  targetTile: Point | null;
  workTimer: number;
  wage: number;
}

export interface GameEconomy {
  cash: number;
  incomeToday: number;
  expensesToday: number;
  totalIncome: number;
  totalExpenses: number;
}

export interface GameStats {
  elapsedSeconds: number;
  day: number;
  timeOfDay: number;
  parkRating: number;
  sandboxMode: boolean;
}

export interface Notification {
  id: string;
  message: string;
  kind: NotificationKind;
  day: number;
  timeOfDay: number;
}

export interface ObjectiveState {
  id: string;
  title: string;
  description: string;
  completed: boolean;
}

export interface DaySummary {
  day: number;
  income: number;
  expenses: number;
  profit: number;
}

export interface MapState {
  width: number;
  height: number;
  entrance: Point;
  tiles: TileData[][];
}

export interface SelectionState {
  type: 'attraction' | 'guest' | 'staff' | 'none';
  id: string | null;
}

export interface GameState {
  map: MapState;
  attractions: Record<string, AttractionInstance>;
  scenery: Record<string, SceneryInstance>;
  guests: Record<string, Guest>;
  staff: Record<string, StaffMember>;
  economy: GameEconomy;
  stats: GameStats;
  notifications: Notification[];
  objectives: ObjectiveState[];
  selection: SelectionState;
  lastDaySummary: DaySummary | null;
}

export type BuildTool =
  | { kind: 'inspect' }
  | { kind: 'path' }
  | { kind: 'demolish' }
  | { kind: 'attraction'; definitionId: string }
  | { kind: 'scenery'; sceneryType: SceneryType };

export interface PlacementValidation {
  valid: boolean;
  reason?: string;
  accessTile?: Point;
}

export interface PlacementResult {
  success: boolean;
  reason?: string;
  removedAttractionId?: string;
}

export interface RenderOverlay {
  tool: BuildTool;
  hoveredTile: Point | null;
  placementValidation: PlacementValidation | null;
  previewSize: RectSize;
  selection: SelectionState;
}

export interface UISnapshot {
  money: number;
  guestCount: number;
  janitorCount: number;
  mechanicCount: number;
  rating: number;
  day: number;
  dayProgress: number;
  incomeToday: number;
  expensesToday: number;
  notifications: Notification[];
  objectives: ObjectiveState[];
  selectedAttraction: AttractionInstance | null;
  selectedGuest: Guest | null;
  selectedStaff: StaffMember | null;
  sandboxMode: boolean;
  lastDaySummary: DaySummary | null;
}
