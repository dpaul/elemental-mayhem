// Elemental Mayhem - Round 30 Elemental Essence Fusion Modal UI
// Interactive sanctuary altar allowing players to merge 2 matching essences to awaken elements
import { ElementType } from '../types';
import { CORE_ELEMENTS } from '../constants/elements';
import { EssenceMergeManager, MergeResult } from '../engine/EssenceMergeManager';
import { SoundEngine } from '../audio/SoundEngine';

export class EssenceFusionModal {
  private mergeManager: EssenceMergeManager;
  private soundEngine: SoundEngine;
  private modalEl: HTMLElement | null = null;
  private selectedElement: ElementType | null = null;
  public onMergeSuccess?: (result: MergeResult) => void;
  public onClose?: () => void;

  constructor(mergeManager: EssenceMergeManager, soundEngine: SoundEngine) {
    this.mergeManager = mergeManager;
    this.soundEngine = soundEngine;
    this.initDOM();
  }

  private initDOM(): void {
    if (typeof document === 'undefined') return;
    this.modalEl = document.getElementById('essence-fusion-modal');

    // Close button
    document.getElementById('fusion-modal-close-btn')?.addEventListener('click', () => {
      this.soundEngine.playClick();
      this.close();
    });

    // Merge Action Button
    document.getElementById('fusion-action-btn')?.addEventListener('click', () => {
      if (this.selectedElement) {
        this.performMerge(this.selectedElement);
      }
    });

    // Attunement selection handler
    const attuneSelect = document.getElementById('fusion-attune-select') as HTMLSelectElement | null;
    const attuneBtn = document.getElementById('fusion-attune-btn');
    if (attuneSelect && attuneBtn) {
      // Populate with elements
      attuneSelect.innerHTML = '';
      Object.keys(CORE_ELEMENTS).forEach((elem) => {
        if (elem !== 'Admin' && elem !== 'Neutral' && elem !== 'Undead') {
          const opt = document.createElement('option');
          opt.value = elem;
          opt.textContent = `${CORE_ELEMENTS[elem as ElementType].icon} ${elem}`;
          attuneSelect.appendChild(opt);
        }
      });

      attuneBtn.addEventListener('click', () => {
        const chosen = attuneSelect.value as ElementType;
        if (chosen) {
          this.soundEngine.playUnlock();
          this.mergeManager.attuneEssence(chosen);
          this.selectedElement = chosen;
          this.render();
          const feedback = document.getElementById('fusion-feedback-banner');
          if (feedback) {
            feedback.innerHTML = `✨ Attuned +1 <strong>${chosen}</strong> Essence at the Sanctuary Well! Total: <strong>${this.mergeManager.getEssenceCount(chosen)}</strong>`;
            feedback.className = 'fusion-feedback-banner feedback-attune';
            feedback.classList.remove('hidden');
          }
        }
      });
    }
  }

  public open(preselectedElement?: ElementType): void {
    if (!this.modalEl) return;
    this.modalEl.classList.remove('hidden');

    const mergeable = this.mergeManager.getMergeableEssences();
    if (preselectedElement && this.mergeManager.canMerge(preselectedElement)) {
      this.selectedElement = preselectedElement;
    } else if (mergeable.length > 0) {
      this.selectedElement = mergeable[0];
    } else {
      const all = this.mergeManager.getAllOwnedEssences();
      this.selectedElement = all.length > 0 ? all[0].element : 'Fire';
    }

    this.render();
  }

  public close(): void {
    if (!this.modalEl) return;
    this.modalEl.classList.add('hidden');
    if (this.onClose) this.onClose();
  }

  public isOpen(): boolean {
    return !!this.modalEl && !this.modalEl.classList.contains('hidden');
  }

  public render(): void {
    if (typeof document === 'undefined') return;

    // 1. Render Owned Essences Inventory List
    const inventoryListEl = document.getElementById('fusion-inventory-list');
    const allEssences = this.mergeManager.getAllOwnedEssences();

    if (inventoryListEl) {
      inventoryListEl.innerHTML = '';
      if (allEssences.length === 0) {
        inventoryListEl.innerHTML = `
          <div class="fusion-empty-hint">
            <span style="font-size: 2rem;">🔮</span>
            <p>No elemental essences collected yet!</p>
            <p style="font-size: 0.85rem; color: #94a3b8;">Defeat enemies in battle or use the Sanctuary Attunement Well below to harvest essences.</p>
          </div>
        `;
      } else {
        allEssences.forEach((item) => {
          const card = document.createElement('div');
          const isSelected = this.selectedElement === item.element;
          card.className = `fusion-essence-card ${isSelected ? 'selected' : ''} ${item.canMerge ? 'can-merge' : ''}`;
          card.style.borderColor = item.canMerge ? '#facc15' : item.data.color;
          card.innerHTML = `
            <div class="essence-card-left">
              <span class="essence-card-icon" style="text-shadow: 0 0 10px ${item.data.glowColor}">${item.data.icon}</span>
              <div class="essence-card-info">
                <span class="essence-card-name" style="color: ${item.data.color}">${item.element} Essence</span>
                <span class="essence-card-desc">${item.data.description.substring(0, 48)}...</span>
              </div>
            </div>
            <div class="essence-card-right">
              <span class="essence-count-badge ${item.canMerge ? 'badge-merge-ready' : ''}">
                ${item.canMerge ? 'READY ✨ ' : ''}x${item.count}
              </span>
              ${item.canMerge ? `<button class="fusion-quick-merge-btn" data-element="${item.element}" title="Instantly merge 2 ${item.element} Essences">Merge ⚡</button>` : ''}
            </div>
          `;

          card.addEventListener('click', (e) => {
            const target = e.target as HTMLElement;
            if (target.classList.contains('fusion-quick-merge-btn')) {
              e.stopPropagation();
              this.performMerge(item.element);
              return;
            }
            this.soundEngine.playClick();
            this.selectedElement = item.element;
            this.render();
          });

          inventoryListEl.appendChild(card);
        });
      }
    }

    // 2. Render Crucible Dual Pedestal Chamber
    this.renderCrucibleChamber();
  }

  private renderCrucibleChamber(): void {
    const slot1 = document.getElementById('fusion-slot-1');
    const slot2 = document.getElementById('fusion-slot-2');
    const actionBtn = document.getElementById('fusion-action-btn') as HTMLButtonElement | null;
    const crucibleName = document.getElementById('fusion-target-element-name');
    const crucibleStatus = document.getElementById('fusion-target-element-status');

    if (!this.selectedElement) {
      if (slot1) slot1.innerHTML = '<span class="empty-pedestal">Select Essence</span>';
      if (slot2) slot2.innerHTML = '<span class="empty-pedestal">Select Essence</span>';
      if (actionBtn) {
        actionBtn.disabled = true;
        actionBtn.textContent = 'Select 2 Matching Essences to Merge';
      }
      return;
    }

    const elem = this.selectedElement;
    const data = CORE_ELEMENTS[elem];
    const count = this.mergeManager.getEssenceCount(elem);
    const canMerge = count >= 2;

    if (slot1) {
      slot1.innerHTML = count >= 1 ? `
        <div class="pedestal-filled" style="color: ${data?.color}; text-shadow: 0 0 15px ${data?.glowColor}">
          <span class="pedestal-icon">${data?.icon || '✨'}</span>
          <span class="pedestal-label">${elem} (1/2)</span>
        </div>
      ` : '<span class="empty-pedestal" style="color: #64748b;">Missing #1</span>';
    }

    if (slot2) {
      slot2.innerHTML = count >= 2 ? `
        <div class="pedestal-filled" style="color: ${data?.color}; text-shadow: 0 0 15px ${data?.glowColor}">
          <span class="pedestal-icon">${data?.icon || '✨'}</span>
          <span class="pedestal-label">${elem} (2/2)</span>
        </div>
      ` : '<span class="empty-pedestal" style="color: #ef4444;">Need 2nd Essence</span>';
    }

    if (crucibleName) {
      crucibleName.textContent = `${data?.icon || '✨'} ${elem} Element`;
      crucibleName.style.color = data?.color || '#ffffff';
      crucibleName.style.textShadow = `0 0 15px ${data?.glowColor || 'rgba(255,255,255,0.5)'}`;
    }

    if (crucibleStatus) {
      crucibleStatus.innerHTML = canMerge
        ? `<strong style="color: #4ade80;">✨ READY TO FUSE: 2 / 2 ${elem} Essences Available!</strong>`
        : `<span style="color: #f87171;">⚠️ Have ${count} / 2 ${elem} Essences. Collect 1 more to merge!</span>`;
    }

    if (actionBtn) {
      actionBtn.disabled = !canMerge;
      if (canMerge) {
        actionBtn.textContent = `🔮 MERGE 2x ${elem.toUpperCase()} ESSENCES ➔ AWAKEN ${elem.toUpperCase()}`;
        actionBtn.classList.add('fusion-btn-active');
      } else {
        actionBtn.textContent = `Need 2 ${elem} Essences (${count}/2)`;
        actionBtn.classList.remove('fusion-btn-active');
      }
    }
  }

  public performMerge(element: ElementType): void {
    const result = this.mergeManager.mergeEssences(element);
    const feedback = document.getElementById('fusion-feedback-banner');

    if (result.success) {
      this.soundEngine.playCutsceneWizardBlessing();
      this.soundEngine.playMagicSurge();
      this.soundEngine.playUnlock();

      if (feedback) {
        feedback.innerHTML = result.message;
        feedback.className = `fusion-feedback-banner ${result.newlyUnlocked ? 'feedback-success' : 'feedback-empower'}`;
        feedback.classList.remove('hidden');
      }

      // Re-render
      this.render();

      if (this.onMergeSuccess) {
        this.onMergeSuccess(result);
      }
    } else {
      this.soundEngine.playClick();
      if (feedback) {
        feedback.innerHTML = `⚠️ ${result.message}`;
        feedback.className = 'fusion-feedback-banner feedback-warning';
        feedback.classList.remove('hidden');
      }
    }
  }
}
