// Elemental Mayhem - Core Type Definitions & Interfaces

export type ElementType =
  | 'Fire'
  | 'Water'
  | 'Lightning'
  | 'Earth'
  | 'Poison'
  | 'Void'
  | 'Love'
  | 'Sky'
  | 'Nature'
  | 'Ice'
  | 'Metal'
  | 'Darkness'
  | 'Light'
  | 'Electricity'
  | 'Sound'
  | 'Time'
  | 'Death'
  | 'Life'
  | 'Chaos'
  | 'Order'
  | 'Acid'
  | 'Blood'
  | 'Soul'
  | 'Spirit'
  | 'Energy'
  | 'Force'
  | 'Matter'
  | 'Space'
  | 'Gravity'
  | 'Momentum'
  | 'Vibration'
  | 'Radiation'
  | 'Magnetism'
  | 'Pressure'
  | 'Heat'
  | 'Cold'
  | 'Wind'
  | 'Storm'
  | 'Thunder'
  | 'Magma'
  | 'Glass'
  | 'Crystal'
  | 'Undead'
  | 'Neutral';

export interface ElementData {
  id: ElementType;
  name: string;
  color: string;
  glowColor: string;
  icon: string;
  description: string;
  category?: 'Primal' | 'Forces' | 'Life' | 'Cosmic';
  strongAgainst: ElementType[];
  weakAgainst: ElementType[];
}

export type TileHazardType =
  | 'None'
  | 'Burning'
  | 'Puddle'
  | 'ElectrifiedPuddle'
  | 'ToxicMire'
  | 'VoidRift'
  | 'MudWall'
  | 'IceSurface'
  | 'LavaPool'
  | 'AcidPool'
  | 'CrystalSpikes'
  | 'BonePile';

export interface PendingReanimation {
  id: string;
  coord: GridCoord;
  turnsRemaining: number;
  baseHp: number;
  baseAp: number;
  victimName: string;
}

export interface TileHazard {
  type: TileHazardType;
  duration: number; // in turns
  damagePerTurn: number;
  element: ElementType;
}

export interface GridCoord {
  x: number;
  y: number;
}

export interface TileState {
  coord: GridCoord;
  isObstacle: boolean;
  hazard: TileHazard;
}

export type StatusEffectType =
  | 'Burning'
  | 'Wet'
  | 'Shocked'
  | 'Poisoned'
  | 'Rooted'
  | 'Shielded'
  | 'VoidMarked'
  | 'Frozen'
  | 'Bleeding'
  | 'Corroded'
  | 'Charmed'
  | 'Stunned'
  | 'Blinded'
  | 'Regenerating'
  | 'TimeDilation'
  | 'Confused';

export interface StatusEffect {
  type: StatusEffectType;
  stacks: number;
  duration: number; // in turns
  tickDamage?: number;
  element?: ElementType;
}

export type TargetingType =
  | 'Self'
  | 'SingleUnit'
  | 'EmptyTile'
  | 'AnyTile'
  | 'Line'
  | 'AoECircle';

export interface Ability {
  id: string;
  name: string;
  element: ElementType;
  icon: string;
  apCost: number;
  cooldown: number; // in turns
  currentCooldown: number;
  range: number;
  aoeRadius: number;
  targeting: TargetingType;
  baseDamage: number;
  description: string;
  appliesStatus?: StatusEffectType;
  statusDuration?: number;
  createsHazard?: TileHazardType;
  hazardDuration?: number;
  level: number;
}

export type UnitFaction = 'Player' | 'Enemy';

export interface UnitStats {
  maxHp: number;
  currentHp: number;
  maxAp: number;
  currentAp: number;
  moveCostPerTile: number;
  elementalAffinity: ElementType;
}

export interface Unit {
  id: string;
  name: string;
  faction: UnitFaction;
  avatar: string;
  coord: GridCoord;
  level?: number;
  stats: UnitStats;
  abilities: Ability[];
  statusEffects: StatusEffect[];
  isDead: boolean;
  isBoss?: boolean;
  isZombie?: boolean;
  zombieClass?: ZombieClass;
  zombieLifetime?: number; // 4 turns max
  infectedByZombie?: boolean;
  isLifeBeing?: boolean;
}

export type ZombieClass =
  | 'Walker'
  | 'Runner'
  | 'Brute'
  | 'Spitter'
  | 'Wizard'
  | 'Boomer'
  | 'Frostbite'
  | 'DeathKnight'
  | 'Screamer'
  | 'PlagueBearer'
  | 'Electro';

export type TurnPhase =
  | 'ROUND_START'
  | 'PLAYER_TURN'
  | 'ENEMY_TURN'
  | 'ENVIRONMENT_TICK'
  | 'ROUND_END'
  | 'UPGRADE_PHASE'
  | 'VICTORY'
  | 'GAME_OVER'
  | 'HOTSEAT_P1_TURN'
  | 'HOTSEAT_P2_TURN'
  | 'HOTSEAT_VICTORY';

export interface ReactionResult {
  reactionName: string;
  elementA: ElementType;
  elementB: ElementType;
  bonusDamage: number;
  statusApplied?: StatusEffectType;
  hazardCreated?: TileHazardType;
  aoeRadius?: number;
  description: string;
}

export interface CombatLogEntry {
  id: string;
  turn: number;
  type: 'player' | 'enemy' | 'reaction' | 'hazard' | 'system';
  message: string;
  timestamp: number;
}

export interface PassiveRelic {
  id: string;
  name: string;
  icon: string;
  description: string;
  costEssence: number;
  costXp: number;
  applied: boolean;
  effect: (hero: Unit) => void;
}

export interface PerformanceStats {
  turnsUsed: number;
  damageDealt: number;
  damageTaken: number;
  reactionsTriggered: number;
  enemiesKilled: number;
  flawlessBonus: boolean;
  earnedEssence: number;
  earnedXp: number;
}

export interface GameState {
  currentRound: number;
  maxRounds: number;
  turnNumber: number;
  phase: TurnPhase;
  gridSize: number;
  tiles: TileState[][];
  hero: Unit;
  heroLevel?: number;
  enemies: Unit[];
  selectedAbilityId: string | null;
  selectedTargetCoord: GridCoord | null;
  hoveredCoord: GridCoord | null;
  availableMovementTiles: GridCoord[];
  availableTargetTiles: GridCoord[];
  totalEssence: number;
  totalXp: number;
  log: CombatLogEntry[];
  performance: PerformanceStats;
  ownedRelics: PassiveRelic[];
}
