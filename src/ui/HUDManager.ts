// Elemental Mayhem - Glassmorphism Tactical HUD & Action Dock Manager
import { Unit, Ability, GridCoord } from '../types';
import { CORE_ELEMENTS } from '../constants/elements';
import { SpellTooltipManager } from './SpellTooltip';

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
  private heroLevelDisplay: HTMLElement | null = null;
  private essenceProgressLabel: HTMLElement | null = null;
  private heroLevelTierLabel: HTMLElement | null = null;
  private heroEssenceMeterText: HTMLElement | null = null;
  private heroEssenceFill: HTMLElement | null = null;
  private cachedResonanceMultiplier: number = 1;
  private actionBarControls: HTMLElement | null = null;
  private searchInput: HTMLInputElement | null = null;
  private elementFilter: HTMLSelectElement | null = null;
  private countBadge: HTMLElement | null = null;
  private actionBarPrevBtn: HTMLButtonElement | null = null;
  private actionBarNextBtn: HTMLButtonElement | null = null;
  private visibleAbilities: Ability[] = [];
  private searchQuery: string = '';
  private filterElement: string = 'All';
  private onSelectCallback: ((ability: Ability) => void) | null = null;
  private cachedAbilities: Ability[] = [];
  private cachedSelectedId: string | null = null;
  private cachedCurrentAp: number = 0;
  private tooltipManager: SpellTooltipManager;
  private inspectedTargetUnit: Unit | null = null;

  constructor() {
    this.tooltipManager = new SpellTooltipManager();
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
    this.heroLevelDisplay = document.getElementById('hero-level-display');
    this.essenceProgressLabel = document.getElementById('essence-progress-label');
    this.heroLevelTierLabel = document.getElementById('hero-level-tier-label');
    this.heroEssenceMeterText = document.getElementById('hero-essence-meter-text');
    this.heroEssenceFill = document.getElementById('hero-essence-fill');

    this.actionBarControls = document.getElementById('action-bar-controls');
    this.searchInput = document.getElementById('ability-search-input') as HTMLInputElement | null;
    this.elementFilter = document.getElementById('ability-element-filter') as HTMLSelectElement | null;
    this.countBadge = document.getElementById('ability-count-badge');
    this.actionBarPrevBtn = document.getElementById('action-bar-prev-btn') as HTMLButtonElement | null;
    this.actionBarNextBtn = document.getElementById('action-bar-next-btn') as HTMLButtonElement | null;

    if (this.actionBarPrevBtn) {
      this.actionBarPrevBtn.addEventListener('click', () => {
        if (this.actionBar) {
          this.actionBar.scrollBy({ left: -240, behavior: 'smooth' });
          setTimeout(() => this.updateScrollNavButtons(), 250);
        }
      });
    }

    if (this.actionBarNextBtn) {
      this.actionBarNextBtn.addEventListener('click', () => {
        if (this.actionBar) {
          this.actionBar.scrollBy({ left: 240, behavior: 'smooth' });
          setTimeout(() => this.updateScrollNavButtons(), 250);
        }
      });
    }

    // Horizontal wheel scrolling for action bar
    if (this.actionBar) {
      this.actionBar.addEventListener('wheel', (e) => {
        if (e.deltaY !== 0) {
          e.preventDefault();
          this.actionBar.scrollLeft += e.deltaY;
          this.updateScrollNavButtons();
        }
      }, { passive: false });

      this.actionBar.addEventListener('scroll', () => {
        this.updateScrollNavButtons();
      });

      if (typeof window !== 'undefined') {
        window.addEventListener('resize', () => {
          this.updateScrollNavButtons();
        });
      }
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
      this.heroAvatar.innerHTML = `<img src="./portraits/hero_bust.jpg" alt="${hero.name}" class="hud-hero-cutscene-img" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%; display: block;" onerror="this.replaceWith('${hero.avatar}')">`;
    }
    const hpPct = Math.max(0, (hero.stats.currentHp / hero.stats.maxHp) * 100);
    this.heroHpFill.style.width = `${hpPct}%`;
    this.heroHpText.textContent = `${hero.stats.currentHp} / ${hero.stats.maxHp} HP`;
    this.heroApText.textContent = `${hero.stats.currentAp} / ${hero.stats.maxAp} AP`;

    // Render AP pips (capped at 30 pips for sleek high-AP display)
    this.heroApPips.innerHTML = '';
    const maxPips = Math.min(hero.stats.maxAp, 30);
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

  public setElementFilter(element: string): void {
    this.filterElement = element;
    if (this.elementFilter) {
      this.elementFilter.value = element;
    }
    this.reRenderFilteredAbilities();
  }

  public getElementFilter(): string {
    return this.filterElement;
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
      if (this.elementFilter) {
        const uniqueElements = Array.from(new Set(abilities.map((a) => a.element))).sort();
        if (this.elementFilter.options.length <= 1 || this.elementFilter.options.length < uniqueElements.length + 1) {
          const currentVal = this.filterElement;
          this.elementFilter.innerHTML = '<option value="All">🌟 All Elements</option>';
          uniqueElements.forEach((elem) => {
            const opt = document.createElement('option');
            opt.value = elem;
            opt.textContent = `${elem}`;
            this.elementFilter!.appendChild(opt);
          });
          this.elementFilter.value = currentVal;
        }
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
      card.tabIndex = 0;
      card.setAttribute('role', 'button');
      card.setAttribute(
        'aria-label',
        `${ability.name}, ${ability.apCost} AP, ${ability.baseDamage > 0 ? `${ability.baseDamage} damage` : 'support'}`
      );

      const elemData = CORE_ELEMENTS[ability.element];
      if (ability.element === 'Admin') {
        card.classList.add('admin-ability-card');
        card.style.borderColor = isSelected ? '#f472b6' : 'rgba(236, 72, 153, 0.45)';
        if (!isSelected) {
          card.style.boxShadow = '0 0 10px rgba(236, 72, 153, 0.25)';
        }
      } else if (elemData) {
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
        card.onkeydown = (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onSelect(ability);
          }
        };
      }

      // Attach tactical spell hover tooltip
      this.tooltipManager.attach(card, ability, () => ({
        currentAp,
        targetUnit: this.inspectedTargetUnit,
        essenceResonanceMultiplier: this.cachedResonanceMultiplier,
      }));

      this.actionBar.appendChild(card);
    });

    requestAnimationFrame(() => {
      this.updateScrollNavButtons();
    });
  }

  public updateScrollNavButtons(): void {
    if (!this.actionBar) return;
    const { scrollLeft, scrollWidth, clientWidth } = this.actionBar;
    const canScroll = scrollWidth > clientWidth + 4;

    if (this.actionBarPrevBtn) {
      if (canScroll && scrollLeft > 6) {
        this.actionBarPrevBtn.classList.remove('hidden');
        this.actionBarPrevBtn.disabled = false;
      } else {
        this.actionBarPrevBtn.classList.add('hidden');
        this.actionBarPrevBtn.disabled = true;
      }
    }

    if (this.actionBarNextBtn) {
      if (canScroll && scrollLeft + clientWidth < scrollWidth - 6) {
        this.actionBarNextBtn.classList.remove('hidden');
        this.actionBarNextBtn.disabled = false;
      } else {
        this.actionBarNextBtn.classList.add('hidden');
        this.actionBarNextBtn.disabled = true;
      }
    }
  }

  public updatePhaseBanner(phase: string): void {
    this.phaseText.textContent = phase.replace('_', ' ');
    if (phase === 'ENEMY_TURN') {
      this.turnBanner.classList.add('enemy-turn');
    } else {
      this.turnBanner.classList.remove('enemy-turn');
    }
  }

  public updateEndTurnCountdown(secondsRemaining: number | null): void {
    const btn = document.getElementById('end-turn-btn');
    const title = document.getElementById('end-turn-title') || btn?.querySelector('.btn-title');
    const countdownEl = document.getElementById('end-turn-auto-countdown');

    if (secondsRemaining !== null && secondsRemaining >= 0) {
      btn?.classList.add('auto-turn-warning');
      if (title) title.textContent = `END TURN (${secondsRemaining}s)`;
      if (countdownEl) {
        countdownEl.style.display = 'block';
        countdownEl.textContent = `⏳ Auto in ${secondsRemaining}s`;
      }
    } else {
      btn?.classList.remove('auto-turn-warning');
      if (title) title.textContent = 'END TURN';
      if (countdownEl) {
        countdownEl.style.display = 'none';
        countdownEl.textContent = '';
      }
    }
  }

  public updateCurrencies(
    essence: number,
    xp: number,
    round: number,
    maxRounds: number | string = '1,000'
  ): void {
    this.essenceCounter.textContent = `${essence}`;
    this.xpCounter.textContent = `${xp}`;
    const isBoss = round % 5 === 0;
    const maxRoundsStr =
      typeof maxRounds === 'number'
        ? maxRounds.toLocaleString()
        : maxRounds.toString();
    if (isBoss) {
      this.roundIndicator.textContent = `ROUND ${round.toLocaleString()} / ${maxRoundsStr} 👑 BOSS`;
      this.roundIndicator.classList.add('boss-round');
    } else {
      this.roundIndicator.textContent = `ROUND ${round.toLocaleString()} / ${maxRoundsStr}`;
      this.roundIndicator.classList.remove('boss-round');
    }
  }

  public updateHeroLevel(
    level: number,
    title: string,
    currentEssence: number,
    nextLevelEssence: number,
    percentage: number,
    resonanceMultiplier: number
  ): void {
    this.cachedResonanceMultiplier = resonanceMultiplier;
    if (this.heroLevelDisplay) {
      this.heroLevelDisplay.textContent = `${level} (${title})`;
    }
    if (this.essenceProgressLabel) {
      this.essenceProgressLabel.textContent = `(/ ${nextLevelEssence})`;
    }
    if (this.heroLevelTierLabel) {
      const bonusPct = Math.round((resonanceMultiplier - 1) * 100);
      this.heroLevelTierLabel.textContent = `⭐ LV. ${level} • ${title.toUpperCase()} (+${bonusPct}% PWR)`;
    }
    if (this.heroEssenceMeterText) {
      this.heroEssenceMeterText.textContent = `${currentEssence} / ${nextLevelEssence} 🔮`;
    }
    if (this.heroEssenceFill) {
      this.heroEssenceFill.style.width = `${Math.min(100, Math.max(0, percentage))}%`;
    }
  }

  public inspectUnit(unit: Unit | null, coord: GridCoord | null): void {
    this.inspectedTargetUnit = unit;
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

    const archetypeLabel = unit.isZombie
      ? `🧟 Undead Human Champion (${unit.zombieClass || 'Walker'})`
      : unit.isLifeBeing
      ? `🧚 Divine Human Seraph of Life`
      : unit.isBoss
      ? `👑 Ascended CPU Nemesis (${unit.name})`
      : unit.isCPU || unit.faction === 'Enemy'
      ? `🎮 Opposing CPU Player Champion (${unit.championClass || unit.stats.elementalAffinity})`
      : `👤 Human Elemental Champion (${unit.stats.elementalAffinity})`;

    const abilitiesHtml = unit.abilities && unit.abilities.length > 0
      ? `
        <div style="margin-top:4px;">
          <strong>Spell Deck (${unit.abilities.length} Powers):</strong>
          <div style="display:flex; flex-wrap:wrap; gap:3px; margin-top:3px; max-height:85px; overflow-y:auto;">
            ${unit.abilities.slice(0, 10).map((a) => `
              <span class="element-badge" style="background:rgba(255,255,255,0.08); font-size:0.75rem; padding:2px 5px;" title="${a.description}">
                ${a.icon} ${a.name} (${a.apCost} AP)
              </span>
            `).join('')}
          </div>
        </div>
      `
      : '';

    this.targetDetails.innerHTML = `
      <div style="display:flex; flex-direction:column; gap:5px; font-size:0.83rem;">
        <div><strong>Archetype:</strong> ${archetypeLabel}</div>
        <div><strong>Level:</strong> ${unit.level || 1} • <strong>Faction:</strong> ${unit.faction === 'Enemy' ? 'Opposing Player (CPU)' : 'Player'}</div>
        <div><strong>HP:</strong> ${unit.stats.currentHp} / ${unit.stats.maxHp}</div>
        <div><strong>AP:</strong> ${unit.stats.currentAp} / ${unit.stats.maxAp} AP</div>
        <div><strong>Status Effects:</strong> ${statusesHtml}</div>
        ${elem ? `<div><strong>Weak To:</strong> ${elem.weakAgainst.join(', ') || 'None'}</div>` : ''}
        ${abilitiesHtml}
      </div>
    `;
  }

  public setInspectedTargetUnit(unit: Unit | null): void {
    this.inspectedTargetUnit = unit;
  }

  public getInspectedTargetUnit(): Unit | null {
    return this.inspectedTargetUnit;
  }

  public getTooltipManager(): SpellTooltipManager {
    return this.tooltipManager;
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

  public updateCoopAllyStatus(ally: Unit | null): void {
    let allyContainer = document.getElementById('coop-ally-status');
    if (!ally) {
      if (allyContainer) allyContainer.style.display = 'none';
      return;
    }
    if (!allyContainer) {
      allyContainer = document.createElement('div');
      allyContainer.id = 'coop-ally-status';
      allyContainer.className = 'coop-ally-pill glass-card';
      const headerRight = document.querySelector('.header-right');
      if (headerRight) {
        headerRight.insertBefore(allyContainer, headerRight.firstChild);
      }
    }
    allyContainer.style.display = 'flex';
    const hpPct = Math.max(0, Math.round((ally.stats.currentHp / ally.stats.maxHp) * 100));
    const nameLower = (ally.name || '').toLowerCase();
    const portraitSrc = nameLower.includes('magma colossus')
      ? './portraits/magma_colossus.jpg'
      : nameLower.includes('void leviathan')
        ? './portraits/void_leviathan.jpg'
        : './portraits/hero_bust.jpg';
    allyContainer.innerHTML = `
      <div class="ally-avatar" style="width: 38px; height: 38px; border-radius: 50%; overflow: hidden; display: flex; align-items: center; justify-content: center;"><img src="${portraitSrc}" alt="${ally.name}" style="width: 100%; height: 100%; object-fit: cover;" onerror="this.replaceWith('${ally.avatar}')"></div>
      <div class="ally-info">
        <div class="ally-name">${ally.name} ${ally.isDead ? '💀 (FALLEN)' : ''}</div>
        <div class="ally-bars">
          <span class="ally-hp-text">HP ${ally.stats.currentHp}/${ally.stats.maxHp} (${hpPct}%)</span>
          <span class="ally-ap-text">• AP ${ally.stats.currentAp}/${ally.stats.maxAp}</span>
        </div>
      </div>
    `;
  }

  public setActionDockWaiting(isWaiting: boolean, message: string = 'Waiting for ally...'): void {
    let overlay = document.getElementById('action-dock-waiting-overlay');
    const dock = document.querySelector('.action-dock') as HTMLElement | null;
    if (!dock) return;

    if (!isWaiting) {
      if (overlay) overlay.style.display = 'none';
      dock.classList.remove('action-dock-disabled');
      return;
    }

    dock.classList.add('action-dock-disabled');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'action-dock-waiting-overlay';
      overlay.className = 'action-dock-waiting-overlay';
      dock.appendChild(overlay);
    }
    overlay.style.display = 'flex';
    overlay.innerHTML = `
      <div class="waiting-spinner">⏳</div>
      <div class="waiting-text">${message}</div>
    `;
  }
}
