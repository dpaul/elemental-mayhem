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
  private actionBarControls: HTMLElement | null = null;
  private searchInput: HTMLInputElement | null = null;
  private elementFilter: HTMLSelectElement | null = null;
  private countBadge: HTMLElement | null = null;
  private visibleAbilities: Ability[] = [];
  private searchQuery: string = '';
  private filterElement: string = 'All';
  private onSelectCallback: ((ability: Ability) => void) | null = null;
  private cachedAbilities: Ability[] = [];
  private cachedSelectedId: string | null = null;
  private cachedCurrentAp: number = 0;

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

    this.actionBarControls = document.getElementById('action-bar-controls');
    this.searchInput = document.getElementById('ability-search-input') as HTMLInputElement | null;
    this.elementFilter = document.getElementById('ability-element-filter') as HTMLSelectElement | null;
    this.countBadge = document.getElementById('ability-count-badge');

    // Horizontal wheel scrolling for action bar
    if (this.actionBar) {
      this.actionBar.addEventListener('wheel', (e) => {
        if (e.deltaY !== 0) {
          e.preventDefault();
          this.actionBar.scrollLeft += e.deltaY;
        }
      }, { passive: false });
    }

    // Search and filter input handlers
    this.searchInput?.addEventListener('input', () => {
      this.searchQuery = (this.searchInput?.value || '').trim().toLowerCase();
      this.reRenderFilteredAbilities();
    });

    this.elementFilter?.addEventListener('change', () => {
      this.filterElement = this.elementFilter?.value || 'All';
      this.reRenderFilteredAbilities();
    });
  }

  public updateHeroStatus(hero: Unit): void {
    if (this.heroAvatar) {
      this.heroAvatar.textContent = hero.avatar;
    }
    const hpPct = Math.max(0, (hero.stats.currentHp / hero.stats.maxHp) * 100);
    this.heroHpFill.style.width = `${hpPct}%`;
    this.heroHpText.textContent = `${hero.stats.currentHp} / ${hero.stats.maxHp} HP`;
    this.heroApText.textContent = `${hero.stats.currentAp} / ${hero.stats.maxAp} AP`;

    // Render AP pips (capped at 20 pips for sleek high-AP display)
    this.heroApPips.innerHTML = '';
    const maxPips = Math.min(hero.stats.maxAp, 20);
    const filledRatio = hero.stats.maxAp > 0 ? hero.stats.currentAp / hero.stats.maxAp : 0;
    const filledCount = Math.round(filledRatio * maxPips);
    for (let i = 0; i < maxPips; i++) {
      const pip = document.createElement('span');
      pip.className = `ap-pip ${i < filledCount ? 'filled' : ''}`;
      this.heroApPips.appendChild(pip);
    }
  }

  public getVisibleAbility(idx: number): Ability | undefined {
    return this.visibleAbilities[idx];
  }

  private reRenderFilteredAbilities(): void {
    if (this.onSelectCallback) {
      this.renderAbilities(
        this.cachedAbilities,
        this.cachedSelectedId,
        this.cachedCurrentAp,
        this.onSelectCallback
      );
    }
  }

  public renderAbilities(
    abilities: Ability[],
    selectedAbilityId: string | null,
    currentAp: number,
    onSelect: (ability: Ability) => void
  ): void {
    this.cachedAbilities = abilities;
    this.cachedSelectedId = selectedAbilityId;
    this.cachedCurrentAp = currentAp;
    this.onSelectCallback = onSelect;

    this.actionBar.innerHTML = '';

    const hasLargeKit = abilities.length > 10;
    if (this.actionBarControls) {
      this.actionBarControls.style.display = hasLargeKit ? 'flex' : 'none';
    }

    if (hasLargeKit) {
      this.actionBar.classList.add('scrolling-mode');
      // Populate unique elements if filter exists
      if (this.elementFilter && this.elementFilter.options.length <= 1) {
        const uniqueElements = Array.from(new Set(abilities.map((a) => a.element))).sort();
        this.elementFilter.innerHTML = '<option value="All">🌟 All Elements</option>';
        uniqueElements.forEach((elem) => {
          const opt = document.createElement('option');
          opt.value = elem;
          opt.textContent = `${elem}`;
          this.elementFilter!.appendChild(opt);
        });
      }
    } else {
      this.actionBar.classList.remove('scrolling-mode');
    }

    let filtered = abilities;
    if (hasLargeKit) {
      if (this.filterElement !== 'All') {
        filtered = filtered.filter((a) => a.element === this.filterElement);
      }
      if (this.searchQuery) {
        filtered = filtered.filter(
          (a) =>
            a.name.toLowerCase().includes(this.searchQuery) ||
            a.description.toLowerCase().includes(this.searchQuery) ||
            a.element.toLowerCase().includes(this.searchQuery) ||
            (a.appliesStatus && a.appliesStatus.toLowerCase().includes(this.searchQuery))
        );
      }
    }

    this.visibleAbilities = filtered;

    if (this.countBadge) {
      this.countBadge.textContent = `${filtered.length} / ${abilities.length} Powers`;
    }

    // Limit DOM rendering to at most 100 abilities at once for instant performance
    const renderList = filtered.slice(0, 100);

    renderList.forEach((ability, idx) => {
      const card = document.createElement('div');
      const isSelected = ability.id === selectedAbilityId;
      const isDisabled = ability.apCost > currentAp || ability.currentCooldown > 0;

      card.className = `ability-card ${isSelected ? 'selected' : ''} ${isDisabled ? 'disabled' : ''}`;

      const elemData = CORE_ELEMENTS[ability.element];
      if (elemData) {
        card.style.borderColor = isSelected ? elemData.color : 'rgba(255, 255, 255, 0.08)';
      }

      const hotkeyLabel = idx < 10 ? (idx === 9 ? '0' : `${idx + 1}`) : '';
      const hotkeyHtml = hotkeyLabel ? `<span class="ability-hotkey">[${hotkeyLabel}]</span>` : '';

      card.innerHTML = `
        ${hotkeyHtml}
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
