import { describe, it, expect, beforeEach } from 'vitest';
import { AnimationManager } from '../renderer/AnimationManager';
import { GridCoord } from '../types';

describe('AnimationManager (TDD Red -> Green)', () => {
  let animManager: AnimationManager;

  beforeEach(() => {
    animManager = new AnimationManager();
  });

  it('should queue and interpolate unit movement along path waypoints', () => {
    const path: GridCoord[] = [
      { x: 1, y: 1 },
      { x: 2, y: 1 },
      { x: 3, y: 1 },
    ];

    let completed = false;
    animManager.animateMovement('hero', path, 100, () => {
      completed = true;
    });

    expect(animManager.isUnitMoving('hero')).toBe(true);
    expect(animManager.hasActiveAnimations()).toBe(true);

    // Initial position
    let pos = animManager.getUnitRenderCoord('hero');
    expect(pos).toEqual({ x: 1, y: 1 });

    // Advance 50ms (halfway to (2,1))
    animManager.update(50);
    pos = animManager.getUnitRenderCoord('hero');
    expect(pos?.x).toBeCloseTo(1.5, 1);
    expect(pos?.y).toBe(1);
    expect(completed).toBe(false);

    // Advance 50ms more (at (2,1))
    animManager.update(50);
    pos = animManager.getUnitRenderCoord('hero');
    expect(pos?.x).toBeCloseTo(2.0, 1);

    // Advance 100ms (completed at (3,1))
    animManager.update(100);
    expect(completed).toBe(true);
    expect(animManager.isUnitMoving('hero')).toBe(false);
    expect(animManager.hasActiveAnimations()).toBe(false);
  });

  it('should compute walk cycle state with opposing strides, gait bounce, and arm swings when moving', () => {
    const path: GridCoord[] = [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
    ];
    animManager.animateMovement('mage', path, 200);

    // Initial step
    let state = animManager.getUnitWalkState('mage', 0);
    expect(state.isMoving).toBe(true);
    expect(state.walkPhase).toBe(0);
    expect(state.leftStride).toBeCloseTo(0, 5);
    expect(state.rightStride).toBeCloseTo(0, 5);

    // Advance 50ms (quarter of tile)
    animManager.update(50);
    state = animManager.getUnitWalkState('mage', 50);
    expect(state.isMoving).toBe(true);
    expect(state.walkPhase).toBeGreaterThan(0);
    // Left stride and right stride must be in opposition
    expect(state.leftStride).toBeCloseTo(-state.rightStride, 5);
    // Bob offset should bounce downward
    expect(state.bobOffset).toBeLessThan(0);
    // Arm swing should be non-zero
    expect(Math.abs(state.armSwing)).toBeGreaterThan(0);
  });

  it('should compute subtle breathing idle stance when not moving', () => {
    const idleState1 = animManager.getUnitWalkState('idle-hero', 0);
    expect(idleState1.isMoving).toBe(false);
    expect(idleState1.leftStride).toBe(0);
    expect(idleState1.rightStride).toBe(0);

    const idleState2 = animManager.getUnitWalkState('idle-hero', 500);
    expect(idleState2.isMoving).toBe(false);
    // Subtle breathing bob
    expect(idleState2.bobOffset).not.toBe(idleState1.bobOffset);
  });
});

describe('ParticleEngine & Visual FX (TDD Red -> Green)', () => {
  let particleEngine: import('../renderer/ParticleEngine').ParticleEngine;

  beforeEach(async () => {
    const { ParticleEngine } = await import('../renderer/ParticleEngine');
    particleEngine = new ParticleEngine();
  });

  it('should emit particles, shockwaves, and beams', () => {
    particleEngine.emit(100, 100, '#ff6b35', 10, 2);
    particleEngine.addShockwave(100, 100, '#ff6b35', 50);
    particleEngine.addBeam(0, 0, 100, 100, '#38bdf8', 6, 200);
    particleEngine.addFloatingText('💥 25 DMG', 100, 80, '#ff6b35');

    // Update particles over time
    particleEngine.update(16);
    // Trigger screen shake
    particleEngine.triggerScreenShake(8, 200);
    const shake = particleEngine.getScreenShakeOffset();
    expect(shake).toBeDefined();
  });

  it('should trigger custom elemental death animations with ascending soul and shockwaves', () => {
    const mockUnit: import('../types').Unit = {
      id: 'enemy_fire',
      name: 'Flame Acolyte',
      faction: 'Enemy',
      avatar: '🔥',
      coord: { x: 5, y: 5 },
      stats: {
        maxHp: 50,
        currentHp: 0,
        maxAp: 6,
        currentAp: 0,
        moveCostPerTile: 1,
        elementalAffinity: 'Fire',
      },
      abilities: [],
      statusEffects: [],
      isDead: true,
    };

    particleEngine.triggerDeathAnimation(mockUnit, 200, 200, 'Water');
    expect(particleEngine.deathFlashAlpha).toBeGreaterThan(0);
    expect(particleEngine.deathVignetteAlpha).toBeGreaterThan(0);

    particleEngine.update(16);

    // Should have triggered screen shake
    const shake = particleEngine.getScreenShakeOffset();
    expect(Math.abs(shake.x) + Math.abs(shake.y)).toBeGreaterThanOrEqual(0);
  });

  it('should trigger cataclysmic boss death animation with titan shockwaves and screen flash', () => {
    const mockBoss: import('../types').Unit = {
      id: 'boss_titan',
      name: 'Solar Overlord',
      faction: 'Enemy',
      avatar: '👑',
      coord: { x: 5, y: 5 },
      stats: {
        maxHp: 300,
        currentHp: 0,
        maxAp: 6,
        currentAp: 0,
        moveCostPerTile: 1,
        elementalAffinity: 'Light',
      },
      abilities: [],
      statusEffects: [],
      isDead: true,
      isBoss: true,
    };

    particleEngine.triggerDeathAnimation(mockBoss, 300, 300, 'Darkness');
    particleEngine.update(16);

    const shake = particleEngine.getScreenShakeOffset();
    expect(shake).toBeDefined();
  });

  it('should trigger epic player death animation with screen flash, vignette, radial beams, and ascending celestial soul', () => {
    const mockHero: import('../types').Unit = {
      id: 'hero',
      name: 'Pyromancer',
      faction: 'Player',
      avatar: '🔥',
      coord: { x: 3, y: 3 },
      stats: {
        maxHp: 100,
        currentHp: 0,
        maxAp: 6,
        currentAp: 0,
        moveCostPerTile: 1,
        elementalAffinity: 'Fire',
      },
      abilities: [],
      statusEffects: [],
      isDead: true,
    };

    particleEngine.triggerDeathAnimation(mockHero, 250, 250, 'Water');

    // Should have activated death flash and death vignette
    expect(particleEngine.deathFlashAlpha).toBeGreaterThan(0);
    expect(particleEngine.deathVignetteAlpha).toBeGreaterThan(0);

    // Screen shake should be high intensity
    const shake = particleEngine.getScreenShakeOffset();
    expect(Math.abs(shake.x) + Math.abs(shake.y)).toBeGreaterThanOrEqual(0);

    // Update time
    particleEngine.update(100);
    expect(particleEngine.deathFlashAlpha).toBeLessThan(0.9);
  });
});
