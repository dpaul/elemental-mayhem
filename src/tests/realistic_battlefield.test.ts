// Elemental Mayhem - Realistic Battlefield & Procedural Terrain Unit Tests
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BattlefieldRenderer } from '../renderer/BattlefieldRenderer';
import { CombatEngine } from '../engine/CombatEngine';
import { Grid } from '../engine/Grid';
import { TileHazardManager } from '../engine/TileHazardManager';
import { Unit, TileHazardType } from '../types';

describe('Realistic Battlefield & Procedural Terrain Rendering', () => {
  let mockCtx: any;
  let mockCanvas: any;
  let combatEngine: CombatEngine;
  let renderer: BattlefieldRenderer;

  beforeEach(() => {
    mockCtx = {
      clearRect: vi.fn(),
      setTransform: vi.fn(),
      save: vi.fn(),
      restore: vi.fn(),
      translate: vi.fn(),
      fillRect: vi.fn(),
      strokeRect: vi.fn(),
      fillText: vi.fn(),
      createLinearGradient: vi.fn(() => ({
        addColorStop: vi.fn(),
      })),
      createRadialGradient: vi.fn(() => ({
        addColorStop: vi.fn(),
      })),
      beginPath: vi.fn(),
      closePath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      arc: vi.fn(),
      ellipse: vi.fn(),
      quadraticCurveTo: vi.fn(),
      bezierCurveTo: vi.fn(),
      fill: vi.fn(),
      stroke: vi.fn(),
    };

    mockCanvas = {
      width: 800,
      height: 800,
      getContext: () => mockCtx,
      getBoundingClientRect: () => ({ left: 0, top: 0, width: 800, height: 800 }),
    };

    const grid = new Grid(10);
    const hazardManager = new TileHazardManager(grid);
    const hero: Unit = {
      id: 'hero',
      name: 'Hero',
      faction: 'Player',
      avatar: '🧙',
      coord: { x: 1, y: 1 },
      stats: { maxHp: 100, currentHp: 100, maxAp: 4, currentAp: 4, moveCostPerTile: 1, elementalAffinity: 'Fire' },
      abilities: [],
      statusEffects: [],
      isDead: false,
    };
    combatEngine = new CombatEngine(grid, hazardManager, hero, []);
    renderer = new BattlefieldRenderer(mockCanvas, combatEngine);
  });

  it('renders realistic stone flagstone pavers with bevels in normal mode', () => {
    // Normal mode rendering
    renderer.isDarkCloudsTheme = false;
    renderer.render(null, [], []);

    // Verify paver gradients and bevel strokes were called
    expect(mockCtx.createLinearGradient).toHaveBeenCalled();
    expect(mockCtx.fillRect).toHaveBeenCalled();
    expect(mockCtx.beginPath).toHaveBeenCalled();
    expect(mockCtx.stroke).toHaveBeenCalled();
  });

  it('renders abyssal obsidian flagstones and glowing runic veins in Dark Clouds mode', () => {
    renderer.isDarkCloudsTheme = true;
    renderer.elapsedTotalTimeMs = 1200;
    renderer.render(null, [], []);

    expect(mockCtx.createLinearGradient).toHaveBeenCalled();
    expect(mockCtx.beginPath).toHaveBeenCalled();
    expect(mockCtx.stroke).toHaveBeenCalled();
  });

  it('renders procedural dynamic animations across all 10 hazard types', () => {
    const hazards: TileHazardType[] = [
      'Burning',
      'Puddle',
      'ElectrifiedPuddle',
      'ToxicMire',
      'VoidRift',
      'LavaPool',
      'IceSurface',
      'AcidPool',
      'CrystalSpikes',
      'BonePile',
    ];

    hazards.forEach((hazardType, index) => {
      const tile = combatEngine.grid.getTile({ x: index, y: 0 });
      if (tile) {
        tile.hazard = { type: hazardType, duration: 3, damagePerTurn: 10, element: 'Fire' };
      }
    });

    renderer.elapsedTotalTimeMs = 2500;
    expect(() => renderer.render(null, [], [])).not.toThrow();

    // Verify radial gradients were generated for organic fluid/fire/rift hazards
    expect(mockCtx.createRadialGradient).toHaveBeenCalled();
  });

  it('renders 3D-shaded obstacles including boulders, timber barricades, crystal monoliths, and plinths', () => {
    // Place different obstacle types
    combatEngine.grid.setObstacle({ x: 2, y: 2 }, true, '🪨');
    combatEngine.grid.setObstacle({ x: 3, y: 3 }, true, '🪵');
    combatEngine.grid.setObstacle({ x: 4, y: 4 }, true, '💎');
    combatEngine.grid.setObstacle({ x: 5, y: 5 }, true, '⚔️');

    expect(() => renderer.render(null, [], [])).not.toThrow();
    expect(mockCtx.createLinearGradient).toHaveBeenCalled();
  });

  it('renders heavy ancient stone arena curb border around the grid perimeter', () => {
    renderer.render(null, [], []);

    // Expect drop shadow and curb border rects to be rendered
    expect(mockCtx.fillRect).toHaveBeenCalled();
    expect(mockCtx.strokeRect).toHaveBeenCalled();
  });

  it('maintains a perfectly balanced ctx.save and ctx.restore count across rendering', () => {
    mockCtx.save.mockClear();
    mockCtx.restore.mockClear();

    renderer.render({ x: 2, y: 2 }, [{ x: 1, y: 2 }], [{ x: 3, y: 2 }], 'hero');

    expect(mockCtx.save.mock.calls.length).toBeGreaterThan(0);
    expect(mockCtx.save.mock.calls.length).toBe(mockCtx.restore.mock.calls.length);
  });

  it('resets canvas transformation matrix at frame start to prevent transform drift', () => {
    renderer.render(null, [], []);
    expect(mockCtx.setTransform).toHaveBeenCalledWith(1, 0, 0, 1, 0, 0);
  });

  it('correctly maps screen coordinates to grid coordinates with pillarboxed element (wider than 1:1)', () => {
    // 800x800 canvas displayed inside 1000x500 element with object-fit: contain
    // Visible canvas is 500x500, centered horizontally: letterboxX = (1000 - 500) / 2 = 250px
    // Grid origin inside 800x800 buffer is gridOffsetX = 20, tileSize = 76
    // Tile (0, 0) top-left in canvas: (20, 20)
    // In CSS screen coords:
    // clientX = left(0) + letterboxX(250) + 20 * (500 / 800) = 250 + 12.5 = 262.5
    // clientY = top(0) + letterboxY(0) + 20 * (500 / 800) = 12.5
    mockCanvas.getBoundingClientRect = () => ({ left: 0, top: 0, width: 1000, height: 500 });

    // Click on tile (0, 0) center: canvas buffer (20 + 38, 20 + 38) = (58, 58)
    // Screen: (250 + 58 * 0.625, 58 * 0.625) = (286.25, 36.25)
    const coord00 = renderer.screenToGrid(286.25, 36.25);
    expect(coord00).toEqual({ x: 0, y: 0 });

    // Click on tile (5, 5) center: canvas buffer (20 + 5.5 * 76, 20 + 5.5 * 76) = (438, 438)
    // Screen: (250 + 438 * 0.625, 438 * 0.625) = (523.75, 273.75)
    const coord55 = renderer.screenToGrid(523.75, 273.75);
    expect(coord55).toEqual({ x: 5, y: 5 });

    // Click in horizontal pillarbox bar (clientX = 50, inside empty bar)
    const outsideCoord = renderer.screenToGrid(50, 250);
    expect(outsideCoord).toBeNull();
  });

  it('correctly maps screen coordinates to grid coordinates with letterboxed element (taller than 1:1)', () => {
    // 800x800 canvas displayed inside 500x1000 element with object-fit: contain
    // Visible canvas is 500x500, centered vertically: letterboxY = (1000 - 500) / 2 = 250px
    mockCanvas.getBoundingClientRect = () => ({ left: 0, top: 0, width: 500, height: 1000 });

    // Click on tile (0, 0) center: canvas buffer (58, 58)
    // Screen: (58 * 0.625, 250 + 58 * 0.625) = (36.25, 286.25)
    const coord00 = renderer.screenToGrid(36.25, 286.25);
    expect(coord00).toEqual({ x: 0, y: 0 });

    // Click in vertical letterbox bar (clientY = 50, inside empty top bar)
    const outsideCoord = renderer.screenToGrid(250, 50);
    expect(outsideCoord).toBeNull();
  });
});
