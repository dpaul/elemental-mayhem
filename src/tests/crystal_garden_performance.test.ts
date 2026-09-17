// Elemental Mayhem - Crystal Garden & Relic Forge Performance & Lifecycle Test Suite
import { describe, it, expect, beforeEach } from 'vitest';
import { CrystalGardenUI } from '../ui/CrystalGardenUI';
import { CrystalGardenManager } from '../engine/CrystalManager';
import { SoundEngine } from '../audio/SoundEngine';

class MockClassList {
  private classes = new Set<string>();

  constructor(initial: string[] = []) {
    initial.forEach((c) => this.classes.add(c));
  }

  public add(cls: string): void {
    this.classes.add(cls);
  }

  public remove(cls: string): void {
    this.classes.delete(cls);
  }

  public toggle(cls: string, force?: boolean): boolean {
    if (force !== undefined) {
      if (force) this.classes.add(cls);
      else this.classes.delete(cls);
      return force;
    }
    if (this.classes.has(cls)) {
      this.classes.delete(cls);
      return false;
    } else {
      this.classes.add(cls);
      return true;
    }
  }

  public contains(cls: string): boolean {
    return this.classes.has(cls);
  }
}

class MockHTMLElement {
  public id = '';
  public className = '';
  public textContent = '';
  private _innerHTML = '';
  public style: Record<string, string> = {};
  public classList: MockClassList;
  public children: MockHTMLElement[] = [];
  public parentElement: MockHTMLElement | null = null;

  public get innerHTML(): string {
    return this._innerHTML;
  }
  public set innerHTML(val: string) {
    this._innerHTML = val;
    if (val === '') {
      this.children = [];
    }
  }

  constructor(id: string = '', initialClasses: string[] = []) {
    this.id = id;
    this.classList = new MockClassList(initialClasses);
  }

  public addEventListener(): void {}

  public appendChild(child: MockHTMLElement): MockHTMLElement {
    child.parentElement = this;
    this.children.push(child);
    return child;
  }

  public querySelector(): MockHTMLElement | null {
    return new MockHTMLElement();
  }
}

describe('Crystal Garden & Relic Forge Performance Optimizations', () => {
  let mockStore: Record<string, MockHTMLElement>;
  let gardenManager: CrystalGardenManager;
  let soundEngine: SoundEngine;
  let gardenUI: CrystalGardenUI;
  let modalEl: MockHTMLElement;
  let plotsGrid: MockHTMLElement;
  let recipesGrid: MockHTMLElement;

  beforeEach(() => {
    mockStore = {};

    function getMock(id: string, initialClasses: string[] = []): MockHTMLElement {
      if (!mockStore[id]) {
        mockStore[id] = new MockHTMLElement(id, initialClasses);
      }
      return mockStore[id];
    }

    modalEl = getMock('crystal-garden-modal', ['modal-overlay', 'hidden']);
    getMock('garden-seed-selector-modal', ['modal-overlay', 'hidden']);
    getMock('close-garden-modal-btn');
    getMock('close-seed-selector-btn');
    getMock('garden-tab-garden-btn');
    getMock('garden-tab-forge-btn');
    getMock('garden-tab-shop-btn');
    getMock('garden-essence-counter');
    getMock('garden-elixir-counter');
    getMock('garden-plant-food-counter');
    getMock('garden-inventory-chips');
    plotsGrid = getMock('garden-plots-grid');
    getMock('garden-view-plots');
    recipesGrid = getMock('garden-recipes-grid');
    getMock('garden-view-forge');
    getMock('shop-seeds-grid');
    getMock('shop-supplies-grid');
    getMock('shop-sell-grid');
    getMock('garden-view-shop');

    (globalThis as any).document = {
      getElementById: (id: string) => mockStore[id] || getMock(id),
      createElement: () => new MockHTMLElement(),
    };

    gardenManager = new CrystalGardenManager();
    soundEngine = new SoundEngine();

    gardenUI = new CrystalGardenUI(gardenManager, soundEngine, {
      getEssence: () => 100,
      deductEssence: () => true,
      addEssence: () => {},
      getHero: () => null,
    });
  });

  it('should be closed by default and report isOpen() false', () => {
    expect(gardenUI.isOpen()).toBe(false);
  });

  it('should skip DOM rendering and avoid DOM thrashing when modal is closed', () => {
    expect(plotsGrid.children.length).toBe(0);

    // Calling render() while closed must return early without appending elements
    gardenUI.render();
    expect(plotsGrid.children.length).toBe(0);
    expect(recipesGrid.children.length).toBe(0);
  });

  it('should populate DOM only after open() is called', () => {
    expect(plotsGrid.children.length).toBe(0);

    gardenUI.open('plots');
    expect(gardenUI.isOpen()).toBe(true);
    expect(modalEl.classList.contains('hidden')).toBe(false);

    // Plots should now be populated
    expect(plotsGrid.children.length).toBe(gardenManager.getPlots().length);
  });

  it('should switch tabs and populate the forge view when open', () => {
    gardenUI.open('forge');
    expect(gardenUI.isOpen()).toBe(true);

    // Forge banner + recipe cards should be populated
    expect(recipesGrid.children.length).toBeGreaterThan(0);
  });

  it('should update isOpen to false and prevent further DOM rendering on close()', () => {
    gardenUI.open('plots');
    expect(gardenUI.isOpen()).toBe(true);

    gardenUI.close();
    expect(gardenUI.isOpen()).toBe(false);
    expect(modalEl.classList.contains('hidden')).toBe(true);

    // Clear children and verify render() does not recreate them while closed
    plotsGrid.children = [];
    gardenUI.render();
    expect(plotsGrid.children.length).toBe(0);
  });
});
