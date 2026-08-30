// Elemental Mayhem - Persistent Elemental Unlock & Boss Reward Engine
import { ElementType } from '../types';

const STORAGE_KEY = 'elemental_mayhem_unlocked_elements';
export const DEFAULT_STARTER_ELEMENTS: ElementType[] = ['Fire', 'Water', 'Earth', 'Wind', 'Nature', 'Light'];

export class UnlockManager {
  private unlockedElements: Set<ElementType>;

  constructor() {
    this.unlockedElements = new Set<ElementType>(DEFAULT_STARTER_ELEMENTS);
    this.loadFromStorage();
  }

  private loadFromStorage(): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const stored = window.localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored) as ElementType[];
          parsed.forEach((elem) => this.unlockedElements.add(elem));
        }
      }
    } catch {
      // Storage unavailable or disabled, continue with in-memory set
    }
  }

  private saveToStorage(): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const array = Array.from(this.unlockedElements);
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(array));
      }
    } catch {
      // Storage unavailable or disabled
    }
  }

  public getUnlockedElements(): ElementType[] {
    return Array.from(this.unlockedElements);
  }

  public isElementUnlocked(element: ElementType): boolean {
    return this.unlockedElements.has(element);
  }

  public unlockElement(element: ElementType): boolean {
    if (this.unlockedElements.has(element)) {
      return false; // Already unlocked
    }
    this.unlockedElements.add(element);
    this.saveToStorage();
    return true;
  }

  public checkBossDefeatUnlocks(round: number): ElementType[] {
    const newlyUnlocked: ElementType[] = [];

    if (round === 5) {
      const tier1: ElementType[] = ['Ice', 'Magma', 'Crystal', 'Poison', 'Acid', 'Sky', 'Heat', 'Cold'];
      tier1.forEach((elem) => {
        if (this.unlockElement(elem)) newlyUnlocked.push(elem);
      });
    } else if (round === 10) {
      const tier2: ElementType[] = [
        'Lightning', 'Thunder', 'Storm', 'Metal', 'Magnetism', 'Sound',
        'Force', 'Energy', 'Electricity', 'Pressure', 'Vibration',
        'Radiation', 'Momentum', 'Glass', 'Matter'
      ];
      tier2.forEach((elem) => {
        if (this.unlockElement(elem)) newlyUnlocked.push(elem);
      });
    } else if (round === 15) {
      const tier3: ElementType[] = [
        'Void', 'Darkness', 'Chaos', 'Time', 'Space', 'Death',
        'Life', 'Love', 'Blood', 'Soul', 'Spirit', 'Order', 'Gravity'
      ];
      tier3.forEach((elem) => {
        if (this.unlockElement(elem)) newlyUnlocked.push(elem);
      });
    }

    return newlyUnlocked;
  }

  public resetUnlocks(): void {
    this.unlockedElements = new Set<ElementType>(DEFAULT_STARTER_ELEMENTS);
    this.saveToStorage();
  }
}
