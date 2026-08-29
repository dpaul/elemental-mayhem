import { describe, it, expect } from 'vitest';
import { CORE_ELEMENTS, ALL_42_ELEMENTS, DEFAULT_GRID_SIZE } from '../constants/elements';

describe('Foundation: Core Elements & Configurations', () => {
  it('should have 6 primary playable elements plus neutral', () => {
    const keys = Object.keys(CORE_ELEMENTS);
    expect(keys).toContain('Fire');
    expect(keys).toContain('Water');
    expect(keys).toContain('Lightning');
    expect(keys).toContain('Earth');
    expect(keys).toContain('Poison');
    expect(keys).toContain('Void');
    expect(keys).toContain('Neutral');
  });

  it('should verify all 42 elements are cataloged', () => {
    expect(ALL_42_ELEMENTS.length).toBe(42);
    expect(ALL_42_ELEMENTS[0]).toBe('Sky');
    expect(ALL_42_ELEMENTS[41]).toBe('Crystal');
  });

  it('should have 10x10 default battlefield grid size', () => {
    expect(DEFAULT_GRID_SIZE).toBe(10);
  });

  it('should have valid strong/weak affinities for core elements', () => {
    expect(CORE_ELEMENTS.Water.strongAgainst).toContain('Fire');
    expect(CORE_ELEMENTS.Fire.strongAgainst).toContain('Poison');
    expect(CORE_ELEMENTS.Lightning.strongAgainst).toContain('Water');
    expect(CORE_ELEMENTS.Earth.strongAgainst).toContain('Lightning');
  });
});
