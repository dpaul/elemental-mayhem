// Elemental Mayhem - Element Registry & Configuration
import { ElementData, ElementType } from '../types';

export const CORE_ELEMENTS: Record<ElementType, ElementData> = {
  Fire: {
    id: 'Fire',
    name: 'Fire',
    color: '#ff6b35',
    glowColor: 'rgba(255, 107, 53, 0.5)',
    icon: '🔥',
    description: 'Blazing destructive power causing continuous burning and explosive volatile reactions.',
    strongAgainst: ['Poison', 'Earth'],
    weakAgainst: ['Water', 'Void'],
  },
  Water: {
    id: 'Water',
    name: 'Water',
    color: '#00d2ff',
    glowColor: 'rgba(0, 210, 255, 0.5)',
    icon: '💧',
    description: 'Fluid conductive force soaking targets and spreading lightning conductivity.',
    strongAgainst: ['Fire', 'Earth'],
    weakAgainst: ['Lightning', 'Poison'],
  },
  Lightning: {
    id: 'Lightning',
    name: 'Lightning',
    color: '#ffd000',
    glowColor: 'rgba(255, 208, 0, 0.5)',
    icon: '⚡',
    description: 'Instantaneous ionization shocking enemies and reducing their Action Points.',
    strongAgainst: ['Water', 'Void'],
    weakAgainst: ['Earth'],
  },
  Earth: {
    id: 'Earth',
    name: 'Earth',
    color: '#ca8a04',
    glowColor: 'rgba(202, 138, 4, 0.5)',
    icon: '🪨',
    description: 'Solid mineral fortitude grounding electricity and raising defensive stone obstacles.',
    strongAgainst: ['Lightning', 'Fire'],
    weakAgainst: ['Water', 'Poison'],
  },
  Poison: {
    id: 'Poison',
    name: 'Poison',
    color: '#22c55e',
    glowColor: 'rgba(34, 197, 94, 0.5)',
    icon: '🧪',
    description: 'Corrosive venom stacking damage over time and exploding violently when ignited.',
    strongAgainst: ['Water', 'Earth'],
    weakAgainst: ['Fire', 'Void'],
  },
  Void: {
    id: 'Void',
    name: 'Void',
    color: '#d946ef',
    glowColor: 'rgba(217, 70, 239, 0.5)',
    icon: '🌌',
    description: 'Entropic cosmic darkness pulling targets, marking vulnerabilities, and collapsing status effects.',
    strongAgainst: ['Fire', 'Poison'],
    weakAgainst: ['Lightning'],
  },
  Neutral: {
    id: 'Neutral',
    name: 'Neutral',
    color: '#94a3b8',
    glowColor: 'rgba(148, 163, 184, 0.3)',
    icon: '⚔️',
    description: 'Basic physical force without elemental affinity.',
    strongAgainst: [],
    weakAgainst: [],
  },
};

// Complete 42 Elements Registry from elements.md for game lore & expansion
export const ALL_42_ELEMENTS = [
  'Sky', 'Love', 'Fire', 'Nature', 'Water', 'Ice', 'Metal', 'Darkness', 'Light',
  'Electricity', 'Sound', 'Time', 'Death', 'Life', 'Void', 'Chaos', 'Order',
  'Poison', 'Acid', 'Blood', 'Soul', 'Spirit', 'Energy', 'Force', 'Matter',
  'Space', 'Gravity', 'Momentum', 'Vibration', 'Radiation', 'Magnetism', 'Pressure',
  'Heat', 'Cold', 'Wind', 'Storm', 'Lightning', 'Thunder', 'Earth', 'Magma',
  'Glass', 'Crystal'
] as const;

export const DEFAULT_GRID_SIZE = 10;
export const DEFAULT_HERO_HP = 100;
export const DEFAULT_HERO_AP = 6;
export const DEFAULT_MOVE_COST = 1; // 1 AP per tile
