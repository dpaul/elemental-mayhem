// Elemental Mayhem - Tactical Spell Hover Tooltip Component
import { Ability, Unit } from '../types';
import { CORE_ELEMENTS } from '../constants/elements';
import { ElementalMatrix } from '../engine/ElementalMatrix';

export interface SpellTooltipContext {
  currentAp?: number;
  targetUnit?: Unit | null;
  casterUnit?: Unit | null;
}

export class SpellTooltipManager {
  private tooltipEl: HTMLElement | null = null;
  private matrix: ElementalMatrix;
  private activeElement: HTMLElement | null = null;
  private boundOnKeyDown: ((e: KeyboardEvent) => void) | null = null;

  constructor(customElement?: HTMLElement | null) {
    this.matrix = new ElementalMatrix();

    if (customElement) {
      this.tooltipEl = customElement;
    } else if (typeof document !== 'undefined') {
      let existing = document.getElementById('spell-tooltip');
      if (!existing) {
        existing = document.createElement('div');
        existing.id = 'spell-tooltip';
        existing.className = 'spell-tooltip hidden';
        existing.setAttribute('role', 'tooltip');
        existing.setAttribute('aria-hidden', 'true');
        document.body.appendChild(existing);
      }
      this.tooltipEl = existing;
    }

    if (typeof window !== 'undefined') {
      this.boundOnKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          this.hide();
        }
      };
      window.addEventListener('keydown', this.boundOnKeyDown);
    }
  }

  public getElement(): HTMLElement | null {
    return this.tooltipEl;
  }

  /**
   * Generates the structured HTML content for an ability
   */
  public generateTooltipHTML(ability: Ability, context?: SpellTooltipContext): string {
    const elemData = CORE_ELEMENTS[ability.element] || {
      name: ability.element,
      color: '#38bdf8',
      glowColor: 'rgba(56, 189, 248, 0.4)',
      icon: '✨',
      description: '',
      strongAgainst: [],
      weakAgainst: [],
    };

    const isSupportOrUtility = ability.baseDamage <= 0;
    const damageDisplay = isSupportOrUtility
      ? `<span class="stat-pill util-pill">🛡️ Support / Utility</span>`
      : `<span class="stat-pill dmg-pill" style="border-color: ${elemData.color}; color: ${elemData.color}">
           💥 ${ability.baseDamage} <small>${ability.element}</small> DMG
         </span>`;

    const apCostDisplay = `<span class="stat-pill ap-pill">⚡ ${ability.apCost} AP</span>`;

    const rangeLabel =
      ability.range === 0
        ? 'Self'
        : ability.range === 1
        ? '1 Tile (Adjacent)'
        : `${ability.range} Tiles`;
    const rangeDisplay = `<span class="stat-pill range-pill">🎯 Range: ${rangeLabel}</span>`;

    let aoeLabel = 'Single Target';
    if (ability.aoeRadius > 0) {
      aoeLabel = `AoE: ${ability.aoeRadius} Tile Radius`;
    } else if (ability.targeting === 'Line') {
      aoeLabel = 'Line Beam';
    } else if (ability.targeting === 'Self') {
      aoeLabel = 'Self Cast';
    }
    const aoeDisplay = `<span class="stat-pill aoe-pill">📐 ${aoeLabel}</span>`;

    const cooldownLabel =
      ability.cooldown === 0
        ? 'Instant (0 CD)'
        : `${ability.cooldown} Turn${ability.cooldown > 1 ? 's' : ''} CD`;
    const cooldownDisplay = `<span class="stat-pill cd-pill">⏱️ ${cooldownLabel}</span>`;

    // Secondary Effects
    const secondaryBadges: string[] = [];
    if (ability.appliesStatus) {
      secondaryBadges.push(
        `<div class="effect-row status-effect">
          <span class="effect-icon">✨</span>
          <span class="effect-text">Applies <strong>${ability.appliesStatus}</strong> (${ability.statusDuration || 1} turns)</span>
        </div>`
      );
    }
    if (ability.createsHazard && ability.createsHazard !== 'None') {
      secondaryBadges.push(
        `<div class="effect-row hazard-effect">
          <span class="effect-icon">🌋</span>
          <span class="effect-text">Spawns <strong>${ability.createsHazard}</strong> terrain (${ability.hazardDuration || 1} turns)</span>
        </div>`
      );
    }

    // Elemental Advantage matrix hints
    const advantages: string[] = [];
    if (elemData.strongAgainst && elemData.strongAgainst.length > 0) {
      advantages.push(
        `<div class="matrix-row strong-row">
          <span class="matrix-label">⚔️ Strong vs (+50%):</span>
          <span class="matrix-elements">${elemData.strongAgainst.join(', ')}</span>
        </div>`
      );
    }
    if (elemData.weakAgainst && elemData.weakAgainst.length > 0) {
      advantages.push(
        `<div class="matrix-row weak-row">
          <span class="matrix-label">🛡️ Weak vs (-25%):</span>
          <span class="matrix-elements">${elemData.weakAgainst.join(', ')}</span>
        </div>`
      );
    }

    // Dynamic Target Calculation (if a target is selected)
    let dynamicTargetSection = '';
    if (context?.targetUnit && !context.targetUnit.isDead && !isSupportOrUtility) {
      const defenderElem = context.targetUnit.stats.elementalAffinity;
      const mult = this.matrix.getAffinityMultiplier(ability.element, defenderElem);
      const calculatedDmg = this.matrix.calculateDamage(ability.baseDamage, ability.element, defenderElem);

      let advantageTag = '';
      if (mult > 1.0) {
        advantageTag = `<span class="target-badge advantage">+50% Advantage!</span>`;
      } else if (mult < 1.0) {
        advantageTag = `<span class="target-badge resisted">-25% Resisted</span>`;
      } else {
        advantageTag = `<span class="target-badge neutral">1.0x Normal</span>`;
      }

      dynamicTargetSection = `
        <div class="tooltip-target-preview">
          <div class="target-preview-header">
            <span>⚔️ vs <strong>${context.targetUnit.name}</strong> (${defenderElem})</span>
            ${advantageTag}
          </div>
          <div class="target-preview-damage">
            Effective Damage: <strong>${calculatedDmg} DMG</strong>
          </div>
        </div>
      `;
    }

    // Warnings: Insufficient AP or On Cooldown
    const warnings: string[] = [];
    if (context?.currentAp !== undefined && context.currentAp < ability.apCost) {
      const missing = ability.apCost - context.currentAp;
      warnings.push(`⚠️ Insufficient AP (Needs ${missing} more AP)`);
    }
    if (ability.currentCooldown > 0) {
      warnings.push(`⏳ On Cooldown (${ability.currentCooldown} turn${ability.currentCooldown > 1 ? 's' : ''} left)`);
    }

    const warningBanner = warnings.length > 0
      ? `<div class="tooltip-warning-banner">${warnings.join(' • ')}</div>`
      : '';

    return `
      <div class="spell-tooltip-inner" style="--tooltip-color: ${elemData.color}; --tooltip-glow: ${elemData.glowColor}">
        <div class="spell-tooltip-header">
          <div class="spell-tooltip-title-group">
            <span class="spell-tooltip-icon">${ability.icon}</span>
            <div>
              <div class="spell-tooltip-name">${ability.name}</div>
              <div class="spell-tooltip-subtitle">
                <span class="element-badge" style="background:${elemData.glowColor}; color:${elemData.color}; font-size:0.75rem; padding: 2px 8px;">
                  ${ability.element}
                </span>
                ${ability.level ? `<span class="spell-level-badge">Tier ${ability.level}</span>` : ''}
              </div>
            </div>
          </div>
        </div>

        <div class="spell-tooltip-stats">
          ${damageDisplay}
          ${apCostDisplay}
          ${rangeDisplay}
          ${aoeDisplay}
          ${cooldownDisplay}
        </div>

        <div class="spell-tooltip-description">
          ${ability.description}
        </div>

        ${secondaryBadges.length > 0 ? `<div class="spell-tooltip-effects">${secondaryBadges.join('')}</div>` : ''}
        ${dynamicTargetSection}
        ${advantages.length > 0 ? `<div class="spell-tooltip-matrix">${advantages.join('')}</div>` : ''}
        ${warningBanner}
      </div>
    `;
  }

  /**
   * Shows the tooltip positioned relative to a trigger element or bounding rectangle
   */
  public show(
    ability: Ability,
    targetRect: DOMRect,
    context?: SpellTooltipContext
  ): void {
    if (!this.tooltipEl) return;

    this.tooltipEl.innerHTML = this.generateTooltipHTML(ability, context);
    this.tooltipEl.classList.remove('hidden');
    this.tooltipEl.setAttribute('aria-hidden', 'false');

    // Make visible temporarily for geometry calculation
    this.tooltipEl.style.visibility = 'hidden';
    this.tooltipEl.style.display = 'block';

    const tooltipWidth = this.tooltipEl.offsetWidth || 340;
    const tooltipHeight = this.tooltipEl.offsetHeight || 240;

    // Center horizontally over target
    let left = targetRect.left + (targetRect.width / 2) - (tooltipWidth / 2);
    // Prefer placing above target
    let top = targetRect.top - tooltipHeight - 12;

    // Viewport clamping
    const padding = 12;
    const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : 1200;
    const viewportHeight = typeof window !== 'undefined' ? window.innerHeight : 800;

    // If overflowing top of screen, place below target
    if (top < padding) {
      top = targetRect.bottom + 12;
      // If it still overflows bottom, clamp to bottom
      if (top + tooltipHeight > viewportHeight - padding) {
        top = Math.max(padding, viewportHeight - tooltipHeight - padding);
      }
    }

    // Clamp horizontal
    if (left < padding) {
      left = padding;
    } else if (left + tooltipWidth > viewportWidth - padding) {
      left = viewportWidth - tooltipWidth - padding;
    }

    this.tooltipEl.style.left = `${Math.round(left)}px`;
    this.tooltipEl.style.top = `${Math.round(top)}px`;
    this.tooltipEl.style.visibility = 'visible';
  }

  /**
   * Hides the tooltip
   */
  public hide(): void {
    if (this.tooltipEl) {
      this.tooltipEl.classList.add('hidden');
      this.tooltipEl.setAttribute('aria-hidden', 'true');
      this.tooltipEl.style.display = 'none';
    }
    this.activeElement = null;
  }

  /**
   * Attaches hover and focus event listeners to a DOM element for a given ability
   */
  public attach(
    element: HTMLElement,
    ability: Ability,
    getContext?: () => SpellTooltipContext
  ): void {
    element.addEventListener('mouseenter', () => {
      this.activeElement = element;
      const rect = element.getBoundingClientRect();
      const ctx = getContext ? getContext() : undefined;
      this.show(ability, rect, ctx);
    });

    element.addEventListener('mouseleave', () => {
      if (this.activeElement === element) {
        this.hide();
      }
    });

    element.addEventListener('focus', () => {
      this.activeElement = element;
      const rect = element.getBoundingClientRect();
      const ctx = getContext ? getContext() : undefined;
      this.show(ability, rect, ctx);
    });

    element.addEventListener('blur', () => {
      if (this.activeElement === element) {
        this.hide();
      }
    });
  }

  public destroy(): void {
    if (this.boundOnKeyDown && typeof window !== 'undefined') {
      window.removeEventListener('keydown', this.boundOnKeyDown);
    }
    if (this.tooltipEl && this.tooltipEl.parentElement) {
      this.tooltipEl.parentElement.removeChild(this.tooltipEl);
    }
  }
}
