// Elemental Mayhem - Persistent Elemental Unlock & Boss Reward Engine
import { ElementType } from '../types';

const STORAGE_KEY = 'elemental_mayhem_unlocked_elements';
export const DEFAULT_STARTER_ELEMENTS: ElementType[] = ['Fire', 'Water', 'Earth', 'Nature', 'Light'];

export const ALL_42_ELEMENTS: ElementType[] = [
  'Fire', 'Water', 'Lightning', 'Earth', 'Poison', 'Void', 'Love', 'Sky', 'Nature', 'Ice',
  'Metal', 'Darkness', 'Light', 'Electricity', 'Sound', 'Time', 'Death', 'Life', 'Chaos', 'Order',
  'Acid', 'Blood', 'Soul', 'Spirit', 'Energy', 'Force', 'Matter', 'Space', 'Gravity', 'Momentum',
  'Vibration', 'Radiation', 'Magnetism', 'Pressure', 'Heat', 'Cold', 'Wind', 'Storm', 'Thunder', 'Magma',
  'Glass', 'Crystal', 'Undead'
];

export class UnlockManager {
  private unlockedElements: Set<ElementType>;
  private adminOverride: boolean = true; // All powers unlocked!

  constructor() {
    this.unlockedElements = new Set<ElementType>(ALL_42_ELEMENTS);
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

  public isAdminOnly(element: ElementType): boolean {
    return element === 'Wind' || element === 'Undead' || element === 'Neutral';
  }

  public setAdminOverride(active: boolean): void {
    this.adminOverride = active;
    if (active) {
      ALL_42_ELEMENTS.forEach((elem) => this.unlockedElements.add(elem));
      this.saveToStorage();
    }
  }

  public getAdminOverride(): boolean {
    return this.adminOverride;
  }

  public isElementUnlocked(element: ElementType): boolean {
    if (this.adminOverride) {
      return true; // All powers granted to user!
    }
    if (this.isAdminOnly(element)) {
      return false; // Admin exclusive, players are unable to get it
    }
    return this.unlockedElements.has(element);
  }

  public unlockAllElements(includeAdmin: boolean = true): void {
    ALL_42_ELEMENTS.forEach((elem) => this.unlockedElements.add(elem));
    if (includeAdmin) {
      this.adminOverride = true;
    }
    this.saveToStorage();
  }

  public unlockElement(element: ElementType): boolean {
    if (!this.adminOverride && this.isAdminOnly(element)) {
      return false; // Forbidden from player unlock
    }
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
    this.adminOverride = false;
    this.saveToStorage();
  }
}
