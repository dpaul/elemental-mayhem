import { describe, it, expect, beforeEach } from 'vitest';
import {
  HERO_CLASSES,
  registerAdminAbility,
  createAdminPower,
  onAdminAbilityRegistered,
  populateAdminAbilities,
  createHeroForElement,
} from '../constants/classes';
import { UnlockManager } from '../engine/UnlockManager';
import { AdminManager } from '../engine/AdminManager';
import { Ability, Unit } from '../types';

describe('Admin Powers & Dynamic Ability Acquisition (Instantly Get New Admin Powers)', () => {
  let unlockManager: UnlockManager;
  let adminManager: AdminManager;

  beforeEach(() => {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.clear();
    }
    unlockManager = new UnlockManager();
    adminManager = new AdminManager();
  });

  it('should allow Admin element to be unlocked when adminOverride is active', () => {
    // By default without admin, Admin element is locked
    expect(unlockManager.isElementUnlocked('Admin')).toBe(false);

    // When adminOverride is active, Admin element and all powers are unlocked!
    unlockManager.setAdminOverride(true);
    expect(unlockManager.isElementUnlocked('Admin')).toBe(true);
    expect(unlockManager.isElementUnlocked('Earth')).toBe(true);
    expect(unlockManager.isElementUnlocked('Fire')).toBe(true);
    expect(unlockManager.isElementUnlocked('Water')).toBe(true);
    expect(unlockManager.isElementUnlocked('Void')).toBe(true);
    expect(unlockManager.isElementUnlocked('Undead')).toBe(true);
  });

  it('should grant admin via AdminManager.grantAdmin()', () => {
    expect(adminManager.isAuthenticated()).toBe(false);
    adminManager.grantAdmin();
    expect(adminManager.isAuthenticated()).toBe(true);
  });

  it('should register a new admin ability into HERO_CLASSES.Admin.abilities', () => {
    const customPower: Ability = {
      id: 'admin_test_singularity_blast',
      name: 'Singularity Blast',
      element: 'Admin',
      icon: '🌌',
      apCost: 1,
      cooldown: 0,
      currentCooldown: 0,
      range: 8,
      aoeRadius: 2,
      targeting: 'SingleUnit',
      baseDamage: 750,
      description: 'Collapses space-time around target.',
      level: 1,
    };

    registerAdminAbility(customPower);

    const found = HERO_CLASSES.Admin.abilities.find((a) => a.id === customPower.id);
    expect(found).toBeDefined();
    expect(found?.name).toBe('Singularity Blast');
    expect(found?.baseDamage).toBe(750);
  });

  it('should create and register an admin power with createAdminPower helper', () => {
    const created = createAdminPower('Absolute Genesis', 888, 6, 3, 'Creates new matter from nothing.');
    expect(created.name).toBe('Absolute Genesis');
    expect(created.baseDamage).toBe(888);
    expect(created.element).toBe('Admin');
    expect(created.range).toBe(6);
    expect(created.aoeRadius).toBe(3);

    const inAdminKit = HERO_CLASSES.Admin.abilities.find((a) => a.id === created.id);
    expect(inAdminKit).toBeDefined();
  });

  it('should notify onAdminAbilityRegistered listeners so active hero instantly acquires new admin powers', () => {
    const hero: Unit = createHeroForElement('Admin');
    const initialAbilityCount = hero.abilities.length;

    // Simulate main.ts live subscription
    const unsubscribe = onAdminAbilityRegistered((newAbility) => {
      hero.abilities.unshift({ ...newAbility, currentCooldown: 0 });
    });

    // Creator crafts a brand new admin power
    const newPower = createAdminPower('Hyper Banhammer', 9999, 9, 4);

    // Verify hero instantly receives it!
    expect(hero.abilities.length).toBe(initialAbilityCount + 1);
    expect(hero.abilities[0].id).toBe(newPower.id);
    expect(hero.abilities[0].name).toBe('Hyper Banhammer');
    expect(hero.abilities[0].baseDamage).toBe(9999);

    unsubscribe();
  });

  it('should ensure populateAdminAbilities includes all powers across all elements in Admin kit', () => {
    populateAdminAbilities();
    const adminAbilities = HERO_CLASSES.Admin.abilities;

    // Fire spells
    expect(adminAbilities.some((a) => a.id === 'fireball')).toBe(true);
    // Water spells
    expect(adminAbilities.some((a) => a.id === 'water_whip')).toBe(true);
    // Earth spells
    expect(adminAbilities.some((a) => a.id === 'boulder_toss')).toBe(true);
    // Void spells
    expect(adminAbilities.some((a) => a.id === 'void_strike')).toBe(true);
    // Dedicated admin spells
    expect(adminAbilities.some((a) => a.id === 'admin_ban_hammer')).toBe(true);
  });
});
