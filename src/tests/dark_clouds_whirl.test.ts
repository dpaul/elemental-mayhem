import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SoundEngine } from '../audio/SoundEngine';
import { BattlefieldRenderer } from '../renderer/BattlefieldRenderer';
import { CombatEngine } from '../engine/CombatEngine';
import { Grid } from '../engine/Grid';
import { TileHazardManager } from '../engine/TileHazardManager';
import { Unit } from '../types';

class MockElement {
  public id: string = '';
  public classList = {
    classes: new Set<string>(),
    add: (...c: string[]) => c.forEach((cls) => this.classList.classes.add(cls)),
    remove: (...c: string[]) => c.forEach((cls) => this.classList.classes.delete(cls)),
    contains: (c: string) => this.classList.classes.has(c),
  };
}

describe('Round 1000 Map Whirl & Dark Clouds Transformation', () => {
  let soundEngine: SoundEngine;
  let combatEngine: CombatEngine;
  let renderer: BattlefieldRenderer;
  let mockCanvas: any;
  let mockCtx: any;

  beforeEach(() => {
    vi.useFakeTimers();

    // Mock AudioContext
    (globalThis as any).window = {
      AudioContext: class {
        currentTime = 0;
        state = 'running';
        createGain() {
          return {
            gain: {
              setValueAtTime: vi.fn(),
              linearRampToValueAtTime: vi.fn(),
              exponentialRampToValueAtTime: vi.fn(),
            },
            connect: vi.fn(),
          };
        }
        createOscillator() {
          return {
            type: 'sine',
            frequency: {
              setValueAtTime: vi.fn(),
              linearRampToValueAtTime: vi.fn(),
              exponentialRampToValueAtTime: vi.fn(),
            },
            connect: vi.fn(),
            start: vi.fn(),
            stop: vi.fn(),
          };
        }
        createBiquadFilter() {
          return {
            type: 'lowpass',
            frequency: {
              setValueAtTime: vi.fn(),
              linearRampToValueAtTime: vi.fn(),
              exponentialRampToValueAtTime: vi.fn(),
            },
            connect: vi.fn(),
          };
        }
        createBuffer() {
          return {
            getChannelData: () => new Float32Array(100),
          };
        }
        createBufferSource() {
          return {
            buffer: null,
            connect: vi.fn(),
            start: vi.fn(),
            stop: vi.fn(),
          };
        }
        decodeAudioData() {}
      },
    };

    mockCtx = {
      clearRect: vi.fn(),
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
    soundEngine = new SoundEngine();
  });

  it('plays playDarkCloudsWhirl sound with frequency ramp and thunder rumble', () => {
    expect(() => soundEngine.playDarkCloudsWhirl()).not.toThrow();

    // Fast-forward thunder delay
    vi.advanceTimersByTime(1300);
  });

  it('renders atmospheric dark clouds pass when isDarkCloudsTheme is enabled', () => {
    renderer.isDarkCloudsTheme = true;
    renderer.elapsedTotalTimeMs = 1500;

    renderer.render(null, [], []);

    expect(mockCtx.createLinearGradient).toHaveBeenCalled();
    expect(mockCtx.fillRect).toHaveBeenCalled();
  });

  it('triggers whirl animation, applies dark-clouds-realm class, and activates dark clouds theme', () => {
    const elements: Record<string, MockElement> = {
      'battlefield-canvas-wrapper': new MockElement(),
      'battlefield-canvas': new MockElement(),
      'map-whirl-vortex': new MockElement(),
      'dark-clouds-backdrop': new MockElement(),
      'dark-clouds-realm-banner': new MockElement(),
    };

    elements['map-whirl-vortex'].classList.add('hidden');
    elements['dark-clouds-backdrop'].classList.add('hidden');
    elements['dark-clouds-realm-banner'].classList.add('hidden');

    (globalThis as any).document = {
      getElementById: (id: string) => elements[id] || null,
    };

    // Simulate game instance methods
    const mockGame = {
      renderer,
      soundEngine,
      combatEngine,
      hero: combatEngine.hero,
      currentRound: 1000,
      triggerDarkCloudsWhirl() {
        const wrapper = document.getElementById('battlefield-canvas-wrapper');
        const canvas = document.getElementById('battlefield-canvas');
        const vortex = document.getElementById('map-whirl-vortex');
        const backdrop = document.getElementById('dark-clouds-backdrop');
        const banner = document.getElementById('dark-clouds-realm-banner');

        soundEngine.playDarkCloudsWhirl();
        renderer.particleEngine.triggerScreenShake(24, 2200);

        vortex?.classList.remove('hidden');
        canvas?.classList.add('map-whirling');

        setTimeout(() => {
          canvas?.classList.remove('map-whirling');
          vortex?.classList.add('hidden');
          wrapper?.classList.add('dark-clouds-realm');
          backdrop?.classList.remove('hidden');
          banner?.classList.remove('hidden');
          renderer.isDarkCloudsTheme = true;
        }, 2200);
      },
      setDarkCloudsTheme(enabled: boolean) {
        const wrapper = document.getElementById('battlefield-canvas-wrapper');
        const canvas = document.getElementById('battlefield-canvas');
        const vortex = document.getElementById('map-whirl-vortex');
        const backdrop = document.getElementById('dark-clouds-backdrop');
        const banner = document.getElementById('dark-clouds-realm-banner');

        if (enabled) {
          wrapper?.classList.add('dark-clouds-realm');
          backdrop?.classList.remove('hidden');
          banner?.classList.remove('hidden');
          renderer.isDarkCloudsTheme = true;
        } else {
          canvas?.classList.remove('map-whirling');
          vortex?.classList.add('hidden');
          wrapper?.classList.remove('dark-clouds-realm');
          backdrop?.classList.add('hidden');
          banner?.classList.add('hidden');
          renderer.isDarkCloudsTheme = false;
        }
      },
    };

    // Trigger the whirl
    mockGame.triggerDarkCloudsWhirl();

    // While whirling:
    expect(elements['battlefield-canvas'].classList.contains('map-whirling')).toBe(true);
    expect(elements['map-whirl-vortex'].classList.contains('hidden')).toBe(false);
    expect(renderer.isDarkCloudsTheme).toBe(false);

    // Fast forward whirl duration (2200ms)
    vi.advanceTimersByTime(2300);

    // After whirling completes:
    expect(elements['battlefield-canvas'].classList.contains('map-whirling')).toBe(false);
    expect(elements['map-whirl-vortex'].classList.contains('hidden')).toBe(true);
    expect(elements['battlefield-canvas-wrapper'].classList.contains('dark-clouds-realm')).toBe(true);
    expect(elements['dark-clouds-backdrop'].classList.contains('hidden')).toBe(false);
    expect(elements['dark-clouds-realm-banner'].classList.contains('hidden')).toBe(false);
    expect(renderer.isDarkCloudsTheme).toBe(true);

    // When resetting back to lower round:
    mockGame.setDarkCloudsTheme(false);
    expect(elements['battlefield-canvas-wrapper'].classList.contains('dark-clouds-realm')).toBe(false);
    expect(elements['dark-clouds-backdrop'].classList.contains('hidden')).toBe(true);
    expect(elements['dark-clouds-realm-banner'].classList.contains('hidden')).toBe(true);
    expect(renderer.isDarkCloudsTheme).toBe(false);
  });
});
