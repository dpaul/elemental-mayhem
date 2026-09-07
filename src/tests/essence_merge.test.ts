import { describe, it, expect, beforeEach } from 'vitest';
import { EssenceMergeManager } from '../engine/EssenceMergeManager';
import { UnlockManager } from '../engine/UnlockManager';

describe('EssenceMergeManager', () => {
  let unlockManager: UnlockManager;
  let mergeManager: EssenceMergeManager;

  beforeEach(() => {
    // Clear localStorage for test isolation
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.clear();
    }
    unlockManager = new UnlockManager();
    mergeManager = new EssenceMergeManager(unlockManager, 'test_essence_storage');
  });

  it('should initialize with empty essences', () => {
    expect(mergeManager.getEssenceCount('Fire')).toBe(0);
    expect(mergeManager.getEssenceCount('Void')).toBe(0);
    expect(mergeManager.getAllOwnedEssences().length).toBe(0);
  });

  it('should add essences of any element type', () => {
    mergeManager.addEssence('Fire', 1);
    mergeManager.addEssence('Void', 2);
    mergeManager.addEssence('Ice', 3);

    expect(mergeManager.getEssenceCount('Fire')).toBe(1);
    expect(mergeManager.getEssenceCount('Void')).toBe(2);
    expect(mergeManager.getEssenceCount('Ice')).toBe(3);
    expect(mergeManager.getAllOwnedEssences().length).toBe(3);
  });

  it('should identify when 2 matching essences exist for merging', () => {
    mergeManager.addEssence('Fire', 1);
    expect(mergeManager.canMerge('Fire')).toBe(false);

    mergeManager.addEssence('Fire', 1);
    expect(mergeManager.canMerge('Fire')).toBe(true);
    expect(mergeManager.getMergeableEssences()).toContain('Fire');
  });

  it('should prevent merging when having fewer than 2 essences', () => {
    mergeManager.addEssence('Lightning', 1);
    const result = mergeManager.mergeEssences('Lightning');

    expect(result.success).toBe(false);
    expect(result.remainingCount).toBe(1);
    expect(result.message).toContain('Need 2 Lightning Essences');
  });

  it('should merge 2 matching essences to permanently unlock a locked element', () => {
    // Nature is initially locked for a new run
    expect(unlockManager.isElementUnlocked('Nature')).toBe(false);

    mergeManager.addEssence('Nature', 2);
    expect(mergeManager.canMerge('Nature')).toBe(true);

    const result = mergeManager.mergeEssences('Nature');
    expect(result.success).toBe(true);
    expect(result.newlyUnlocked).toBe(true);
    expect(result.remainingCount).toBe(0);
    expect(unlockManager.isElementUnlocked('Nature')).toBe(true);
    expect(result.message).toContain('🎉 ELEMENT AWAKENED!');
  });

  it('should empower an already unlocked element when merging 2 essences', () => {
    // Fire is a starter element and already unlocked
    expect(unlockManager.isElementUnlocked('Fire')).toBe(true);

    mergeManager.addEssence('Fire', 2);
    const result = mergeManager.mergeEssences('Fire');

    expect(result.success).toBe(true);
    expect(result.alreadyHadElement).toBe(true);
    expect(result.masteryBonus).toBe(35);
    expect(result.message).toContain('⚡ ELEMENT EMPOWERED!');
    expect(result.remainingCount).toBe(0);
  });

  it('should allow attuning +1 essence at the sanctuary well', () => {
    expect(mergeManager.getEssenceCount('Time')).toBe(0);
    mergeManager.attuneEssence('Time');
    expect(mergeManager.getEssenceCount('Time')).toBe(1);

    mergeManager.attuneEssence('Time');
    expect(mergeManager.getEssenceCount('Time')).toBe(2);
    expect(mergeManager.canMerge('Time')).toBe(true);
  });

  it('should export and import state correctly for game saves', () => {
    mergeManager.addEssence('Void', 3);
    mergeManager.addEssence('Crystal', 2);

    const exported = mergeManager.exportState();
    expect(exported['Void']).toBe(3);
    expect(exported['Crystal']).toBe(2);

    const freshManager = new EssenceMergeManager(unlockManager, 'test_fresh');
    freshManager.importState(exported);
    expect(freshManager.getEssenceCount('Void')).toBe(3);
    expect(freshManager.getEssenceCount('Crystal')).toBe(2);
  });
});
