import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { TurnTimer } from '../engine/TurnTimer';
import { TurnManager } from '../engine/TurnManager';
import { Unit } from '../types';

describe('TurnTimer - Automatic 10-Second Turn End When Out of AP', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should initialize with 10 seconds duration by default', () => {
    const timer = new TurnTimer();
    expect(timer.getDurationSeconds()).toBe(10);
    expect(timer.getRemainingSeconds()).toBe(10);
    expect(timer.isActive()).toBe(false);
  });

  it('should start countdown and report initial remaining time via onTick', () => {
    const onTick = vi.fn();
    const onExpire = vi.fn();
    const timer = new TurnTimer({ durationSeconds: 10, onTick, onExpire });

    timer.start();
    expect(timer.isActive()).toBe(true);
    expect(onTick).toHaveBeenCalledWith(10);
    expect(onExpire).not.toHaveBeenCalled();
  });

  it('should tick down every second and expire after 10 seconds', () => {
    const onTick = vi.fn();
    const onExpire = vi.fn();
    const timer = new TurnTimer({ durationSeconds: 10, onTick, onExpire });

    timer.start();

    // Advance 3 seconds
    vi.advanceTimersByTime(3000);
    expect(timer.getRemainingSeconds()).toBe(7);
    expect(onTick).toHaveBeenCalledWith(7);
    expect(timer.isActive()).toBe(true);
    expect(onExpire).not.toHaveBeenCalled();

    // Advance remaining 7 seconds
    vi.advanceTimersByTime(7000);
    expect(timer.getRemainingSeconds()).toBe(10); // reset after stop
    expect(timer.isActive()).toBe(false);
    expect(onExpire).toHaveBeenCalledTimes(1);
  });

  it('should allow stopping/cancelling the countdown before it expires', () => {
    const onTick = vi.fn();
    const onExpire = vi.fn();
    const timer = new TurnTimer({ durationSeconds: 10, onTick, onExpire });

    timer.start();
    vi.advanceTimersByTime(4000);
    expect(timer.isActive()).toBe(true);

    timer.stop();
    expect(timer.isActive()).toBe(false);
    expect(timer.getRemainingSeconds()).toBe(10);

    // Further elapsed time should not trigger expire
    vi.advanceTimersByTime(10000);
    expect(onExpire).not.toHaveBeenCalled();
  });

  it('should support deterministic step testing', () => {
    const onTick = vi.fn();
    const onExpire = vi.fn();
    const timer = new TurnTimer({ durationSeconds: 10, onTick, onExpire });

    timer.start();
    timer.step(2);
    expect(timer.getRemainingSeconds()).toBe(8);
    expect(onTick).toHaveBeenCalledWith(8);

    timer.step(8);
    expect(timer.isActive()).toBe(false);
    expect(onExpire).toHaveBeenCalledTimes(1);
  });

  it('simulates player turn AP depletion and auto-end turn workflow', () => {
    const turnManager = new TurnManager();
    const hero: Unit = {
      id: 'hero_test',
      name: 'Flame Champion',
      avatar: '🔥',
      faction: 'Player',
      coord: { x: 1, y: 1 },
      stats: {
        maxHp: 100,
        currentHp: 100,
        maxAp: 6,
        currentAp: 6,
        moveCostPerTile: 1,
        elementalAffinity: 'Fire',
      },
      abilities: [],
      statusEffects: [],
      isDead: false,
    };

    let turnEnded = false;
    const endTurnAction = vi.fn(() => {
      turnEnded = true;
      turnManager.endPlayerTurn();
    });

    const timer = new TurnTimer({
      durationSeconds: 10,
      onExpire: () => endTurnAction(),
    });

    // Start player turn
    turnManager.startPlayerTurn([hero]);
    expect(turnManager.getPhase()).toBe('PLAYER_TURN');
    expect(hero.stats.currentAp).toBe(6);
    expect(timer.isActive()).toBe(false);

    // Player spends all AP (now out of AP)
    hero.stats.currentAp = 0;

    // Simulation of checkAutoTurnEnd: hero is out of AP during player turn
    if (turnManager.getPhase() === 'PLAYER_TURN' && hero.stats.currentAp <= 0) {
      timer.start();
    }

    expect(timer.isActive()).toBe(true);

    // Advance 10 seconds
    vi.advanceTimersByTime(10000);

    expect(endTurnAction).toHaveBeenCalledTimes(1);
    expect(turnEnded).toBe(true);
    expect(turnManager.getPhase()).toBe('ENEMY_TURN');
  });

  it('cancels countdown if AP is restored before 10 seconds expire', () => {
    const hero: Unit = {
      id: 'hero_test',
      name: 'Flame Champion',
      avatar: '🔥',
      faction: 'Player',
      coord: { x: 1, y: 1 },
      stats: {
        maxHp: 100,
        currentHp: 100,
        maxAp: 6,
        currentAp: 0, // out of AP
        moveCostPerTile: 1,
        elementalAffinity: 'Fire',
      },
      abilities: [],
      statusEffects: [],
      isDead: false,
    };

    const onExpire = vi.fn();
    const timer = new TurnTimer({ durationSeconds: 10, onExpire });
    timer.start();
    expect(timer.isActive()).toBe(true);

    // 4 seconds pass
    vi.advanceTimersByTime(4000);

    // Player receives AP boost (e.g. potion or status effect)
    hero.stats.currentAp = 3;
    if (hero.stats.currentAp > 0) {
      timer.stop();
    }

    expect(timer.isActive()).toBe(false);

    // Remaining time elapses
    vi.advanceTimersByTime(8000);
    expect(onExpire).not.toHaveBeenCalled();
  });
});
