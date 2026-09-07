import { describe, it, expect, beforeEach } from 'vitest';
import {
  HERO_CLASSES,
  registerAdminAbility,
  createAdminPower,
  onAdminAbilityRegistered,
  populateAdminAbilities,
  createHeroForElement,
  isOverpoweredAbility,
  auditAndPromoteOverpoweredAbilities,
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

  it('isOverpoweredAbility should correctly identify overpowered god-tier abilities', () => {
    // 1. Extreme damage >= 60
    expect(isOverpoweredAbility({ baseDamage: 75, apCost: 3, cooldown: 2 })).toBe(true);
    // 2. High damage with large AoE (45+ dmg with AoE 2+)
    expect(isOverpoweredAbility({ baseDamage: 48, aoeRadius: 2, apCost: 3 })).toBe(true);
    // 3. Colossal AoE 3+
    expect(isOverpoweredAbility({ aoeRadius: 3, baseDamage: 25 })).toBe(true);
    // 4. Free 0 AP attacks
    expect(isOverpoweredAbility({ apCost: 0, baseDamage: 20 })).toBe(true);
    // 5. Free 0 AP crowd-control
    expect(isOverpoweredAbility({ apCost: 0, appliesStatus: 'Frozen' })).toBe(true);
    // 6. Spammable 0 CD with 40+ damage
    expect(isOverpoweredAbility({ cooldown: 0, baseDamage: 50, apCost: 2 })).toBe(true);
    // 7. Wall clearing / mass resurrection
    expect(isOverpoweredAbility({ name: 'Mass Resurrection', baseDamage: 0 })).toBe(true);
    // 8. Admin element
    expect(isOverpoweredAbility({ element: 'Admin' })).toBe(true);

    // Normal balanced mortal ability is NOT overpowered
    expect(
      isOverpoweredAbility({
        name: 'Fireball',
        element: 'Fire',
        baseDamage: 28,
        apCost: 2,
        cooldown: 0,
        aoeRadius: 0,
      })
    ).toBe(false);
  });

  it('should automatically set element: Admin when registering an overpowered ability', () => {
    const opPower = registerAdminAbility({
      name: 'Supernova Mega Blast',
      baseDamage: 80, // Overpowered!
      element: 'Fire', // Player tried to assign it to Fire
      aoeRadius: 3,
    });

    expect(opPower.element).toBe('Admin');
    expect(HERO_CLASSES.Admin.abilities.some((a) => a.id === opPower.id)).toBe(true);
  });

  it('auditAndPromoteOverpoweredAbilities should promote OP abilities to Admin kit and balance mortal classes', () => {
    // Inject an overpowered test spell into a mortal class
    HERO_CLASSES.Fire.abilities.push({
      id: 'fire_test_cataclysm_999',
      name: 'Mega Cataclysm Test',
      element: 'Fire',
      icon: '🔥',
      apCost: 4,
      cooldown: 3,
      currentCooldown: 0,
      range: 6,
      aoeRadius: 2,
      targeting: 'SingleUnit',
      baseDamage: 75,
      description: 'Devastating test cataclysm.',
      level: 1,
    });

    const promoted = auditAndPromoteOverpoweredAbilities();
    expect(promoted).toBeGreaterThan(0);

    // Verify it was promoted into Admin kit with Admin element & god stats!
    const adminPower = HERO_CLASSES.Admin.abilities.find(
      (a) => a.id === 'admin_fire_test_cataclysm_999' || a.name.includes('Mega Cataclysm Test')
    );
    expect(adminPower).toBeDefined();
    expect(adminPower?.element).toBe('Admin');
    expect(adminPower?.baseDamage).toBeGreaterThanOrEqual(200);

    // Verify the mortal Fire class spell was calibrated down to fair mortal tier
    const fireSpell = HERO_CLASSES.Fire.abilities.find((a) => a.id === 'fire_test_cataclysm_999');
    expect(fireSpell).toBeDefined();
    expect(fireSpell?.baseDamage).toBeLessThanOrEqual(38);
    expect(fireSpell?.aoeRadius).toBeLessThanOrEqual(1);

    // Clean up
    HERO_CLASSES.Fire.abilities = HERO_CLASSES.Fire.abilities.filter((a) => a.id !== 'fire_test_cataclysm_999');
    HERO_CLASSES.Admin.abilities = HERO_CLASSES.Admin.abilities.filter(
      (a) => a.id !== 'admin_fire_test_cataclysm_999' && !a.name.includes('Mega Cataclysm Test')
    );
  });
});
