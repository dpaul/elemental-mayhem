// Elemental Mayhem - Main Application & Game Loop Controller
import { Grid } from './engine/Grid';
import { TileHazardManager } from './engine/TileHazardManager';
import { CombatEngine } from './engine/CombatEngine';
import { TurnManager } from './engine/TurnManager';
import { EnemyAI } from './engine/EnemyAI';
import { PerformanceScorer } from './engine/PerformanceScorer';
import { UpgradeManager } from './engine/UpgradeManager';
import { EscalationManager } from './engine/EscalationManager';
import { UnlockManager } from './engine/UnlockManager';
import { BattlefieldRenderer } from './renderer/BattlefieldRenderer';
import { HUDManager } from './ui/HUDManager';
import { ElementType, Unit, Ability, GridCoord } from './types';
import { CORE_ELEMENTS } from './constants/elements';
import { HERO_CLASSES, createHeroForElement } from './constants/classes';

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

interface HomeParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
}

export class GameApp {
  private grid: Grid;
  private hazardManager: TileHazardManager;
  private combatEngine: CombatEngine;
  private turnManager: TurnManager;
  private enemyAI: EnemyAI;
  private scorer: PerformanceScorer;
  private upgradeManager: UpgradeManager;
  private escalationManager: EscalationManager;
  private unlockManager: UnlockManager;
  private renderer: BattlefieldRenderer;
  private hud: HUDManager;

  private hero: Unit;
  private enemies: Unit[];
  private currentRound: number = 1;
  private maxRounds: number = 15;
  private selectedElement: ElementType = 'Fire';
  private selectedClassCategory: string = 'All';

  private totalEssence: number = 0;
  private totalXp: number = 0;

  private selectedAbility: Ability | null = null;
  private hoveredCoord: GridCoord | null = null;
  private reachableTiles: GridCoord[] = [];
  private targetableTiles: GridCoord[] = [];

  private isBusy: boolean = false;
  private focusedUnitId: string | null = null;
  private lastFrameTime: number = performance.now();
  private deadUnitIds: Set<string> = new Set();

  // Home Screen & Particle Background
  private homeScreen: HTMLElement;
  private homeParticlesCanvas: HTMLCanvasElement;
  private homeParticlesCtx: CanvasRenderingContext2D | null = null;
  private homeParticles: HomeParticle[] = [];
  private homeBtnCampaign: HTMLElement;
  private homeBtnHotseat: HTMLElement;
  private homeBtnCodex: HTMLElement;
  private homeBtnGuide: HTMLElement;

  // Header Nav Controls
  private navHomeBtn: HTMLElement | null;
  private navCodexBtn: HTMLElement | null;
  private navGuideBtn: HTMLElement | null;

  // Hot Seat Arena Mode
  private isHotseatMode: boolean = false;
  private hotseatCurrentPlayer: 1 | 2 = 1;
  private hotseatP1Element: ElementType = 'Fire';
  private hotseatP2Element: ElementType = 'Water';
  private hotseatSelectModal: HTMLElement;
  private hotseatModalTitle: HTMLElement;
  private hotseatModalSubtitle: HTMLElement;
  private hotseatClassSelectContainer: HTMLElement;
  private pvpArenaBtn: HTMLElement | null;

  // Codex & Guide Modals
  private codexModal: HTMLElement;
  private codexGridContainer: HTMLElement;
  private codexSearchInput: HTMLInputElement;
  private codexCategory: string = 'All';
  private guideModal: HTMLElement;

  // Standard Modals
  private characterSelectModal: HTMLElement;
  private classSelectContainer: HTMLElement;
  private changeElementBtn: HTMLElement;
  private upgradeModal: HTMLElement;
  private upgradeChoicesContainer: HTMLElement;
  private proceedNextRoundBtn: HTMLElement;
  private modalEssence: HTMLElement;
  private modalXp: HTMLElement;
  private gameOverModal: HTMLElement;
  private outcomeTitle: HTMLElement;
  private outcomeSubtitle: HTMLElement;
  private outcomeStatsList: HTMLElement;
  private restartGameBtn: HTMLElement;

  constructor() {
    const canvas = document.getElementById('battlefield-canvas') as HTMLCanvasElement;
    this.grid = new Grid(10);
    this.hazardManager = new TileHazardManager(this.grid);
    this.turnManager = new TurnManager();
    this.scorer = new PerformanceScorer();
    this.upgradeManager = new UpgradeManager();
    this.escalationManager = new EscalationManager();
    this.unlockManager = new UnlockManager();

    // Home Screen Elements
    this.homeScreen = document.getElementById('home-screen')!;
    this.homeParticlesCanvas = document.getElementById('home-particles-canvas') as HTMLCanvasElement;
    if (this.homeParticlesCanvas) {
      this.homeParticlesCtx = this.homeParticlesCanvas.getContext('2d');
      this.initHomeParticles();
    }
    this.homeBtnCampaign = document.getElementById('home-btn-campaign')!;
    this.homeBtnHotseat = document.getElementById('home-btn-hotseat')!;
    this.homeBtnCodex = document.getElementById('home-btn-codex')!;
    this.homeBtnGuide = document.getElementById('home-btn-guide')!;

    // Header Navigation
    this.navHomeBtn = document.getElementById('nav-home-btn');
    this.navCodexBtn = document.getElementById('nav-codex-btn');
    this.navGuideBtn = document.getElementById('nav-guide-btn');

    // Codex & Guide
    this.codexModal = document.getElementById('codex-modal')!;
    this.codexGridContainer = document.getElementById('codex-grid-container')!;
    this.codexSearchInput = document.getElementById('codex-search-input') as HTMLInputElement;
    this.guideModal = document.getElementById('guide-modal')!;

    // Standard Modals
    this.characterSelectModal = document.getElementById('character-select-modal')!;
    this.classSelectContainer = document.getElementById('class-select-container')!;
    this.changeElementBtn = document.getElementById('change-element-btn')!;
    this.upgradeModal = document.getElementById('upgrade-modal')!;
    this.upgradeChoicesContainer = document.getElementById('upgrade-choices-container')!;
    this.proceedNextRoundBtn = document.getElementById('proceed-next-round-btn')!;
    this.modalEssence = document.getElementById('modal-essence')!;
    this.modalXp = document.getElementById('modal-xp')!;
    this.gameOverModal = document.getElementById('game-over-modal')!;
    this.outcomeTitle = document.getElementById('outcome-title')!;
    this.outcomeSubtitle = document.getElementById('outcome-subtitle')!;
    this.outcomeStatsList = document.getElementById('outcome-stats-list')!;
    this.restartGameBtn = document.getElementById('restart-game-btn')!;

    // Hotseat modal elements
    this.hotseatSelectModal = document.getElementById('hotseat-select-modal')!;
    this.hotseatModalTitle = document.getElementById('hotseat-modal-title')!;
    this.hotseatModalSubtitle = document.getElementById('hotseat-modal-subtitle')!;
    this.hotseatClassSelectContainer = document.getElementById('hotseat-class-select-container')!;
    this.pvpArenaBtn = document.getElementById('pvp-arena-btn');

    this.hero = this.createHero(this.selectedElement);
    this.enemies = this.escalationManager.generateRoundEnemies(1);

    this.combatEngine = new CombatEngine(this.grid, this.hazardManager, this.hero, this.enemies);
    this.enemyAI = new EnemyAI(this.combatEngine);
    this.renderer = new BattlefieldRenderer(canvas, this.combatEngine);
    this.hud = new HUDManager();

    this.setupCategoryTabs();
    this.setupCodexTabs();
    this.setupObstacles();
    this.setupEventListeners(canvas);
    this.updateReachableTiles();
    this.updateHUD();

    // Start Game Loop
    this.lastFrameTime = performance.now();
    this.gameLoop();
  }

  private initHomeParticles(): void {
    if (!this.homeParticlesCanvas) return;
    this.homeParticlesCanvas.width = window.innerWidth;
    this.homeParticlesCanvas.height = window.innerHeight;

    window.addEventListener('resize', () => {
      if (this.homeParticlesCanvas) {
        this.homeParticlesCanvas.width = window.innerWidth;
        this.homeParticlesCanvas.height = window.innerHeight;
      }
    });

    const colors = ['#ff6b35', '#00d2ff', '#ffd000', '#22c55e', '#d946ef', '#38bdf8', '#8b5cf6'];
    this.homeParticles = [];

    for (let i = 0; i < 65; i++) {
      this.homeParticles.push({
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        vx: (Math.random() - 0.5) * 0.8,
        vy: (Math.random() - 0.5) * 0.8,
        size: Math.random() * 3.5 + 1.5,
        color: colors[Math.floor(Math.random() * colors.length)],
        alpha: Math.random() * 0.6 + 0.3,
      });
    }
  }

  private updateAndRenderHomeParticles(): void {
    if (!this.homeParticlesCtx || !this.homeParticlesCanvas) return;
    const ctx = this.homeParticlesCtx;
    ctx.clearRect(0, 0, this.homeParticlesCanvas.width, this.homeParticlesCanvas.height);

    for (const p of this.homeParticles) {
      p.x += p.vx;
      p.y += p.vy;

      if (p.x < 0) p.x = this.homeParticlesCanvas.width;
      if (p.x > this.homeParticlesCanvas.width) p.x = 0;
      if (p.y < 0) p.y = this.homeParticlesCanvas.height;
      if (p.y > this.homeParticlesCanvas.height) p.y = 0;

      ctx.save();
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.color;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  public showHomeScreen(): void {
    this.homeScreen.classList.remove('hidden');
    this.characterSelectModal.classList.add('hidden');
    this.hotseatSelectModal.classList.add('hidden');
    this.codexModal.classList.add('hidden');
    this.guideModal.classList.add('hidden');
    this.gameOverModal.classList.add('hidden');
    this.upgradeModal.classList.add('hidden');
  }

  public hideHomeScreen(): void {
    this.homeScreen.classList.add('hidden');
  }

  private setupCategoryTabs(): void {
    const tabs = document.querySelectorAll('#class-category-tabs .category-tab');
    tabs.forEach((tab) => {
      tab.addEventListener('click', (e) => {
        tabs.forEach((t) => t.classList.remove('active'));
        const target = e.currentTarget as HTMLElement;
        target.classList.add('active');
        this.selectedClassCategory = target.getAttribute('data-category') || 'All';
        this.renderCharacterSelectModal();
      });
    });
  }

  private setupCodexTabs(): void {
    const tabs = document.querySelectorAll('#codex-category-tabs .category-tab');
    tabs.forEach((tab) => {
      tab.addEventListener('click', (e) => {
        tabs.forEach((t) => t.classList.remove('active'));
        const target = e.currentTarget as HTMLElement;
        target.classList.add('active');
        this.codexCategory = target.getAttribute('data-category') || 'All';
        this.renderCodex();
      });
    });

    this.codexSearchInput?.addEventListener('input', () => {
      this.renderCodex();
    });
  }

  public openCodex(): void {
    this.renderCodex();
    this.codexModal.classList.remove('hidden');
  }

  public closeCodex(): void {
    this.codexModal.classList.add('hidden');
  }

  public openGuide(): void {
    this.guideModal.classList.remove('hidden');
  }

  public closeGuide(): void {
    this.guideModal.classList.add('hidden');
  }

  private renderCodex(): void {
    if (!this.codexGridContainer) return;
    this.codexGridContainer.innerHTML = '';
    const query = this.codexSearchInput?.value.trim().toLowerCase() || '';

    // If "Reactions" tab is selected, render Reactions Matrix
    if (this.codexCategory === 'Reactions') {
      const reactions = [
        { name: 'Vaporize', elements: 'Fire + Water', desc: 'High-pressure steam deals +25 bonus damage and cleanses wet.', icon: '💨' },
        { name: 'Superconduct', elements: 'Lightning + Water', desc: 'Electrified charge shocks the target, lowering AP next turn.', icon: '⚡' },
        { name: 'Toxic Explosion', elements: 'Fire + Poison', desc: 'Venom ignites into an explosive blast dealing +30 damage in a 3x3 AoE.', icon: '💥' },
        { name: 'Petrify', elements: 'Earth + Water/Poison', desc: 'Solidifying minerals encase target in stone, rooting them in place.', icon: '🪨' },
        { name: 'Melt', elements: 'Fire + Ice', desc: 'Intense thermal shock liquefies ice, dealing +32 melt damage.', icon: '🔥' },
        { name: 'Shatter', elements: 'Metal/Force + Frozen/Rooted', desc: 'Kinetic impact shatters brittle crystalline defenses for +28 damage.', icon: '🔨' },
        { name: 'Firestorm', elements: 'Wind/Storm + Fire', desc: 'Roaring gusts fan flames into an inferno affecting adjacent tiles.', icon: '🌪️' },
        { name: 'Annihilation', elements: 'Light + Darkness', desc: 'Absolute contrast collision unleashes antimatter destruction for +35 damage.', icon: '✨' },
        { name: 'Void Collapse', elements: 'Void + Any Status', desc: 'Cosmic entropy collapses active debuffs for +20 bonus damage.', icon: '🌌' },
        { name: 'Holy Smite', elements: 'Light + Undead', desc: 'Radiant glory incinerates necrotic corruption for +30 bonus damage.', icon: '☀️' },
        { name: 'Necrosis', elements: 'Undead + Poison/Blood', desc: 'Creeping gangrene rapidly dissolves flesh, dealing +26 damage.', icon: '💀' },
      ];

      const filteredReactions = reactions.filter(
        (r) => r.name.toLowerCase().includes(query) || r.elements.toLowerCase().includes(query) || r.desc.toLowerCase().includes(query)
      );

      filteredReactions.forEach((r) => {
        const card = document.createElement('div');
        card.className = 'codex-card';
        card.innerHTML = `
          <div class="codex-card-header">
            <span class="codex-card-icon">${r.icon}</span>
            <div>
              <div class="codex-card-title">${r.name}</div>
              <div class="codex-card-category">${r.elements}</div>
            </div>
          </div>
          <div class="codex-card-desc">${r.desc}</div>
        `;
        this.codexGridContainer.appendChild(card);
      });
      return;
    }

    // Otherwise render elements
    const allElements = Object.keys(CORE_ELEMENTS) as ElementType[];
    const filtered = allElements.filter((elem) => {
      if (elem === 'Neutral') return false;
      const data = CORE_ELEMENTS[elem];
      if (!data) return false;

      const matchesCategory = this.codexCategory === 'All' || data.category === this.codexCategory;
      const matchesSearch =
        query === '' ||
        data.name.toLowerCase().includes(query) ||
        data.description.toLowerCase().includes(query) ||
        (HERO_CLASSES[elem] && HERO_CLASSES[elem].className.toLowerCase().includes(query));

      return matchesCategory && matchesSearch;
    });

    filtered.forEach((elem) => {
      const data = CORE_ELEMENTS[elem];
      const heroClass = HERO_CLASSES[elem];
      const card = document.createElement('div');
      card.className = 'codex-card';
      card.style.borderColor = data.color;

      const strongList = data.strongAgainst.join(', ') || 'None';
      const weakList = data.weakAgainst.join(', ') || 'None';

      card.innerHTML = `
        <div class="codex-card-header">
          <span class="codex-card-icon">${data.icon}</span>
          <div>
            <div class="codex-card-title" style="color:${data.color};">${data.name} ${heroClass ? `(${heroClass.className})` : ''}</div>
            <div class="codex-card-category">${data.category} Element</div>
          </div>
        </div>
        <div class="codex-card-desc">${data.description}</div>
        <div class="codex-card-synergies">
          <div class="synergy-strong">⚔️ Strong vs: ${strongList}</div>
          <div class="synergy-weak">🛡️ Weak vs: ${weakList}</div>
        </div>
      `;
      this.codexGridContainer.appendChild(card);
    });
  }

  private createHero(element: ElementType = this.selectedElement): Unit {
    return createHeroForElement(element);
  }

  private renderCharacterSelectModal(): void {
    const allElements = Object.keys(HERO_CLASSES) as ElementType[];
    const filteredElements = allElements.filter((elem) => {
      if (this.selectedClassCategory === 'All') return true;
      const config = HERO_CLASSES[elem];
      return config && config.category === this.selectedClassCategory;
    });

    this.classSelectContainer.innerHTML = '';

    filteredElements.forEach((elem) => {
      const config = HERO_CLASSES[elem];
      if (!config) return;
      const elemData = CORE_ELEMENTS[elem] || CORE_ELEMENTS.Fire;
      const isAdmin = this.unlockManager.isAdminOnly(elem);
      const isUnlocked = this.unlockManager.isElementUnlocked(elem);
      const card = document.createElement('div');
      card.className = `class-card ${isUnlocked ? '' : 'locked'}`;
      card.style.setProperty('--card-color', elemData.color);
      card.style.setProperty('--card-glow', elemData.glowColor);

      const abilityRows = config.abilities.map((ab) => `
        <div class="class-ability-row">
          <span class="class-ability-name">${ab.icon} ${ab.name}</span>
          <span class="class-ability-meta">${ab.apCost} AP | ${ab.baseDamage} DMG</span>
        </div>
      `).join('');

      const badgeHtml = isAdmin
        ? `<span class="element-badge" style="background: rgba(239, 68, 68, 0.3); color: #fca5a5; border: 1px solid #ef4444;">👑 Admin Power</span>`
        : isUnlocked
        ? `<span class="element-badge" style="background:${elemData.glowColor}; color:${elemData.color}; width:fit-content;">${elem}</span>`
        : `<span class="lock-badge">🔒 Locked</span>`;

      const actionHtml = isUnlocked
        ? `<button class="class-select-btn" style="${isAdmin ? 'background: linear-gradient(135deg, #ef4444, #8b5cf6); border-color: #f87171;' : ''}">Choose ${config.className}</button>`
        : `<div class="unlock-requirement-box">🔒 ${config.unlockRequirement || 'Defeat Boss to Unlock'}</div>`;

      card.innerHTML = `
        <div class="class-card-header">
          <span class="class-avatar">${config.avatar}</span>
          <div class="class-info">
            <div class="class-name">${config.className}</div>
            ${badgeHtml}
          </div>
        </div>
        <div class="class-tagline">${config.tagline}</div>
        <div class="class-abilities-title">Dedicated Spells:</div>
        <div class="class-ability-list">
          ${abilityRows}
        </div>
        ${actionHtml}
      `;

      if (isUnlocked) {
        card.onclick = () => {
          this.selectedElement = elem;
          this.characterSelectModal.classList.add('hidden');
          this.restartGame(elem);
        };
      }

      this.classSelectContainer.appendChild(card);
    });
  }

  private openHotseatSelection(): void {
    this.hideHomeScreen();
    this.hotseatModalTitle.textContent = '⚔️ HOT SEAT ARENA: SELECT PLAYER 1';
    this.hotseatModalSubtitle.textContent = 'Player 1, choose your elemental champion.';
    this.renderHotseatClassCards(1);
    this.hotseatSelectModal.classList.remove('hidden');
  }

  private renderHotseatClassCards(playerNum: 1 | 2): void {
    const allElements = Object.keys(HERO_CLASSES) as ElementType[];
    this.hotseatClassSelectContainer.innerHTML = '';

    allElements.forEach((elem) => {
      const config = HERO_CLASSES[elem];
      if (!config) return;
      const elemData = CORE_ELEMENTS[elem] || CORE_ELEMENTS.Fire;
      const isAdmin = this.unlockManager.isAdminOnly(elem);
      const isUnlocked = this.unlockManager.isElementUnlocked(elem);
      const card = document.createElement('div');
      card.className = `class-card ${isUnlocked ? '' : 'locked'}`;
      card.style.setProperty('--card-color', elemData.color);
      card.style.setProperty('--card-glow', elemData.glowColor);

      const abilityRows = config.abilities.map((ab) => `
        <div class="class-ability-row">
          <span class="class-ability-name">${ab.icon} ${ab.name}</span>
          <span class="class-ability-meta">${ab.apCost} AP | ${ab.baseDamage} DMG</span>
        </div>
      `).join('');

      const badgeHtml = isAdmin
        ? `<span class="element-badge" style="background: rgba(239, 68, 68, 0.3); color: #fca5a5; border: 1px solid #ef4444;">👑 Admin Power</span>`
        : `<span class="element-badge" style="background:${elemData.glowColor}; color:${elemData.color}; width:fit-content;">${elem}</span>`;

      const actionHtml = `<button class="class-select-btn" style="${isAdmin ? 'background: linear-gradient(135deg, #ef4444, #8b5cf6); border-color: #f87171;' : ''}">Pick for Player ${playerNum}</button>`;

      card.innerHTML = `
        <div class="class-card-header">
          <span class="class-avatar">${config.avatar}</span>
          <div class="class-info">
            <div class="class-name">${config.className}</div>
            ${badgeHtml}
          </div>
        </div>
        <div class="class-tagline">${config.tagline}</div>
        <div class="class-abilities-title">Dedicated Spells:</div>
        <div class="class-ability-list">${abilityRows}</div>
        ${actionHtml}
      `;

      card.onclick = () => {
        if (playerNum === 1) {
          this.hotseatP1Element = elem;
          this.hotseatModalTitle.textContent = '⚔️ HOT SEAT ARENA: SELECT PLAYER 2';
          this.hotseatModalSubtitle.textContent = 'Player 2, choose your elemental champion.';
          this.renderHotseatClassCards(2);
        } else {
          this.hotseatP2Element = elem;
          this.hotseatSelectModal.classList.add('hidden');
          this.startHotseatMatch();
        }
      };

      this.hotseatClassSelectContainer.appendChild(card);
    });
  }

  private startHotseatMatch(): void {
    this.hideHomeScreen();
    this.isHotseatMode = true;
    this.hotseatCurrentPlayer = 1;

    const p1 = createHeroForElement(this.hotseatP1Element);
    p1.id = 'hero_p1';
    p1.name = `Player 1 (${p1.name})`;
    p1.faction = 'Player';
    p1.coord = { x: 2, y: 5 };

    const p2 = createHeroForElement(this.hotseatP2Element);
    p2.id = 'hero_p2';
    p2.name = `Player 2 (${p2.name})`;
    p2.faction = 'Enemy';
    p2.coord = { x: 7, y: 5 };

    this.hero = p1;
    this.enemies = [p2];

    this.grid = new Grid(10);
    this.hazardManager = new TileHazardManager(this.grid);
    this.setupObstacles();

    this.combatEngine = new CombatEngine(this.grid, this.hazardManager, this.hero, this.enemies);
    const canvas = document.getElementById('battlefield-canvas') as HTMLCanvasElement;
    this.renderer = new BattlefieldRenderer(canvas, this.combatEngine);
    this.enemyAI = new EnemyAI(this.combatEngine);

    this.combatEngine.addLog('system', `⚔️ Hot Seat PvP Arena: ${p1.name} VS ${p2.name}!`);
    this.turnManager.setPhase('HOTSEAT_P1_TURN');
    this.hud.updatePhaseBanner("PLAYER 1'S TURN (Hot Seat)");
    this.selectedAbility = null;
    this.targetableTiles = [];
    this.updateReachableTiles();
    this.updateHUD();
  }

  private setupObstacles(): void {
    const obstacleCoords = [
      { x: 3, y: 3 },
      { x: 3, y: 6 },
      { x: 6, y: 3 },
      { x: 6, y: 6 },
      { x: 4, y: 4 },
      { x: 5, y: 5 },
    ];
    obstacleCoords.forEach((c) => this.grid.setObstacle(c, true));
  }

  private setupEventListeners(canvas: HTMLCanvasElement): void {
    // Home Screen Actions
    document.getElementById('home-btn-choose-element')?.addEventListener('click', () => {
      this.hideHomeScreen();
      this.renderCharacterSelectModal();
      this.characterSelectModal.classList.remove('hidden');
    });

    document.getElementById('home-btn-element-card')?.addEventListener('click', () => {
      this.hideHomeScreen();
      this.renderCharacterSelectModal();
      this.characterSelectModal.classList.remove('hidden');
    });

    this.homeBtnCampaign?.addEventListener('click', () => {
      this.hideHomeScreen();
      this.renderCharacterSelectModal();
      this.characterSelectModal.classList.remove('hidden');
    });

    document.getElementById('home-btn-multiplayer')?.addEventListener('click', () => {
      this.openHotseatSelection();
    });

    document.getElementById('nav-multiplayer-btn')?.addEventListener('click', () => {
      this.openHotseatSelection();
    });

    document.getElementById('pvp-arena-btn')?.addEventListener('click', () => {
      this.openHotseatSelection();
    });

    document.getElementById('char-select-multiplayer-btn')?.addEventListener('click', () => {
      this.characterSelectModal.classList.add('hidden');
      this.openHotseatSelection();
    });

    this.homeBtnHotseat?.addEventListener('click', () => {
      this.openHotseatSelection();
    });

    this.homeBtnCodex?.addEventListener('click', () => {
      this.openCodex();
    });

    this.homeBtnGuide?.addEventListener('click', () => {
      this.openGuide();
    });

    // Header Navigation
    this.navHomeBtn?.addEventListener('click', () => {
      this.showHomeScreen();
    });

    this.navCodexBtn?.addEventListener('click', () => {
      this.openCodex();
    });

    this.navGuideBtn?.addEventListener('click', () => {
      this.openGuide();
    });

    // Close Modals
    document.getElementById('close-codex-btn')?.addEventListener('click', () => {
      this.closeCodex();
    });

    document.getElementById('close-guide-btn')?.addEventListener('click', () => {
      this.closeGuide();
    });

    document.getElementById('char-select-back-btn')?.addEventListener('click', () => {
      this.showHomeScreen();
    });

    document.getElementById('hotseat-select-back-btn')?.addEventListener('click', () => {
      this.showHomeScreen();
    });

    document.getElementById('gameover-home-btn')?.addEventListener('click', () => {
      this.showHomeScreen();
    });

    // Canvas Interactions
    canvas.addEventListener('mousemove', (e) => {
      if (this.isBusy) return;
      const gridCoord = this.renderer.screenToGrid(e.clientX, e.clientY);
      this.hoveredCoord = gridCoord;
      if (gridCoord) {
        const unit = this.combatEngine.getUnitAt(gridCoord);
        this.hud.inspectUnit(unit, gridCoord);
      }
    });

    canvas.addEventListener('click', async (e) => {
      if (this.isBusy) return;
      const gridCoord = this.renderer.screenToGrid(e.clientX, e.clientY);
      if (!gridCoord) return;

      if (this.selectedAbility) {
        await this.handlePlayerCast(this.selectedAbility, gridCoord);
      } else {
        await this.handlePlayerMove(gridCoord);
      }
    });

    document.getElementById('end-turn-btn')?.addEventListener('click', () => {
      if (!this.isBusy) {
        this.endPlayerTurn();
      }
    });

    this.pvpArenaBtn?.addEventListener('click', () => {
      this.openHotseatSelection();
    });

    document.getElementById('gameover-pvp-btn')?.addEventListener('click', () => {
      this.gameOverModal.classList.add('hidden');
      this.openHotseatSelection();
    });

    this.proceedNextRoundBtn.addEventListener('click', () => {
      this.advanceToNextRound();
    });

    this.restartGameBtn.addEventListener('click', () => {
      this.restartGame(this.selectedElement);
    });

    this.changeElementBtn?.addEventListener('click', () => {
      this.gameOverModal.classList.add('hidden');
      this.renderCharacterSelectModal();
      this.characterSelectModal.classList.remove('hidden');
    });

    window.addEventListener('keydown', (e) => {
      if (this.isBusy) return;

      const activeUnit = this.getActivePlayerUnit();
      if (e.key >= '1' && e.key <= '5') {
        const idx = parseInt(e.key) - 1;
        if (activeUnit.abilities[idx]) {
          this.selectAbility(activeUnit.abilities[idx]);
        }
      } else if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault();
        this.endPlayerTurn();
      } else if (e.key === 'Escape') {
        this.selectedAbility = null;
        this.targetableTiles = [];
        this.updateHUD();
      }
    });
  }

  private getActivePlayerUnit(): Unit {
    if (this.isHotseatMode && this.hotseatCurrentPlayer === 2) {
      return this.enemies[0];
    }
    return this.hero;
  }

  private selectAbility(ability: Ability): void {
    const activeUnit = this.getActivePlayerUnit();
    if (this.isBusy || ability.apCost > activeUnit.stats.currentAp || ability.currentCooldown > 0) return;

    if (this.selectedAbility?.id === ability.id) {
      this.selectedAbility = null;
      this.targetableTiles = [];
    } else {
      this.selectedAbility = ability;
      this.targetableTiles = [];
      const centerCoord = activeUnit.coord;

      if (ability.targeting === 'Self') {
        this.targetableTiles.push(centerCoord);
      } else {
        for (let x = 0; x < this.grid.size; x++) {
          for (let y = 0; y < this.grid.size; y++) {
            const coord = { x, y };
            const dist = this.grid.manhattanDistance(centerCoord, coord);
            if (dist <= ability.range && this.grid.hasLineOfSight(centerCoord, coord)) {
              this.targetableTiles.push(coord);
            }
          }
        }
      }
    }
    this.updateHUD();
  }

  private async handlePlayerMove(targetCoord: GridCoord): Promise<void> {
    const activeUnit = this.getActivePlayerUnit();
    const isReachable = this.reachableTiles.some((c) => c.x === targetCoord.x && c.y === targetCoord.y);
    if (!isReachable) return;

    const path = this.grid.findPath(activeUnit.coord, targetCoord);
    if (!path || path.length === 0) return;

    this.isBusy = true;
    this.reachableTiles = [];
    this.selectedAbility = null;
    this.targetableTiles = [];

    await new Promise<void>((resolve) => {
      this.renderer.animManager.animateMovement(activeUnit.id, path, 160, () => {
        this.combatEngine.moveUnit(activeUnit, targetCoord);
        resolve();
      });
    });

    this.isBusy = false;
    this.updateReachableTiles();
    this.updateHUD();
    this.checkCombatState();
  }

  private checkAndTriggerDeaths(killerElement?: ElementType): void {
    const allUnits = [
      this.hero,
      ...this.combatEngine.zombies,
      ...this.combatEngine.lifeBeings,
      ...this.combatEngine.enemies,
    ];

    for (const unit of allUnits) {
      if (unit.isDead && !this.deadUnitIds.has(unit.id)) {
        this.deadUnitIds.add(unit.id);
        this.renderer.triggerDeathAnimation(unit, killerElement || unit.stats.elementalAffinity);
      }
    }
  }

  private async handlePlayerCast(ability: Ability, targetCoord: GridCoord): Promise<void> {
    const activeUnit = this.getActivePlayerUnit();
    const isTargetable = this.targetableTiles.some((c) => c.x === targetCoord.x && c.y === targetCoord.y);
    if (!isTargetable) return;

    this.isBusy = true;
    this.selectedAbility = null;
    this.targetableTiles = [];
    this.reachableTiles = [];
    this.updateHUD();

    const startPos = this.renderer.gridToScreen(activeUnit.coord);
    const targetPos = this.renderer.gridToScreen(targetCoord);
    const elemData = CORE_ELEMENTS[ability.element];
    const color = elemData ? elemData.color : '#ffd000';

    const isBeam = ability.name.toLowerCase().includes('beam') ||
      ability.name.toLowerCase().includes('ray') ||
      ability.name.toLowerCase().includes('lance') ||
      ability.name.toLowerCase().includes('flare');

    if (isBeam) {
      this.renderer.particleEngine.addBeam(startPos.x, startPos.y, targetPos.x, targetPos.y, color, 8, 320);
    }

    // Launch Projectile and await arrival
    await new Promise<void>((resolve) => {
      this.renderer.projManager.spawnProjectile(startPos, targetPos, ability.element, color, 260, () => {
        const logCountBefore = this.combatEngine.logs.length;
        this.combatEngine.executeAbility(activeUnit, ability, targetCoord);

        const isAoE = ability.aoeRadius > 0;
        this.renderer.triggerSpellImpact(targetCoord, ability.element, isAoE);

        const newLogs = this.combatEngine.logs.slice(logCountBefore);
        const reactionLog = newLogs.find((l) => l.type === 'reaction');

        if (ability.baseDamage > 0) {
          this.renderer.particleEngine.addFloatingText(
            `-${ability.baseDamage}`,
            targetPos.x,
            targetPos.y - 15,
            color,
            22
          );
        }

        if (reactionLog) {
          this.renderer.particleEngine.addFloatingText(
            reactionLog.message.split('!')[0] + '!',
            targetPos.x,
            targetPos.y - 38,
            '#fef08a',
            24
          );
        }

        this.checkAndTriggerDeaths(ability.element);
        resolve();
      });
    });

    await delay(250);

    this.isBusy = false;
    this.updateReachableTiles();
    this.updateHUD();
    this.checkCombatState();
  }

  private async endPlayerTurn(): Promise<void> {
    if (this.isBusy) return;

    // --- HOT SEAT ARENA TURN MANAGEMENT ---
    if (this.isHotseatMode) {
      this.isBusy = true;
      this.selectedAbility = null;
      this.targetableTiles = [];
      this.reachableTiles = [];

      const currentFaction = this.hotseatCurrentPlayer === 1 ? 'Player' : 'Enemy';
      const enemyFaction = this.hotseatCurrentPlayer === 1 ? 'Enemy' : 'Player';

      // Minion turn for active player
      const activeMinions = [
        ...this.combatEngine.zombies.filter((z) => !z.isDead && z.faction === currentFaction),
        ...this.combatEngine.lifeBeings.filter((b) => !b.isDead && b.faction === currentFaction),
      ];

      for (const minion of activeMinions) {
        if (minion.isDead) continue;
        minion.stats.currentAp = minion.stats.maxAp;
        const targets = (enemyFaction === 'Player' ? [this.hero] : this.enemies).filter((u) => !u.isDead);
        if (targets.length === 0) break;
        const closestTarget = targets.sort(
          (a, b) =>
            this.combatEngine.grid.manhattanDistance(minion.coord, a.coord) -
            this.combatEngine.grid.manhattanDistance(minion.coord, b.coord)
        )[0];

        const steps = this.enemyAI.planTurnSteps(minion, closestTarget);
        for (const step of steps) {
          if (minion.isDead || closestTarget.isDead) break;
          if (step.type === 'move') {
            this.combatEngine.moveUnit(minion, step.destination);
          } else if (step.type === 'cast') {
            this.combatEngine.executeAbility(minion, step.ability, step.targetCoord);
          }
        }
      }

      const p1 = this.hero;
      const p2 = this.enemies[0];
      if (p1.isDead || p2.isDead) {
        this.showHotseatVictoryModal(p1.isDead ? 'PLAYER 2' : 'PLAYER 1');
        this.isBusy = false;
        return;
      }

      this.hazardManager.tickHazards();
      this.combatEngine.tickZombies();
      this.combatEngine.statusManager.tickStatusEffects(p1);
      this.combatEngine.statusManager.tickStatusEffects(p2);

      if (this.hotseatCurrentPlayer === 1) {
        this.hotseatCurrentPlayer = 2;
        p2.stats.currentAp = p2.stats.maxAp;
        p2.abilities.forEach((a) => {
          if (a.currentCooldown > 0) a.currentCooldown--;
        });
        this.hud.updatePhaseBanner("PLAYER 2'S TURN (Hot Seat)");
        this.combatEngine.addLog('system', "⚔️ Player 2's Turn begins!");
      } else {
        this.hotseatCurrentPlayer = 1;
        p1.stats.currentAp = p1.stats.maxAp;
        p1.abilities.forEach((a) => {
          if (a.currentCooldown > 0) a.currentCooldown--;
        });
        this.hud.updatePhaseBanner("PLAYER 1'S TURN (Hot Seat)");
        this.combatEngine.addLog('system', "⚔️ Player 1's Turn begins!");
      }

      this.isBusy = false;
      this.updateReachableTiles();
      this.updateHUD();
      return;
    }

    // --- SINGLE PLAYER CAMPAIGN TURN MANAGEMENT ---
    this.isBusy = true;
    this.turnManager.endPlayerTurn();
    this.selectedAbility = null;
    this.targetableTiles = [];
    this.reachableTiles = [];
    this.hud.updatePhaseBanner('ALLIED MINIONS');
    this.updateHUD();

    await delay(250);

    // 1. Allied Minions (Zombies & Beings of Life)
    const alliedMinions = [
      ...this.combatEngine.zombies.filter((z) => !z.isDead && z.faction === 'Player'),
      ...this.combatEngine.lifeBeings.filter((b) => !b.isDead && b.faction === 'Player'),
    ];

    for (const minion of alliedMinions) {
      if (minion.isDead) continue;
      minion.stats.currentAp = minion.stats.maxAp;

      const liveEnemies = this.enemies.filter((e) => !e.isDead);
      if (liveEnemies.length === 0) break;

      const closestEnemy = liveEnemies.sort(
        (a, b) =>
          this.combatEngine.grid.manhattanDistance(minion.coord, a.coord) -
          this.combatEngine.grid.manhattanDistance(minion.coord, b.coord)
      )[0];

      const steps = this.enemyAI.planTurnSteps(minion, closestEnemy);
      this.focusedUnitId = minion.id;

      for (const step of steps) {
        if (minion.isDead || closestEnemy.isDead) break;

        if (step.type === 'move') {
          await new Promise<void>((resolve) => {
            this.renderer.animManager.animateMovement(minion.id, step.path, 130, () => {
              this.combatEngine.moveUnit(minion, step.destination);
              resolve();
            });
          });
          this.updateHUD();
          await delay(150);
        } else if (step.type === 'cast') {
          const startPos = this.renderer.gridToScreen(minion.coord);
          const targetPos = this.renderer.gridToScreen(step.targetCoord);

          await new Promise<void>((resolve) => {
            this.renderer.projManager.spawnProjectile(
              startPos,
              targetPos,
              step.ability.element,
              minion.isLifeBeing ? '#4ade80' : '#84cc16',
              200,
              () => {
                this.combatEngine.executeAbility(minion, step.ability, step.targetCoord);
                this.renderer.triggerSpellImpact(step.targetCoord, step.ability.element, false);
                if (step.ability.baseDamage > 0) {
                  this.renderer.particleEngine.addFloatingText(
                    `-${step.ability.baseDamage}`,
                    targetPos.x,
                    targetPos.y - 15,
                    minion.isLifeBeing ? '#4ade80' : '#84cc16',
                    22
                  );
                }
                this.checkAndTriggerDeaths(minion.isLifeBeing ? 'Life' : 'Undead');
                resolve();
              }
            );
          });

          this.updateHUD();
          await delay(250);
        }
      }
      this.focusedUnitId = null;
    }

    // 2. Sequential Enemy AI Turns
    this.turnManager.startEnemyTurn(this.enemies);

    for (const enemy of this.enemies) {
      if (enemy.isDead) continue;

      this.focusedUnitId = enemy.id;
      this.hud.updatePhaseBanner(`ENEMY: ${enemy.name.toUpperCase()}`);
      await delay(350);

      // Target closest player unit
      const playerTargets = this.combatEngine.getAllAllies();
      const targetUnit = playerTargets.sort(
        (a, b) =>
          this.combatEngine.grid.manhattanDistance(enemy.coord, a.coord) -
          this.combatEngine.grid.manhattanDistance(enemy.coord, b.coord)
      )[0] || this.hero;

      const steps = this.enemyAI.planTurnSteps(enemy, targetUnit);

      for (const step of steps) {
        if (enemy.isDead || this.hero.isDead) break;

        if (step.type === 'move') {
          await new Promise<void>((resolve) => {
            this.renderer.animManager.animateMovement(enemy.id, step.path, 160, () => {
              this.combatEngine.moveUnit(enemy, step.destination);
              resolve();
            });
          });
          this.updateHUD();
          await delay(250);
        } else if (step.type === 'cast') {
          const startPos = this.renderer.gridToScreen(enemy.coord);
          const targetPos = this.renderer.gridToScreen(step.targetCoord);
          const elemData = CORE_ELEMENTS[step.ability.element];
          const color = elemData ? elemData.color : '#ef4444';

          const isBeam = step.ability.name.toLowerCase().includes('beam') ||
            step.ability.name.toLowerCase().includes('ray') ||
            step.ability.name.toLowerCase().includes('lance');

          if (isBeam) {
            this.renderer.particleEngine.addBeam(startPos.x, startPos.y, targetPos.x, targetPos.y, color, 8, 300);
          }

          await new Promise<void>((resolve) => {
            this.renderer.projManager.spawnProjectile(startPos, targetPos, step.ability.element, color, 260, () => {
              const logCountBefore = this.combatEngine.logs.length;
              this.combatEngine.executeAbility(enemy, step.ability, step.targetCoord);

              const isAoE = step.ability.aoeRadius > 0;
              this.renderer.triggerSpellImpact(step.targetCoord, step.ability.element, isAoE);

              const newLogs = this.combatEngine.logs.slice(logCountBefore);
              const reactionLog = newLogs.find((l) => l.type === 'reaction');

              this.renderer.particleEngine.addFloatingText(
                `-${step.ability.baseDamage}`,
                targetPos.x,
                targetPos.y - 15,
                color,
                22
              );

              if (reactionLog) {
                this.renderer.particleEngine.addFloatingText(
                  reactionLog.message.split('!')[0] + '!',
                  targetPos.x,
                  targetPos.y - 38,
                  '#f87171',
                  24
                );
              }

              this.checkAndTriggerDeaths(step.ability.element);
              resolve();
            });
          });

          this.updateHUD();
          await delay(350);
        }
      }

      this.focusedUnitId = null;
      await delay(250);
    }

    // 3. Environment & Summons Ticks
    this.hud.updatePhaseBanner('ENVIRONMENT TICK');
    this.hazardManager.tickHazards();
    this.combatEngine.tickZombies();
    this.combatEngine.statusManager.tickStatusEffects(this.hero);
    for (const zombie of this.combatEngine.zombies) {
      this.combatEngine.statusManager.tickStatusEffects(zombie);
    }
    for (const being of this.combatEngine.lifeBeings) {
      this.combatEngine.statusManager.tickStatusEffects(being);
    }
    for (const enemy of this.enemies) {
      this.combatEngine.statusManager.tickStatusEffects(enemy);
    }
    this.checkAndTriggerDeaths();
    await delay(300);

    // Return to Player Turn
    if (!this.hero.isDead && !this.combatEngine.areAllEnemiesDead()) {
      this.turnManager.startPlayerTurn([this.hero]);
      this.isBusy = false;
      this.updateReachableTiles();
      this.updateHUD();
    }

    this.checkCombatState();
  }

  private checkCombatState(): void {
    if (this.isHotseatMode) return;

    if (this.hero.isDead) {
      this.combatEngine.addLog('system', '💀 You have fallen in combat! Game Over.');
      this.turnManager.setPhase('GAME_OVER');
      this.showDefeatModal();
      return;
    }

    if (this.combatEngine.areAllEnemiesDead()) {
      if (this.currentRound >= this.maxRounds) {
        this.showVictoryModal();
      } else {
        this.openUpgradeModal();
      }
    }
  }

  private showHotseatVictoryModal(winnerName: string): void {
    this.outcomeTitle.textContent = `🏆 ${winnerName} IS VICTORIOUS!`;
    this.outcomeSubtitle.textContent = 'A supreme demonstration of tactical elemental mastery in the Arena!';
    this.outcomeStatsList.innerHTML = `
      <div class="stat-row">
        <span>Arena Winner:</span>
        <strong style="color: #4ade80;">${winnerName}</strong>
      </div>
      <div class="stat-row">
        <span>Mode:</span>
        <strong>Hot Seat PvP (1v1)</strong>
      </div>
    `;
    this.gameOverModal.classList.remove('hidden');
  }

  private openUpgradeModal(): void {
    this.turnManager.setPhase('UPGRADE_PHASE');
    const rewards = this.scorer.calculateRoundRewards(this.combatEngine.performance);
    this.totalEssence += rewards.essence;
    this.totalXp += rewards.xp;

    // Check boss defeat unlocks
    const isBossRound = this.currentRound === 5 || this.currentRound === 10 || this.currentRound === 15;
    if (isBossRound) {
      const newlyUnlocked = this.unlockManager.checkBossDefeatUnlocks(this.currentRound);
      if (newlyUnlocked.length > 0) {
        this.combatEngine.addLog(
          'system',
          `🎉 BOSS DEFEATED! Unlocked new elemental classes: ${newlyUnlocked.join(', ')}!`
        );
      }
    }

    this.modalEssence.textContent = `${this.totalEssence}`;
    this.modalXp.textContent = `${this.totalXp}`;

    this.upgradeChoicesContainer.innerHTML = '';

    this.hero.abilities.slice(0, 3).forEach((ability) => {
      const card = document.createElement('div');
      card.className = 'upgrade-card';
      card.innerHTML = `
        <div class="upgrade-header">
          <span class="upgrade-icon">${ability.icon}</span>
          <div>
            <div class="upgrade-name">Enhance: ${ability.name} (Lv. ${ability.level + 1})</div>
            <div class="upgrade-type">SPELL EMPOWERMENT • +30% DMG</div>
          </div>
        </div>
        <div class="upgrade-desc">Empower ${ability.name} with increased elemental damage and range.</div>
      `;
      card.onclick = () => {
        this.upgradeManager.upgradeAbility(this.hero, ability.id);
        this.combatEngine.addLog('system', `Upgraded ${ability.name} to Level ${ability.level}!`);
        this.advanceToNextRound();
      };
      this.upgradeChoicesContainer.appendChild(card);
    });

    this.upgradeModal.classList.remove('hidden');
  }

  private advanceToNextRound(): void {
    this.upgradeModal.classList.add('hidden');
    this.currentRound += 1;

    // Reset round state
    this.combatEngine.resetRoundState();
    this.hero.coord = { x: 1, y: 1 };

    // Generate new enemies for this round
    this.enemies = this.escalationManager.generateRoundEnemies(this.currentRound);
    this.combatEngine.enemies = this.enemies;

    // Update round indicator
    const roundBadge = document.getElementById('round-indicator');
    if (roundBadge) {
      const isBoss = this.currentRound === 5 || this.currentRound === 10 || this.currentRound === 15;
      roundBadge.textContent = isBoss ? `👑 BOSS ROUND ${this.currentRound}` : `ROUND ${this.currentRound} / ${this.maxRounds}`;
      roundBadge.style.color = isBoss ? '#fbbf24' : '#38bdf8';
    }

    this.turnManager.startPlayerTurn([this.hero]);
    this.isBusy = false;
    this.updateReachableTiles();
    this.updateHUD();
  }

  private showVictoryModal(): void {
    this.turnManager.setPhase('VICTORY');
    this.outcomeTitle.textContent = 'GAUNTLET CONQUERED!';
    this.outcomeSubtitle.textContent = 'You have mastered all 15 rounds of the Elemental Mayhem!';
    this.renderOutcomeStats();
    this.gameOverModal.classList.remove('hidden');
  }

  private showDefeatModal(): void {
    this.turnManager.setPhase('GAME_OVER');
    this.outcomeTitle.textContent = 'DEFEATED IN BATTLE';
    this.outcomeSubtitle.textContent = `You fell on Round ${this.currentRound}. Re-arm and try again!`;
    this.renderOutcomeStats();
    this.gameOverModal.classList.remove('hidden');
  }

  private renderOutcomeStats(): void {
    this.outcomeStatsList.innerHTML = `
      <div class="stat-row">
        <span>Rounds Completed:</span>
        <strong>${this.currentRound - 1} / ${this.maxRounds}</strong>
      </div>
      <div class="stat-row">
        <span>Total Essence:</span>
        <strong>${this.totalEssence}</strong>
      </div>
      <div class="stat-row">
        <span>Total XP:</span>
        <strong>${this.totalXp}</strong>
      </div>
    `;
  }

  private restartGame(element: ElementType): void {
    this.hideHomeScreen();
    this.gameOverModal.classList.add('hidden');
    this.currentRound = 1;
    this.totalEssence = 0;
    this.totalXp = 0;
    this.selectedElement = element;
    this.isHotseatMode = false;

    this.hero = this.createHero(element);
    this.enemies = this.escalationManager.generateRoundEnemies(1);

    this.grid = new Grid(10);
    this.hazardManager = new TileHazardManager(this.grid);
    this.setupObstacles();

    this.combatEngine = new CombatEngine(this.grid, this.hazardManager, this.hero, this.enemies);
    const canvas = document.getElementById('battlefield-canvas') as HTMLCanvasElement;
    this.renderer = new BattlefieldRenderer(canvas, this.combatEngine);
    this.enemyAI = new EnemyAI(this.combatEngine);

    const roundBadge = document.getElementById('round-indicator');
    if (roundBadge) {
      roundBadge.textContent = `ROUND 1 / ${this.maxRounds}`;
      roundBadge.style.color = '#38bdf8';
    }

    this.turnManager.startPlayerTurn([this.hero]);
    this.isBusy = false;
    this.updateReachableTiles();
    this.updateHUD();
  }

  private updateReachableTiles(): void {
    const activeUnit = this.getActivePlayerUnit();
    this.reachableTiles = [];
    const maxSteps = Math.floor(activeUnit.stats.currentAp / activeUnit.stats.moveCostPerTile);
    if (maxSteps <= 0) return;

    for (let x = 0; x < this.grid.size; x++) {
      for (let y = 0; y < this.grid.size; y++) {
        const coord = { x, y };
        if (this.grid.getTile(coord)?.isObstacle) continue;
        if (this.combatEngine.getUnitAt(coord) !== null) continue;

        const path = this.grid.findPath(activeUnit.coord, coord);
        if (path && path.length > 0 && path.length <= maxSteps) {
          this.reachableTiles.push(coord);
        }
      }
    }
  }

  private updateHUD(): void {
    const activeUnit = this.getActivePlayerUnit();
    this.hud.updateHeroStatus(activeUnit);
    this.hud.renderAbilities(
      activeUnit.abilities,
      this.selectedAbility?.id || null,
      activeUnit.stats.currentAp,
      (ability) => this.selectAbility(ability)
    );

    const essenceEl = document.getElementById('essence-counter');
    const xpEl = document.getElementById('xp-counter');
    if (essenceEl) essenceEl.textContent = `${this.totalEssence}`;
    if (xpEl) xpEl.textContent = `${this.totalXp}`;

    const logList = document.getElementById('combat-log-list');
    if (logList) {
      logList.innerHTML = this.combatEngine.logs
        .slice(0, 15)
        .map((log) => `<div class="log-entry log-${log.type}">${log.message}</div>`)
        .join('');
    }
  }

  private gameLoop(): void {
    const now = performance.now();
    const deltaTimeMs = Math.min(now - this.lastFrameTime, 100);
    this.lastFrameTime = now;

    // If home screen is visible, render particle cosmos
    if (!this.homeScreen.classList.contains('hidden')) {
      this.updateAndRenderHomeParticles();
    }

    this.renderer.update(deltaTimeMs);
    this.renderer.render(
      this.hoveredCoord,
      this.reachableTiles,
      this.targetableTiles,
      this.focusedUnitId
    );

    requestAnimationFrame(() => this.gameLoop());
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new GameApp();
});
