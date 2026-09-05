// Elemental Mayhem - Glassmorphism Tactical HUD & Action Dock Manager
import { Unit, Ability, GridCoord } from '../types';
import { CORE_ELEMENTS } from '../constants/elements';

export class HUDManager {
  private heroAvatar: HTMLElement | null;
  private heroHpFill: HTMLElement;
  private heroHpText: HTMLElement;
  private heroApPips: HTMLElement;
  private heroApText: HTMLElement;
  private actionBar: HTMLElement;
  private turnBanner: HTMLElement;
  private phaseText: HTMLElement;
  private targetName: HTMLElement;
  private targetBadge: HTMLElement;
  private targetDetails: HTMLElement;
  private combatLogList: HTMLElement;
  private essenceCounter: HTMLElement;
  private xpCounter: HTMLElement;
  private roundIndicator: HTMLElement;

  constructor() {
    this.heroAvatar = document.getElementById('hero-avatar-icon');
    this.heroHpFill = document.getElementById('hero-hp-fill')!;
    this.heroHpText = document.getElementById('hero-hp-text')!;
    this.heroApPips = document.getElementById('hero-ap-pips')!;
    this.heroApText = document.getElementById('hero-ap-text')!;
    this.actionBar = document.getElementById('ability-action-bar')!;
    this.turnBanner = document.getElementById('turn-banner')!;
    this.phaseText = document.getElementById('phase-text')!;
    this.targetName = document.getElementById('target-name')!;
    this.targetBadge = document.getElementById('target-element-badge')!;
    this.targetDetails = document.getElementById('target-details')!;
    this.combatLogList = document.getElementById('combat-log-list')!;
    this.essenceCounter = document.getElementById('essence-counter')!;
    this.xpCounter = document.getElementById('xp-counter')!;
    this.roundIndicator = document.getElementById('round-indicator')!;
  }

  public updateHeroStatus(hero: Unit): void {
    if (this.heroAvatar) {
      this.heroAvatar.textContent = hero.avatar;
    }
    const hpPct = Math.max(0, (hero.stats.currentHp / hero.stats.maxHp) * 100);
    this.heroHpFill.style.width = `${hpPct}%`;
    this.heroHpText.textContent = `${hero.stats.currentHp} / ${hero.stats.maxHp} HP`;
    this.heroApText.textContent = `${hero.stats.currentAp} / ${hero.stats.maxAp} AP`;

    // Render AP pips
    this.heroApPips.innerHTML = '';
    for (let i = 0; i < hero.stats.maxAp; i++) {
      const pip = document.createElement('span');
      pip.className = `ap-pip ${i < hero.stats.currentAp ? 'filled' : ''}`;
      this.heroApPips.appendChild(pip);
    }
  }

  public renderAbilities(
    abilities: Ability[],
    selectedAbilityId: string | null,
    currentAp: number,
    onSelect: (ability: Ability) => void
  ): void {
    this.actionBar.innerHTML = '';

    abilities.forEach((ability, idx) => {
      const card = document.createElement('div');
      const isSelected = ability.id === selectedAbilityId;
      const isDisabled = ability.apCost > currentAp || ability.currentCooldown > 0;

      card.className = `ability-card ${isSelected ? 'selected' : ''} ${isDisabled ? 'disabled' : ''}`;

      const elemData = CORE_ELEMENTS[ability.element];
      if (elemData) {
        card.style.borderColor = isSelected ? elemData.color : 'rgba(255, 255, 255, 0.08)';
      }

      const hotkeyLabel = idx === 9 ? '0' : `${idx + 1}`;
      card.innerHTML = `
        <span class="ability-hotkey">[${hotkeyLabel}]</span>
        <span class="ability-ap">${ability.apCost} AP</span>
        <span class="ability-icon">${ability.icon}</span>
        <span class="ability-name">${ability.name}</span>
      `;

      if (!isDisabled) {
        card.onclick = () => onSelect(ability);
      }

      this.actionBar.appendChild(card);
    });
  }

  public updatePhaseBanner(phase: string): void {
    this.phaseText.textContent = phase.replace('_', ' ');
    if (phase === 'ENEMY_TURN') {
      this.turnBanner.classList.add('enemy-turn');
    } else {
      this.turnBanner.classList.remove('enemy-turn');
    }
  }

  public updateCurrencies(
    essence: number,
    xp: number,
    round: number,
    maxRounds: number | string = '10000000000000000000000000000000000000000000000000'
  ): void {
    this.essenceCounter.textContent = `${essence}`;
    this.xpCounter.textContent = `${xp}`;
    const isBoss = round % 5 === 0;
    const maxRoundsStr =
      typeof maxRounds === 'number' && maxRounds > 1e15
        ? '10000000000000000000000000000000000000000000000000'
        : maxRounds.toString();
    if (isBoss) {
      this.roundIndicator.textContent = `ROUND ${round.toLocaleString()} / ${maxRoundsStr} 👑 BOSS`;
      this.roundIndicator.classList.add('boss-round');
    } else {
      this.roundIndicator.textContent = `ROUND ${round.toLocaleString()} / ${maxRoundsStr}`;
      this.roundIndicator.classList.remove('boss-round');
    }
  }

  public inspectUnit(unit: Unit | null, coord: GridCoord | null): void {
    if (!unit) {
      if (coord) {
        this.targetName.textContent = `Tile (${coord.x}, ${coord.y})`;
        this.targetBadge.textContent = 'Empty Ground';
        this.targetBadge.style.backgroundColor = 'rgba(255,255,255,0.05)';
        this.targetDetails.innerHTML = `<p class="placeholder-text">Open battlefield ground.</p>`;
      } else {
        this.targetName.textContent = 'No Target Selected';
        this.targetBadge.textContent = 'Neutral';
        this.targetDetails.innerHTML = `<p class="placeholder-text">Hover or click any tile or unit on the grid to inspect details and previews.</p>`;
      }
      return;
    }

    this.targetName.textContent = unit.name;
    this.targetBadge.textContent = unit.stats.elementalAffinity;
    const elem = CORE_ELEMENTS[unit.stats.elementalAffinity];
    if (elem) {
      this.targetBadge.style.backgroundColor = elem.glowColor;
      this.targetBadge.style.color = elem.color;
    }

    const statusesHtml = unit.statusEffects.length > 0
      ? unit.statusEffects.map((s) => `<span class="element-badge" style="background:rgba(254,240,138,0.2);color:#fef08a">${s.type} (${s.duration}t)</span>`).join(' ')
      : '<span class="placeholder-text">None</span>';

    this.targetDetails.innerHTML = `
      <div style="display:flex; flex-direction:column; gap:6px; font-size:0.85rem;">
        <div><strong>HP:</strong> ${unit.stats.currentHp} / ${unit.stats.maxHp}</div>
        <div><strong>AP:</strong> ${unit.stats.currentAp} / ${unit.stats.maxAp}</div>
        <div><strong>Faction:</strong> ${unit.faction}</div>
        <div><strong>Status Effects:</strong> ${statusesHtml}</div>
        ${elem ? `<div><strong>Weak To:</strong> ${elem.weakAgainst.join(', ') || 'None'}</div>` : ''}
      </div>
    `;
  }

  public updateCombatLog(logs: { id: string; type: string; message: string }[]): void {
    this.combatLogList.innerHTML = '';
    logs.slice(0, 30).forEach((entry) => {
      const row = document.createElement('div');
      row.className = `log-entry log-${entry.type}`;
      row.textContent = entry.message;
      this.combatLogList.appendChild(row);
    });
  }
}
