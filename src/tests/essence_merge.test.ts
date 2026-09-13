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

  it('should verify merging is disabled: canMerge returns false and getMergeableEssences is empty', () => {
    mergeManager.addEssence('Fire', 2);
    expect(mergeManager.canMerge('Fire')).toBe(false);
    expect(mergeManager.getMergeableEssences().length).toBe(0);
  });

  it('should directly unlock a locked element upon acquiring its essence without merging', () => {
    // Nature is initially locked for a new run
    expect(unlockManager.isElementUnlocked('Nature')).toBe(false);

    // Acquiring 1 essence directly awakens the element immediately!
    mergeManager.addEssence('Nature', 1);
    expect(unlockManager.isElementUnlocked('Nature')).toBe(true);
    expect(mergeManager.getEssenceCount('Nature')).toBe(1);
  });

  it('should empower an element directly and grant mastery resonance', () => {
    // Fire is a starter element and already unlocked
    expect(unlockManager.isElementUnlocked('Fire')).toBe(true);

    mergeManager.addEssence('Fire', 1);
    const result = mergeManager.mergeEssences('Fire');

    expect(result.success).toBe(true);
    expect(result.alreadyHadElement).toBe(true);
    expect(result.masteryBonus).toBe(35);
    expect(result.message).toContain('⚡ ELEMENT EMPOWERED!');
  });

  it('should allow attuning +1 essence at the sanctuary well', () => {
    expect(mergeManager.getEssenceCount('Time')).toBe(0);
    mergeManager.attuneEssence('Time');
    expect(mergeManager.getEssenceCount('Time')).toBe(1);

    mergeManager.attuneEssence('Time');
    expect(mergeManager.getEssenceCount('Time')).toBe(2);
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
