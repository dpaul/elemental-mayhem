// Elemental Mayhem - Elemental Essence Collection Engine
// Directly awakens locked elements upon collecting their essence, with no merging required
import { ElementType, ElementData } from '../types';
import { CORE_ELEMENTS } from '../constants/elements';
import { UnlockManager } from './UnlockManager';

export const ESSENCE_STORAGE_KEY = 'elemental_mayhem_elemental_essences';

export interface EssenceInventoryItem {
  element: ElementType;
  count: number;
  data: ElementData;
  canMerge: boolean;
}

export interface MergeResult {
  success: boolean;
  element: ElementType;
  newlyUnlocked: boolean;
  alreadyHadElement: boolean;
  remainingCount: number;
  message: string;
  elementData?: ElementData;
  masteryBonus?: number;
}

export class EssenceMergeManager {
  private essences: Map<ElementType, number> = new Map();
  private unlockManager: UnlockManager;
  private storageKey: string;
  private onMergeCallback?: (result: MergeResult) => void;
  private onEssenceAddedCallback?: (element: ElementType, added: number, total: number) => void;

  constructor(unlockManager: UnlockManager, storageKey: string = ESSENCE_STORAGE_KEY) {
    this.unlockManager = unlockManager;
    this.storageKey = storageKey;
    this.loadFromStorage();
  }

  private loadFromStorage(): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const stored = window.localStorage.getItem(this.storageKey);
        if (stored) {
          const parsed = JSON.parse(stored) as Record<string, number>;
          Object.entries(parsed).forEach(([elem, count]) => {
            if (typeof count === 'number' && count > 0) {
              this.essences.set(elem as ElementType, count);
            }
          });
        }
      }
    } catch {
      // Fallback for mock environments
    }
  }

  public saveToStorage(): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const obj: Record<string, number> = {};
        this.essences.forEach((cnt, elem) => {
          if (cnt > 0) {
            obj[elem] = cnt;
          }
        });
        window.localStorage.setItem(this.storageKey, JSON.stringify(obj));
      }
    } catch {
      // Fallback for mock environments
    }
  }

  public getEssenceCount(element: ElementType): number {
    return this.essences.get(element) || 0;
  }

  public addEssence(element: ElementType, amount: number = 1): number {
    if (amount <= 0) return this.getEssenceCount(element);
    const current = this.getEssenceCount(element);
    const updated = current + amount;
    this.essences.set(element, updated);
    this.saveToStorage();

    // Directly awaken element if locked (no merging required)
    if (!this.unlockManager.isElementUnlocked(element)) {
      this.unlockManager.unlockElement(element);
    }

    if (this.onEssenceAddedCallback) {
      this.onEssenceAddedCallback(element, amount, updated);
    }
    return updated;
  }

  public setEssenceCount(element: ElementType, count: number): void {
    if (count <= 0) {
      this.essences.delete(element);
    } else {
      this.essences.set(element, count);
    }
    this.saveToStorage();
  }

  /**
   * Merging has been removed. Essences awaken elements directly.
   */
  public canMerge(_element: ElementType): boolean {
    return false;
  }

  public getMergeableEssences(): ElementType[] {
    return [];
  }

  public getAllOwnedEssences(): EssenceInventoryItem[] {
    const items: EssenceInventoryItem[] = [];
    this.essences.forEach((count, element) => {
      if (count > 0 && CORE_ELEMENTS[element]) {
        items.push({
          element,
          count,
          data: CORE_ELEMENTS[element],
          canMerge: false,
        });
      }
    });

    return items.sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count;
      return a.element.localeCompare(b.element);
    });
  }

  /**
   * Directly awakens or empowers an element (merging removed)
   */
  public mergeEssences(element: ElementType): MergeResult {
    const currentCount = this.getEssenceCount(element);
    const data = CORE_ELEMENTS[element];
    const alreadyHad = this.unlockManager.isElementUnlocked(element);
    const unlocked = this.unlockManager.unlockElement(element);

    let message = '';
    let masteryBonus: number | undefined;

    if (!alreadyHad && unlocked) {
      message = `🎉 ELEMENT AWAKENED! Channeled ${element} Essence and permanently unlocked the ${element} element!`;
    } else {
      masteryBonus = 35; // +35% Mastery damage empowerment
      message = `⚡ ELEMENT EMPOWERED! ${element} spells gain +35% Mastery Resonance!`;
    }

    const result: MergeResult = {
      success: true,
      element,
      newlyUnlocked: !alreadyHad && unlocked,
      alreadyHadElement: alreadyHad,
      remainingCount: currentCount,
      message,
      elementData: data,
      masteryBonus,
    };

    if (this.onMergeCallback) {
      this.onMergeCallback(result);
    }

    return result;
  }

  /**
   * Attunes +1 essence of any chosen element at the Round 30 Sanctuary Well
   */
  public attuneEssence(element: ElementType): number {
    return this.addEssence(element, 1);
  }

  public exportState(): Record<string, number> {
    const state: Record<string, number> = {};
    this.essences.forEach((cnt, elem) => {
      state[elem] = cnt;
    });
    return state;
  }

  public importState(state: Record<string, number>): void {
    this.essences.clear();
    Object.entries(state || {}).forEach(([elem, count]) => {
      if (typeof count === 'number' && count > 0) {
        this.essences.set(elem as ElementType, count);
      }
    });
    this.saveToStorage();
  }

  public setOnMerge(cb: (result: MergeResult) => void): void {
    this.onMergeCallback = cb;
  }

  public setOnEssenceAdded(cb: (element: ElementType, added: number, total: number) => void): void {
    this.onEssenceAddedCallback = cb;
  }
}
