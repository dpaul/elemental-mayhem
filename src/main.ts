// Elemental Mayhem - Main Application & Game Loop Controller
import { Grid } from './engine/Grid';
import { TileHazardManager } from './engine/TileHazardManager';
import { CombatEngine } from './engine/CombatEngine';
import { TurnManager } from './engine/TurnManager';
import { TurnTimer } from './engine/TurnTimer';
import { EnemyAI } from './engine/EnemyAI';
import { PerformanceScorer } from './engine/PerformanceScorer';
import { UpgradeManager, LevelUpResult } from './engine/UpgradeManager';
import { EscalationManager } from './engine/EscalationManager';
import { UnlockManager } from './engine/UnlockManager';
import { AdminManager } from './engine/AdminManager';
import { BattlefieldRenderer } from './renderer/BattlefieldRenderer';
import { HUDManager } from './ui/HUDManager';
import { SoundEngine } from './audio/SoundEngine';
import { SaveManager, GameSaveData, SavedHazardTile } from './engine/SaveManager';
import { PlacementManager } from './engine/PlacementManager';
import { OriginCutsceneManager } from './engine/OriginCutscene';
import { EssenceMergeManager } from './engine/EssenceMergeManager';
import { EssenceFusionModal } from './ui/EssenceFusionModal';
import { ElementType, Unit, Ability, GridCoord, ZombieClass, TileHazardType, PlacementItem, PlacementCategory } from './types';
import { CORE_ELEMENTS } from './constants/elements';
import { HERO_CLASSES, createHeroForElement, createSandboxHero, registerAdminAbility, createAdminPower, onAdminAbilityRegistered, populateAdminAbilities, auditAndPromoteOverpoweredAbilities, isOverpoweredAbility } from './constants/classes';
import { NetworkManager } from './network/NetworkManager';
import { NetworkMessage } from './network/NetworkMessages';

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

interface HomeStar {
  x: number;
  y: number;
  originX: number;
  originY: number;
  vx: number;
  vy: number;
  baseVx: number;
  baseVy: number;
  size: number;
  color: string;
  glowColor: string;
  alpha: number;
  baseAlpha: number;
  pulseSpeed: number;
  pulsePhase: number;
  layer: number;
  angle: number;
  rotSpeed: number;
  spikes: number;
}

interface StardustSpark {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
  life: number;
}

interface CosmicNova {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  color: string;
  alpha: number;
}

interface ShootingStar {
  x: number;
  y: number;
  vx: number;
  vy: number;
  length: number;
  color: string;
  life: number;
  maxLife: number;
}

interface StargazerEye {
  x: number;
  y: number;
  baseX: number;
  baseY: number;
  size: number;
  color: string;
  glowColor: string;
  pupilOffsetX: number;
  pupilOffsetY: number;
  blinkTimer: number;
  blinkProgress: number; // 0 = open, 1 = fully closed
  isBlinking: boolean;
}

function drawStarCross(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  outerRadius: number,
  innerRadius: number,
  angle: number,
  color: string,
  glow: string
): void {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(angle);
  ctx.fillStyle = color;
  ctx.shadowColor = glow;
  ctx.shadowBlur = 14;

  ctx.beginPath();
  const points = 4;
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? outerRadius : innerRadius;
    const a = (i * Math.PI) / points;
    const px = Math.cos(a) * r;
    const py = Math.sin(a) * r;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();

  // Incandescent white core
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(0, 0, Math.max(1, innerRadius * 0.7), 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

export class GameApp {
  private grid: Grid;
  private hazardManager: TileHazardManager;
  private combatEngine: CombatEngine;
  private turnManager: TurnManager;
  private autoTurnTimer: TurnTimer;
  private enemyAI: EnemyAI;
  private scorer: PerformanceScorer;
  private upgradeManager: UpgradeManager;
  private escalationManager: EscalationManager;
  private unlockManager: UnlockManager;
  public adminManager: AdminManager;
  private renderer: BattlefieldRenderer;
  private hud: HUDManager;
  public soundEngine: SoundEngine;

  private hero: Unit;
  private enemies: Unit[];
  private currentRound: number = 1;
  private maxRounds: number = 1e49;
  public static readonly MAX_ROUNDS_STR: string = '10000000000000000000000000000000000000000000000000';
  private maxRoundsStr: string = GameApp.MAX_ROUNDS_STR;
  private selectedElement: ElementType = 'Fire';
  private selectedClassCategory: string = 'All';

  private totalEssence: number = 0;
  private totalXp: number = 0;

  private selectedAbility: Ability | null = null;
  private hoveredCoord: GridCoord | null = null;
  private reachableTiles: GridCoord[] = [];
  private targetableTiles: GridCoord[] = [];

  private isBusy: boolean = false;
  private isHeroDeathAnimating: boolean = false;
  private isRoundVictoryAnimating: boolean = false;
  private focusedUnitId: string | null = null;
  private lastFrameTime: number = performance.now();
  private deadUnitIds: Set<string> = new Set();

  // Home Screen & Starfield Background
  private homeScreen: HTMLElement;
  private homeParticlesCanvas: HTMLCanvasElement;
  private homeParticlesCtx: CanvasRenderingContext2D | null = null;
  private homeStars: HomeStar[] = [];
  private stardustSparks: StardustSpark[] = [];
  private homeNovas: CosmicNova[] = [];
  private shootingStars: ShootingStar[] = [];
  private stargazerEyes: StargazerEye[] = [];
  private nextShootingStarCounter: number = 60;
  private homeBtnCampaign: HTMLElement;
  private homeBtnHotseat: HTMLElement;
  private homeBtnCodex: HTMLElement;
  private homeBtnGuide: HTMLElement;
  private homeMouseX: number = -9999;
  private homeMouseY: number = -9999;
  private homeLastMouseX: number = -9999;
  private homeLastMouseY: number = -9999;
  private homeParallaxX: number = 0;
  private homeParallaxY: number = 0;

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

  // Sandbox Mode
  private isSandboxMode: boolean = false;
  private sandboxInfiniteAp: boolean = false;
  private sandboxGodMode: boolean = false;
  private sandboxAiEnabled: boolean = false;
  private sandboxToolbar: HTMLElement | null = null;
  private sandboxHeroAffinitySelect: HTMLSelectElement | null = null;
  private sandboxDummyElementSelect: HTMLSelectElement | null = null;
  private sandboxDummyHpSelect: HTMLSelectElement | null = null;

  // Arena Placement & Builder
  public placementManager: PlacementManager = new PlacementManager();
  public activePlacementItem: PlacementItem | null = null;
  public placementCategory: PlacementCategory = 'enemy';
  public placementEnemySubfilter: string = 'all';
  private lastPlacedCoord: GridCoord | null = null;
  private isPlacementMouseDown: boolean = false;
  private sandboxPlacementPanel: HTMLElement | null = null;
  private sandboxActiveBrushBar: HTMLElement | null = null;
  private activeBrushBadge: HTMLElement | null = null;
  private placementGrid: HTMLElement | null = null;
  private sandboxBoardPlacementBar: HTMLElement | null = null;
  private sandboxQuickEnemySelect: HTMLSelectElement | null = null;
  private sandboxBoardPlaceEnemyBtn: HTMLButtonElement | null = null;
  private sandboxContextMenu: HTMLElement | null = null;
  private contextMenuCoord: GridCoord | null = null;

  // Online Co-op Mode
  private networkManager: NetworkManager;
  public originCutscene: OriginCutsceneManager;
  public essenceMergeManager: EssenceMergeManager;
  public essenceFusionModal: EssenceFusionModal;
  private navFusionBtn: HTMLElement | null = null;
  private isCoopMode: boolean = false;
  private coopLocalPlayer: 1 | 2 = 1;
  private coopP1Element: ElementType = 'Fire';
  private coopP2Element: ElementType = 'Water';
  private lastCursorHoverSent: number = 0;

  // Co-op Modal Elements
  private coopModal: HTMLElement;
  private closeCoopBtn: HTMLElement;
  private coopTabHost: HTMLElement;
  private coopTabJoin: HTMLElement;
  private coopHostPanel: HTMLElement;
  private coopJoinPanel: HTMLElement;
  private coopHostRoomCode: HTMLElement;
  private coopCopyCodeBtn: HTMLElement;
  private coopHostStatus: HTMLElement;
  private coopHostLaunchBtn: HTMLButtonElement;
  private coopHostPartnerCard: HTMLElement;
  private coopPartnerAvatar: HTMLElement;
  private coopPartnerName: HTMLElement;
  private coopPartnerClass: HTMLElement;
  private coopJoinCodeInput: HTMLInputElement;
  private coopJoinConnectBtn: HTMLElement;
  private coopJoinStatus: HTMLElement;
  private coopJoinWaitingBox: HTMLElement;
  private coopHostElementGrid: HTMLElement;
  private coopJoinElementGrid: HTMLElement;
  private navCoopBtn: HTMLElement | null;

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

  // Save & Resume Game State
  public saveManager: SaveManager;
  private resumeRunModal: HTMLElement;
  private resumeRunDetails: HTMLElement;
  private resumeGameBtn: HTMLElement;
  private discardSaveBtn: HTMLElement;
  private homeBtnResume: HTMLElement | null;
  private homeBtnResumeCta: HTMLElement | null;
  private homeResumeActionBtn: HTMLElement | null;
  private homeResumeDiscardBtn: HTMLElement | null;

  constructor() {
    const canvas = document.getElementById('battlefield-canvas') as HTMLCanvasElement;
    this.grid = new Grid(10);
    this.hazardManager = new TileHazardManager(this.grid);
    this.turnManager = new TurnManager();
    this.autoTurnTimer = new TurnTimer({
      durationSeconds: 10,
      onTick: (secondsLeft) => {
        this.hud.updateEndTurnCountdown(secondsLeft);
      },
      onExpire: () => {
        this.hud.updateEndTurnCountdown(null);
        if (!this.isBusy) {
          this.endPlayerTurn();
        } else {
          const checkBusy = setInterval(() => {
            if (!this.isBusy) {
              clearInterval(checkBusy);
              this.endPlayerTurn();
            }
          }, 100);
        }
      },
    });
    this.scorer = new PerformanceScorer();
    this.upgradeManager = new UpgradeManager();
    this.escalationManager = new EscalationManager();
    this.unlockManager = new UnlockManager();
    this.essenceMergeManager = new EssenceMergeManager(this.unlockManager);
    this.adminManager = new AdminManager();

    // Auto-Grant Admin to User (DavePaul / Creator)
    // Ensures all admin powers and all elements are immediately accessible.
    // If user has not explicitly clicked "Lock Console", grant admin credentials.
    const explicitLogout = typeof window !== 'undefined' && window.localStorage?.getItem('elemental_mayhem_admin_explicit_logout') === 'true';
    if (!explicitLogout) {
      this.adminManager.authenticate('190846214');
      this.unlockManager.setAdminOverride(true);
    }

    // Live Admin Power Listener:
    // Whenever a new admin power is created or registered, instantly grant it to the player!
    onAdminAbilityRegistered((newAbility) => {
      if (this.hasAdminAccess() || this.selectedElement === 'Admin' || this.hero?.stats?.elementalAffinity === 'Admin') {
        if (this.hero && this.hero.abilities) {
          const existingIdx = this.hero.abilities.findIndex((a) => a.id === newAbility.id);
          if (existingIdx >= 0) {
            this.hero.abilities[existingIdx] = { ...newAbility, currentCooldown: 0 };
          } else {
            this.hero.abilities.unshift({ ...newAbility, currentCooldown: 0 });
          }
          this.updateHUD();
          this.combatEngine?.addLog('system', `👑 INSTANT ADMIN POWER: ${newAbility.name} added to your arsenal!`);
          this.renderer?.particleEngine?.triggerScreenShake(6, 200);
          if (this.renderer && this.hero.coord) {
            const heroPos = this.renderer.gridToScreen(this.hero.coord);
            this.renderer.particleEngine.addFloatingText(`👑 NEW POWER: ${newAbility.name}!`, heroPos.x, heroPos.y - 35, '#ec4899', 24);
          }
          if (this.soundEngine) {
            this.soundEngine.playLevelUp();
          }
        }
      }
    });

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

    // Save & Resume Elements
    this.saveManager = new SaveManager();
    this.resumeRunModal = document.getElementById('resume-run-modal')!;
    this.resumeRunDetails = document.getElementById('resume-run-details')!;
    this.resumeGameBtn = document.getElementById('resume-game-btn')!;
    this.discardSaveBtn = document.getElementById('discard-save-btn')!;
    this.homeBtnResume = document.getElementById('home-btn-resume');
    this.homeBtnResumeCta = document.getElementById('home-btn-resume-cta');
    this.homeResumeActionBtn = document.getElementById('home-resume-action-btn');
    this.homeResumeDiscardBtn = document.getElementById('home-resume-discard-btn');

    // Hotseat modal elements
    this.hotseatSelectModal = document.getElementById('hotseat-select-modal')!;
    this.hotseatModalTitle = document.getElementById('hotseat-modal-title')!;
    this.hotseatModalSubtitle = document.getElementById('hotseat-modal-subtitle')!;
    this.hotseatClassSelectContainer = document.getElementById('hotseat-class-select-container')!;
    this.pvpArenaBtn = document.getElementById('pvp-arena-btn');

    // Online Co-op Elements & Network Manager
    this.networkManager = new NetworkManager();
    this.coopModal = document.getElementById('coop-modal')!;
    this.closeCoopBtn = document.getElementById('close-coop-btn')!;
    this.coopTabHost = document.getElementById('coop-tab-host')!;
    this.coopTabJoin = document.getElementById('coop-tab-join')!;
    this.coopHostPanel = document.getElementById('coop-host-panel')!;
    this.coopJoinPanel = document.getElementById('coop-join-panel')!;
    this.coopHostRoomCode = document.getElementById('coop-host-room-code')!;
    this.coopCopyCodeBtn = document.getElementById('coop-copy-code-btn')!;
    this.coopHostStatus = document.getElementById('coop-host-status')!;
    this.coopHostLaunchBtn = document.getElementById('coop-host-launch-btn') as HTMLButtonElement;
    this.coopHostPartnerCard = document.getElementById('coop-host-partner-card')!;
    this.coopPartnerAvatar = document.getElementById('coop-partner-avatar')!;
    this.coopPartnerName = document.getElementById('coop-partner-name')!;
    this.coopPartnerClass = document.getElementById('coop-partner-class')!;
    this.coopJoinCodeInput = document.getElementById('coop-join-code-input') as HTMLInputElement;
    this.coopJoinConnectBtn = document.getElementById('coop-join-connect-btn')!;
    this.coopJoinStatus = document.getElementById('coop-join-status')!;
    this.coopJoinWaitingBox = document.getElementById('coop-join-waiting-box')!;
    this.coopHostElementGrid = document.getElementById('coop-host-element-grid')!;
    this.coopJoinElementGrid = document.getElementById('coop-join-element-grid')!;
    this.navCoopBtn = document.getElementById('nav-coop-btn');

    // Sandbox UI Elements
    this.sandboxToolbar = document.getElementById('sandbox-toolbar');
    this.sandboxHeroAffinitySelect = document.getElementById('sandbox-hero-affinity') as HTMLSelectElement | null;
    this.sandboxDummyElementSelect = document.getElementById('sandbox-dummy-element') as HTMLSelectElement | null;
    this.sandboxDummyHpSelect = document.getElementById('sandbox-dummy-hp') as HTMLSelectElement | null;
    this.sandboxPlacementPanel = document.getElementById('sandbox-placement-panel');
    this.sandboxActiveBrushBar = document.getElementById('sandbox-active-brush-bar');
    this.activeBrushBadge = document.getElementById('active-brush-badge');
    this.placementGrid = document.getElementById('placement-items-grid');
    this.sandboxBoardPlacementBar = document.getElementById('sandbox-board-placement-bar');
    this.sandboxQuickEnemySelect = document.getElementById('sandbox-quick-enemy-select') as HTMLSelectElement | null;
    this.sandboxBoardPlaceEnemyBtn = document.getElementById('sandbox-board-place-enemy-btn') as HTMLButtonElement | null;
    this.sandboxContextMenu = document.getElementById('sandbox-board-context-menu');
    this.initSandboxUI();

    this.hero = this.createHero(this.selectedElement);
    this.enemies = this.escalationManager.generateRoundEnemies(1);

    this.combatEngine = new CombatEngine(this.grid, this.hazardManager, this.hero, this.enemies);
    this.soundEngine = new SoundEngine();
    this.originCutscene = new OriginCutsceneManager(this.soundEngine);
    this.originCutscene.initDOM();
    this.originCutscene.onEnterArena = () => {
      this.hideHomeScreen();
      this.renderCharacterSelectModal();
      this.characterSelectModal.classList.remove('hidden');
    };
    this.originCutscene.onOpenSandbox = () => {
      this.startSandboxMode();
    };
    this.originCutscene.onWarpToVoidOverlord = () => {
      this.goToVoidOverlord(true);
    };

    this.essenceFusionModal = new EssenceFusionModal(this.essenceMergeManager, this.soundEngine);
    this.essenceFusionModal.onMergeSuccess = (result) => {
      this.combatEngine?.addLog('system', result.message);
      if (this.hero && this.hero.coord && this.renderer) {
        const heroPos = this.renderer.gridToScreen(this.hero.coord);
        this.renderer.particleEngine.addFloatingText(`✨ FORGED: ${result.element}!`, heroPos.x, heroPos.y - 45, '#facc15', 26);
      }
      this.updateHUD();
    };

    this.navFusionBtn = document.getElementById('nav-fusion-btn');
    this.navFusionBtn?.addEventListener('click', () => {
      this.soundEngine.playClick();
      this.essenceFusionModal.open();
    });

    document.getElementById('admin-btn-round-30')?.addEventListener('click', () => {
      this.soundEngine.playClick();
      this.closeAdminPanel();
      this.goToRound30(true);
    });

    document.getElementById('admin-btn-grant-essence-pairs')?.addEventListener('click', () => {
      this.soundEngine.playUnlock();
      this.executeAdminCommand('give pairs');
    });

    if (typeof window !== 'undefined') {
      (window as any).goToVoidOverlord = () => this.goToVoidOverlord(true);
      (window as any).goToRound1000 = () => this.goToVoidOverlord(true);
      (window as any).goToRound30 = () => this.goToRound30(true);
      (window as any).openFusionArea = () => this.essenceFusionModal.open();
    }
    this.attachCombatEngineHooks(this.combatEngine);
    this.enemyAI = new EnemyAI(this.combatEngine);
    this.renderer = new BattlefieldRenderer(canvas, this.combatEngine);
    this.hud = new HUDManager();

    this.setupCategoryTabs();
    this.setupCodexTabs();
    this.setupObstacles();
    this.setupEventListeners(canvas);
    this.setupNetworkHandlers();
    this.setupCoopLobbyUI();
    this.updateAdminUI();
    this.updateReachableTiles();
    this.updateHUD();

    // Check URL parameters for instant co-op room invite
    const urlParams = new URLSearchParams(window.location.search);
    const coopInvite = urlParams.get('coop');
    if (coopInvite) {
      setTimeout(() => {
        this.openCoopModal('join', coopInvite);
      }, 200);
    }

    // Start Game Loop
    this.lastFrameTime = performance.now();
    this.gameLoop();

    // Check for unfinished active run on startup and display menu tile
    this.updateHomeResumeTile();
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

    // Window-wide pointer tracking for ultra-responsive mouse reaction
    window.addEventListener('pointermove', (e) => {
      if (this.homeLastMouseX > -500) {
        const dx = e.clientX - this.homeLastMouseX;
        const dy = e.clientY - this.homeLastMouseY;
        const speed = Math.hypot(dx, dy);

        // Spawn sparkling stardust trail on movement
        if (speed > 2 && this.stardustSparks.length < 120) {
          const sparkPalette = ['#38bdf8', '#ffd000', '#f43f5e', '#a855f7', '#ffffff', '#22c55e', '#ec4899'];
          const count = Math.min(4, Math.floor(speed / 6) + 1);
          for (let s = 0; s < count; s++) {
            this.stardustSparks.push({
              x: e.clientX + (Math.random() - 0.5) * 14,
              y: e.clientY + (Math.random() - 0.5) * 14,
              vx: (Math.random() - 0.5) * 3.5 - dx * 0.15,
              vy: (Math.random() - 0.5) * 3.5 - dy * 0.15,
              size: Math.random() * 3.2 + 1.2,
              color: sparkPalette[Math.floor(Math.random() * sparkPalette.length)],
              alpha: 0.95,
              life: 1.0,
            });
          }
        }
      }
      this.homeLastMouseX = this.homeMouseX;
      this.homeLastMouseY = this.homeMouseY;
      this.homeMouseX = e.clientX;
      this.homeMouseY = e.clientY;
    });

    window.addEventListener('pointerleave', () => {
      this.homeMouseX = -9999;
      this.homeMouseY = -9999;
      this.homeLastMouseX = -9999;
      this.homeLastMouseY = -9999;
    });

    // Mouse Click Shockwave / Starburst Reaction
    window.addEventListener('pointerdown', (e) => {
      if (this.homeScreen.classList.contains('hidden')) return;
      this.triggerHomeClickNova(e.clientX, e.clientY);
    });

    const starColors = [
      { color: '#ffffff', glow: 'rgba(255, 255, 255, 0.9)' }, // Starlight White
      { color: '#93c5fd', glow: 'rgba(147, 197, 253, 0.9)' }, // Celestial Blue
      { color: '#38bdf8', glow: 'rgba(56, 189, 248, 0.9)' },  // Primal Cyan
      { color: '#fde047', glow: 'rgba(253, 224, 71, 0.9)' },  // Solar Gold
      { color: '#ffd000', glow: 'rgba(255, 208, 0, 0.9)' },   // Lightning Amber
      { color: '#ec4899', glow: 'rgba(236, 72, 153, 0.9)' },  // Admin Magenta
      { color: '#c084fc', glow: 'rgba(192, 132, 252, 0.9)' }, // Void Amethyst
      { color: '#f43f5e', glow: 'rgba(244, 63, 94, 0.9)' },   // Crimson Fire
      { color: '#4ade80', glow: 'rgba(74, 222, 128, 0.9)' },  // Nature Emerald
    ];

    this.homeStars = [];
    const totalStars = 210;

    for (let i = 0; i < totalStars; i++) {
      let layer = 1;
      let size = Math.random() * 1.5 + 1.2;
      let baseAlpha = Math.random() * 0.35 + 0.35;
      let baseSpeed = 0.25;
      let spikes = 0;

      if (i >= 80 && i < 155) {
        layer = 2;
        size = Math.random() * 2.5 + 2.5;
        baseAlpha = Math.random() * 0.4 + 0.6;
        baseSpeed = 0.4;
        spikes = 4;
      } else if (i >= 155) {
        layer = 3;
        size = Math.random() * 3.5 + 4.5;
        baseAlpha = Math.random() * 0.25 + 0.75;
        baseSpeed = 0.55;
        spikes = 4;
      }

      const c = starColors[Math.floor(Math.random() * starColors.length)];
      const startX = Math.random() * window.innerWidth;
      const startY = Math.random() * window.innerHeight;

      this.homeStars.push({
        x: startX,
        y: startY,
        originX: startX,
        originY: startY,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
        baseVx: (Math.random() - 0.5) * baseSpeed,
        baseVy: (Math.random() - 0.5) * baseSpeed,
        size: size,
        color: c.color,
        glowColor: c.glow,
        alpha: baseAlpha,
        baseAlpha: baseAlpha,
        pulseSpeed: Math.random() * 0.04 + 0.018,
        pulsePhase: Math.random() * Math.PI * 2,
        layer: layer,
        angle: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 0.02,
        spikes: spikes,
      });
    }

    // Initialize 2 pairs of celestial Stargazer Eyes ("Stares" that track the mouse)
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.stargazerEyes = [
      // Left celestial watcher pair
      {
        x: w * 0.14,
        y: h * 0.22,
        baseX: w * 0.14,
        baseY: h * 0.22,
        size: 18,
        color: '#38bdf8',
        glowColor: 'rgba(56, 189, 248, 0.8)',
        pupilOffsetX: 0,
        pupilOffsetY: 0,
        blinkTimer: 180 + Math.random() * 120,
        blinkProgress: 0,
        isBlinking: false,
      },
      {
        x: w * 0.19,
        y: h * 0.21,
        baseX: w * 0.19,
        baseY: h * 0.21,
        size: 18,
        color: '#38bdf8',
        glowColor: 'rgba(56, 189, 248, 0.8)',
        pupilOffsetX: 0,
        pupilOffsetY: 0,
        blinkTimer: 180 + Math.random() * 120,
        blinkProgress: 0,
        isBlinking: false,
      },
      // Right celestial watcher pair
      {
        x: w * 0.81,
        y: h * 0.21,
        baseX: w * 0.81,
        baseY: h * 0.21,
        size: 18,
        color: '#c084fc',
        glowColor: 'rgba(192, 132, 252, 0.8)',
        pupilOffsetX: 0,
        pupilOffsetY: 0,
        blinkTimer: 240 + Math.random() * 120,
        blinkProgress: 0,
        isBlinking: false,
      },
      {
        x: w * 0.86,
        y: h * 0.22,
        baseX: w * 0.86,
        baseY: h * 0.22,
        size: 18,
        color: '#c084fc',
        glowColor: 'rgba(192, 132, 252, 0.8)',
        pupilOffsetX: 0,
        pupilOffsetY: 0,
        blinkTimer: 240 + Math.random() * 120,
        blinkProgress: 0,
        isBlinking: false,
      },
    ];
  }

  private triggerHomeClickNova(clickX: number, clickY: number): void {
    // 1. Expand luminous shockwave ring
    this.homeNovas.push({
      x: clickX,
      y: clickY,
      radius: 10,
      maxRadius: 300,
      color: '#38bdf8',
      alpha: 0.9,
    });

    // 2. Strongly blast and scatter nearby stars
    for (const star of this.homeStars) {
      const dx = star.x - clickX;
      const dy = star.y - clickY;
      const dist = Math.hypot(dx, dy);
      if (dist < 320 && dist > 1) {
        const force = Math.pow(1 - dist / 320, 1.5) * 22;
        star.vx += (dx / dist) * force;
        star.vy += (dy / dist) * force;
      }
    }

    // 3. Erupt radial burst of stardust sparks
    const sparkCount = 24;
    const colors = ['#ffffff', '#38bdf8', '#ffd000', '#ec4899', '#a855f7', '#4ade80'];
    for (let i = 0; i < sparkCount; i++) {
      const angle = (Math.PI * 2 * i) / sparkCount + (Math.random() - 0.5) * 0.2;
      const speed = Math.random() * 6.5 + 4;
      this.stardustSparks.push({
        x: clickX,
        y: clickY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: Math.random() * 3.8 + 1.6,
        color: colors[i % colors.length],
        alpha: 1.0,
        life: 1.0,
      });
    }
  }

  private updateAndRenderHomeParticles(): void {
    if (!this.homeParticlesCtx || !this.homeParticlesCanvas) return;
    const ctx = this.homeParticlesCtx;
    const w = this.homeParticlesCanvas.width;
    const h = this.homeParticlesCanvas.height;
    ctx.clearRect(0, 0, w, h);

    const centerX = w / 2;
    const centerY = h / 2;
    const hasMouse = this.homeMouseX > -500;

    // Smooth 3D Parallax offset based on cursor position
    const targetParallaxX = hasMouse ? (this.homeMouseX - centerX) * 0.05 : 0;
    const targetParallaxY = hasMouse ? (this.homeMouseY - centerY) * 0.05 : 0;
    this.homeParallaxX += (targetParallaxX - this.homeParallaxX) * 0.08;
    this.homeParallaxY += (targetParallaxY - this.homeParallaxY) * 0.08;

    // Deep cosmic nebula aura
    const grad = ctx.createRadialGradient(centerX, centerY, 30, centerX, centerY, Math.max(w, h) * 0.75);
    grad.addColorStop(0, 'rgba(56, 189, 248, 0.09)');
    grad.addColorStop(0.35, 'rgba(139, 92, 246, 0.06)');
    grad.addColorStop(0.7, 'rgba(15, 23, 42, 0.03)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // -------------------------------------------------------------
    // 1. CELESTIAL STARGAZER EYES ("Stares" that track the mouse)
    // -------------------------------------------------------------
    for (const eye of this.stargazerEyes) {
      // Natural blinking animation
      eye.blinkTimer--;
      if (eye.blinkTimer <= 0) {
        eye.isBlinking = true;
        eye.blinkProgress += 0.12;
        if (eye.blinkProgress >= 1) {
          eye.blinkProgress = 0;
          eye.isBlinking = false;
          eye.blinkTimer = 180 + Math.random() * 240;
        }
      }

      // Smoothly direct pupil toward mouse coordinates
      const eyeDrawX = eye.baseX + this.homeParallaxX * 0.7;
      const eyeDrawY = eye.baseY + this.homeParallaxY * 0.7;
      let targetPupilX = 0;
      let targetPupilY = 0;

      if (hasMouse) {
        const dx = this.homeMouseX - eyeDrawX;
        const dy = this.homeMouseY - eyeDrawY;
        const dist = Math.hypot(dx, dy);
        const maxOffset = eye.size * 0.45;
        const angle = Math.atan2(dy, dx);
        const pull = Math.min(1, dist / 200) * maxOffset;
        targetPupilX = Math.cos(angle) * pull;
        targetPupilY = Math.sin(angle) * pull;
      }

      eye.pupilOffsetX += (targetPupilX - eye.pupilOffsetX) * 0.12;
      eye.pupilOffsetY += (targetPupilY - eye.pupilOffsetY) * 0.12;

      ctx.save();
      const openHeight = eye.size * (1 - eye.blinkProgress * 0.95);

      // Outer ethereal astral aura
      ctx.shadowColor = eye.glowColor;
      ctx.shadowBlur = 18;
      ctx.strokeStyle = eye.color;
      ctx.lineWidth = 1.8;

      // Celestial Almond Eye Contour
      ctx.beginPath();
      ctx.ellipse(eyeDrawX, eyeDrawY, eye.size * 1.5, Math.max(1, openHeight * 0.8), 0, 0, Math.PI * 2);
      ctx.stroke();

      if (openHeight > 2) {
        // Glowing Iris
        ctx.fillStyle = eye.glowColor;
        ctx.beginPath();
        ctx.arc(eyeDrawX + eye.pupilOffsetX, eyeDrawY + eye.pupilOffsetY, eye.size * 0.5, 0, Math.PI * 2);
        ctx.fill();

        // Staring Incandescent Pupil
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = '#ffffff';
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(eyeDrawX + eye.pupilOffsetX, eyeDrawY + eye.pupilOffsetY, eye.size * 0.22, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    }

    // -------------------------------------------------------------
    // 2. CONSTELLATION MESH (Links between nearby stars)
    // -------------------------------------------------------------
    const len = this.homeStars.length;
    for (let i = 0; i < len; i++) {
      const s1 = this.homeStars[i];
      const pMult1 = s1.layer === 1 ? 0.35 : (s1.layer === 2 ? 0.85 : 1.6);
      const x1 = s1.x + this.homeParallaxX * pMult1;
      const y1 = s1.y + this.homeParallaxY * pMult1;

      for (let j = i + 1; j < len; j++) {
        const s2 = this.homeStars[j];
        const pMult2 = s2.layer === 1 ? 0.35 : (s2.layer === 2 ? 0.85 : 1.6);
        const x2 = s2.x + this.homeParallaxX * pMult2;
        const y2 = s2.y + this.homeParallaxY * pMult2;

        const dx = x1 - x2;
        const dy = y1 - y2;
        const distSq = dx * dx + dy * dy;
        const maxDist = 95;
        if (distSq < maxDist * maxDist) {
          const dist = Math.sqrt(distSq);
          const lineAlpha = (1 - dist / maxDist) * 0.18;
          ctx.strokeStyle = s1.color;
          ctx.globalAlpha = lineAlpha;
          ctx.lineWidth = 0.8;
          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);
          ctx.stroke();
        }
      }
    }

    // -------------------------------------------------------------
    // 3. INTERACTIVE CONSTELLATION LASERS & PHOTONS TO MOUSE
    // -------------------------------------------------------------
    if (hasMouse) {
      for (const star of this.homeStars) {
        const pMult = star.layer === 1 ? 0.35 : (star.layer === 2 ? 0.85 : 1.6);
        const drawX = star.x + this.homeParallaxX * pMult;
        const drawY = star.y + this.homeParallaxY * pMult;
        const dx = drawX - this.homeMouseX;
        const dy = drawY - this.homeMouseY;
        const dist = Math.hypot(dx, dy);
        const mouseConnectRadius = 220;

        if (dist < mouseConnectRadius) {
          const lineAlpha = Math.pow(1 - dist / mouseConnectRadius, 1.2) * 0.85;
          ctx.save();
          ctx.strokeStyle = star.color;
          ctx.globalAlpha = lineAlpha;
          ctx.lineWidth = star.layer === 3 ? 1.8 : 1.0;
          ctx.shadowColor = star.glowColor;
          ctx.shadowBlur = 12;

          ctx.beginPath();
          ctx.moveTo(this.homeMouseX, this.homeMouseY);
          ctx.lineTo(drawX, drawY);
          ctx.stroke();

          // Flowing photon pulse traveling between mouse and star
          const pulseT = ((Date.now() * 0.0025 + star.pulsePhase) % 1);
          const px = this.homeMouseX + (drawX - this.homeMouseX) * pulseT;
          const py = this.homeMouseY + (drawY - this.homeMouseY) * pulseT;
          ctx.fillStyle = '#ffffff';
          ctx.shadowBlur = 8;
          ctx.beginPath();
          ctx.arc(px, py, 2.2, 0, Math.PI * 2);
          ctx.fill();

          ctx.restore();
        }
      }
    }

    // -------------------------------------------------------------
    // 4. UPDATE AND RENDER STARS (Magnetic Attraction, Swirl & Flares)
    // -------------------------------------------------------------
    for (const star of this.homeStars) {
      const pMult = star.layer === 1 ? 0.35 : (star.layer === 2 ? 0.85 : 1.6);
      const drawX = star.x + this.homeParallaxX * pMult;
      const drawY = star.y + this.homeParallaxY * pMult;

      // Magnetic Attraction & Orbital Swirl toward Mouse
      if (hasMouse) {
        const mdx = this.homeMouseX - drawX;
        const mdy = this.homeMouseY - drawY;
        const dist = Math.hypot(mdx, mdy);
        const reactRadius = 240;

        if (dist < reactRadius && dist > 1) {
          const factor = 1 - dist / reactRadius;
          // Attraction pull + orbital tangential swirl
          const pull = factor * (star.layer * 1.8);
          const swirl = factor * (star.layer * 1.6);
          star.vx += (mdx / dist) * pull + (-mdy / dist) * swirl;
          star.vy += (mdy / dist) * pull + (mdx / dist) * swirl;
        }
      }

      // Smooth spring return to star origin anchor
      star.vx += (star.originX - star.x) * 0.004;
      star.vy += (star.originY - star.y) * 0.004;

      // Friction & natural drift
      star.vx *= 0.91;
      star.vy *= 0.91;
      star.x += star.vx + star.baseVx;
      star.y += star.vy + star.baseVy;
      star.angle += star.rotSpeed;

      // Screen wrapping
      if (star.x < -30) { star.x = w + 30; star.originX = star.x; }
      if (star.x > w + 30) { star.x = -30; star.originX = star.x; }
      if (star.y < -30) { star.y = h + 30; star.originY = star.y; }
      if (star.y > h + 30) { star.y = -30; star.originY = star.y; }

      // Twinkle pulsation
      star.pulsePhase += star.pulseSpeed;
      let currentAlpha = star.baseAlpha + Math.sin(star.pulsePhase) * 0.25;
      let currentSize = star.size;
      let isNearMouse = false;

      // Flare up when near mouse cursor
      if (hasMouse) {
        const distToMouse = Math.hypot(drawX - this.homeMouseX, drawY - this.homeMouseY);
        if (distToMouse < 220) {
          const proximity = 1 - distToMouse / 220;
          currentAlpha = Math.min(1.0, currentAlpha + proximity * 0.65);
          currentSize = star.size * (1 + proximity * 0.9);
          if (distToMouse < 180 && star.layer >= 2) {
            isNearMouse = true;
          }
        }
      }

      ctx.save();
      ctx.globalAlpha = Math.max(0.1, Math.min(1.0, currentAlpha));

      if (isNearMouse || star.spikes === 4) {
        // Draw radiant 4-pointed cross starburst
        drawStarCross(
          ctx,
          drawX,
          drawY,
          currentSize * 2.2,
          currentSize * 0.6,
          star.angle,
          star.color,
          star.glowColor
        );
      } else {
        // Draw round incandescent celestial star
        ctx.fillStyle = star.color;
        ctx.shadowColor = star.glowColor;
        ctx.shadowBlur = star.layer === 3 ? 20 : (star.layer === 2 ? 12 : 6);
        ctx.beginPath();
        ctx.arc(drawX, drawY, Math.max(0.8, currentSize), 0, Math.PI * 2);
        ctx.fill();

        if (star.layer >= 2) {
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(drawX, drawY, Math.max(0.5, currentSize * 0.45), 0, Math.PI * 2);
          ctx.fill();
        }
      }

      ctx.restore();
    }

    // -------------------------------------------------------------
    // 5. PERIODIC SHOOTING STARS (Meteors that bend near mouse)
    // -------------------------------------------------------------
    this.nextShootingStarCounter--;
    if (this.nextShootingStarCounter <= 0) {
      this.nextShootingStarCounter = Math.floor(Math.random() * 140 + 70);
      const startX = Math.random() * w;
      const startY = Math.random() * (h * 0.5);
      const angle = Math.PI * 0.25 + (Math.random() - 0.5) * 0.4;
      const speed = Math.random() * 12 + 16;
      this.shootingStars.push({
        x: startX,
        y: startY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        length: Math.random() * 70 + 60,
        color: ['#ffffff', '#38bdf8', '#ec4899', '#ffd000'][Math.floor(Math.random() * 4)],
        life: 1.0,
        maxLife: 35,
      });
    }

    for (let i = this.shootingStars.length - 1; i >= 0; i--) {
      const meteor = this.shootingStars[i];
      // Gravitational lensing towards cursor
      if (hasMouse) {
        const dx = this.homeMouseX - meteor.x;
        const dy = this.homeMouseY - meteor.y;
        const dist = Math.hypot(dx, dy);
        if (dist < 260 && dist > 1) {
          meteor.vx += (dx / dist) * 0.8;
          meteor.vy += (dy / dist) * 0.8;
        }
      }

      meteor.x += meteor.vx;
      meteor.y += meteor.vy;
      meteor.life -= 1 / meteor.maxLife;

      if (meteor.life <= 0 || meteor.x > w + 100 || meteor.y > h + 100) {
        this.shootingStars.splice(i, 1);
        continue;
      }

      ctx.save();
      ctx.globalAlpha = Math.max(0, meteor.life);
      ctx.strokeStyle = meteor.color;
      ctx.shadowColor = meteor.color;
      ctx.shadowBlur = 12;
      ctx.lineWidth = 2.4;

      ctx.beginPath();
      ctx.moveTo(meteor.x, meteor.y);
      const tailX = meteor.x - (meteor.vx / Math.hypot(meteor.vx, meteor.vy)) * meteor.length;
      const tailY = meteor.y - (meteor.vy / Math.hypot(meteor.vx, meteor.vy)) * meteor.length;
      ctx.lineTo(tailX, tailY);
      ctx.stroke();

      // Glowing head
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(meteor.x, meteor.y, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // -------------------------------------------------------------
    // 6. COSMIC CLICK NOVAS (Shockwaves rippling through stars)
    // -------------------------------------------------------------
    for (let i = this.homeNovas.length - 1; i >= 0; i--) {
      const nova = this.homeNovas[i];
      nova.radius += 8;
      nova.alpha = Math.max(0, (1 - nova.radius / nova.maxRadius) * 0.9);

      if (nova.radius >= nova.maxRadius || nova.alpha <= 0) {
        this.homeNovas.splice(i, 1);
        continue;
      }

      ctx.save();
      ctx.strokeStyle = nova.color;
      ctx.shadowColor = nova.color;
      ctx.shadowBlur = 18;
      ctx.globalAlpha = nova.alpha;
      ctx.lineWidth = 3.5 * (1 - nova.radius / nova.maxRadius) + 1;

      ctx.beginPath();
      ctx.arc(nova.x, nova.y, nova.radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // -------------------------------------------------------------
    // 7. STARDUST SPARKLE TRAILS FROM MOUSE MOVEMENT
    // -------------------------------------------------------------
    for (let i = this.stardustSparks.length - 1; i >= 0; i--) {
      const spark = this.stardustSparks[i];
      spark.x += spark.vx;
      spark.y += spark.vy;
      spark.vx *= 0.92;
      spark.vy *= 0.92;
      spark.life -= 0.024;

      if (spark.life <= 0) {
        this.stardustSparks.splice(i, 1);
        continue;
      }

      ctx.save();
      ctx.globalAlpha = Math.max(0, spark.life * spark.alpha);
      ctx.fillStyle = spark.color;
      ctx.shadowColor = spark.color;
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.arc(spark.x, spark.y, spark.size * spark.life, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // -------------------------------------------------------------
    // 8. MOUSE CELESTIAL RETICLE & STARLIGHT AURA
    // -------------------------------------------------------------
    if (hasMouse) {
      ctx.save();
      const cursorGlow = ctx.createRadialGradient(
        this.homeMouseX,
        this.homeMouseY,
        0,
        this.homeMouseX,
        this.homeMouseY,
        38
      );
      cursorGlow.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
      cursorGlow.addColorStop(0.25, 'rgba(56, 189, 248, 0.55)');
      cursorGlow.addColorStop(0.65, 'rgba(236, 72, 153, 0.25)');
      cursorGlow.addColorStop(1, 'rgba(56, 189, 248, 0)');
      ctx.fillStyle = cursorGlow;
      ctx.beginPath();
      ctx.arc(this.homeMouseX, this.homeMouseY, 38, 0, Math.PI * 2);
      ctx.fill();

      // Sharp radiant 4-pointed cursor core star
      drawStarCross(
        ctx,
        this.homeMouseX,
        this.homeMouseY,
        14,
        3.5,
        Date.now() * 0.003,
        '#ffffff',
        '#38bdf8'
      );
      ctx.restore();
    }
  }

  public showHomeScreen(): void {
    this.cancelAutoTurnCountdown();
    this.autoSaveGame();
    this.isSandboxMode = false;
    this.sandboxToolbar?.classList.add('hidden');
    this.homeScreen.classList.remove('hidden');
    this.homeScreen.style.display = 'flex';
    this.resumeRunModal.classList.add('hidden');
    this.characterSelectModal.classList.add('hidden');
    this.hotseatSelectModal.classList.add('hidden');
    this.codexModal.classList.add('hidden');
    this.guideModal.classList.add('hidden');
    this.gameOverModal.classList.add('hidden');
    this.upgradeModal.classList.add('hidden');
    this.updateHomeResumeTile();
  }

  public hideHomeScreen(): void {
    this.homeScreen.classList.add('hidden');
    this.homeScreen.style.display = 'none';
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

  public updateAdminUI(): void {
    const isAuth = this.adminManager.isAuthenticated();
    const navBtn = document.getElementById('nav-admin-btn');
    const modalTitle = document.getElementById('admin-modal-title');
    const authGate = document.getElementById('admin-auth-gate');
    const powersContainer = document.getElementById('admin-powers-container');

    if (this.isHotseatMode && this.hotseatCurrentPlayer === 2) {
      if (navBtn) {
        navBtn.textContent = '🚫 Admin (P1 Only)';
        navBtn.title = 'Admin commands are strictly restricted to Player 1 (Creator)';
        navBtn.style.background = 'linear-gradient(135deg, #475569, #334155)';
        navBtn.style.color = '#94a3b8';
        navBtn.style.borderColor = '#64748b';
        navBtn.style.boxShadow = 'none';
        navBtn.style.opacity = '0.65';
      }
      return;
    }

    if (navBtn) {
      navBtn.style.opacity = '1';
      navBtn.textContent = isAuth ? '👑 Admin (Creator)' : '🔒 Admin';
      navBtn.title = isAuth ? 'Creator Admin God Command Console (Unlocked)' : 'Restricted Admin Console (Creator Passcode Required)';
      navBtn.style.background = isAuth
        ? 'linear-gradient(135deg, #f59e0b, #ec4899)'
        : 'linear-gradient(135deg, #334155, #1e293b)';
      navBtn.style.color = isAuth ? '#000' : '#cbd5e1';
      navBtn.style.borderColor = isAuth ? '#fde68a' : '#475569';
      navBtn.style.boxShadow = isAuth ? '0 0 16px rgba(245, 158, 11, 0.6)' : 'none';
    }

    if (modalTitle) {
      modalTitle.textContent = isAuth ? '👑 ADMIN GOD POWERS CONSOLE' : '🔒 RESTRICTED CREATOR ACCESS';
    }

    if (isAuth) {
      authGate?.classList.add('hidden');
      powersContainer?.classList.remove('hidden');
    } else {
      authGate?.classList.remove('hidden');
      powersContainer?.classList.add('hidden');
      const msgEl = document.getElementById('admin-auth-msg');
      if (msgEl) msgEl.textContent = '';
    }

    if (!this.characterSelectModal?.classList.contains('hidden')) {
      this.renderCharacterSelectModal();
    }
  }

  public hasAdminAccess(): boolean {
    return this.adminManager.isAuthenticated() || this.isSandboxMode;
  }

  public openAdminPanel(): void {
    if (this.isHotseatMode && this.hotseatCurrentPlayer === 2) {
      this.combatEngine.addLog('system', '🚫 ACCESS DENIED: Admin commands are strictly restricted to Player 1 (Creator)!');
      this.renderer.particleEngine.triggerScreenShake(6, 200);
      const pos = this.renderer.gridToScreen(this.enemies[0].coord);
      this.renderer.particleEngine.addFloatingText('🚫 RESTRICTED TO CREATOR', pos.x, pos.y - 30, '#ef4444', 22);
      return;
    }

    this.updateAdminUI();
    document.getElementById('admin-panel-modal')?.classList.remove('hidden');
    if (!this.adminManager.isAuthenticated()) {
      setTimeout(() => {
        (document.getElementById('admin-passcode-input') as HTMLInputElement)?.focus();
      }, 50);
    }
  }

  public closeAdminPanel(): void {
    document.getElementById('admin-panel-modal')?.classList.add('hidden');
  }

  public toggleAdminPanel(): void {
    const modal = document.getElementById('admin-panel-modal');
    if (modal?.classList.contains('hidden')) {
      this.openAdminPanel();
    } else {
      this.closeAdminPanel();
    }
  }

  public syncAdminPowers(): void {
    if (!this.hasAdminAccess() && this.selectedElement !== 'Admin' && this.hero?.stats?.elementalAffinity !== 'Admin') {
      return;
    }
    if (!this.hero || !this.hero.abilities) return;

    populateAdminAbilities();
    const adminAbilities = HERO_CLASSES.Admin.abilities;
    const existingIds = new Set(this.hero.abilities.map((a) => a.id));
    let newCount = 0;

    for (const ab of adminAbilities) {
      if (!existingIds.has(ab.id)) {
        this.hero.abilities.push({ ...ab, currentCooldown: 0 });
        existingIds.add(ab.id);
        newCount++;
      }
    }

    if (newCount > 0) {
      this.updateHUD();
    }
  }

  public grantAllAdminPowers(): { success: boolean; count: number; message: string } {
    if (!this.hero || !this.hero.abilities) {
      return { success: false, count: 0, message: 'No active hero found.' };
    }

    populateAdminAbilities();
    const adminAbilities = HERO_CLASSES.Admin.abilities;
    const existingIds = new Set(this.hero.abilities.map((a) => a.id));
    let added = 0;

    for (const ab of adminAbilities) {
      if (!existingIds.has(ab.id)) {
        this.hero.abilities.push({ ...ab, currentCooldown: 0 });
        existingIds.add(ab.id);
        added++;
      }
    }

    this.updateHUD();
    this.combatEngine?.addLog('system', `👑 ADMIN PRIVILEGE: Equipped all ${this.hero.abilities.length} elemental & admin powers!`);
    this.renderer?.particleEngine?.triggerScreenShake(6, 250);
    if (this.renderer && this.hero.coord) {
      const pos = this.renderer.gridToScreen(this.hero.coord);
      this.renderer.particleEngine.addFloatingText(`👑 ALL POWERS GRANTED!`, pos.x, pos.y - 35, '#ec4899', 26);
    }
    if (this.soundEngine) {
      this.soundEngine.playLevelUp();
    }
    return {
      success: true,
      count: this.hero.abilities.length,
      message: `Granted all powers! Active arsenal has ${this.hero.abilities.length} abilities.`,
    };
  }

  public convertOverpoweredToAdmin(): { success: boolean; count: number; message: string } {
    const count = auditAndPromoteOverpoweredAbilities();
    const grantRes = this.grantAllAdminPowers();

    this.soundEngine?.playLevelUp();
    this.renderer?.particleEngine?.triggerScreenShake(10, 300);
    if (this.renderer && this.hero && this.hero.coord) {
      const pos = this.renderer.gridToScreen(this.hero.coord);
      this.renderer.particleEngine.addFloatingText(
        `👑 CONVERTED ${count} OVERPOWERED SPELLS TO ADMIN!`,
        pos.x,
        pos.y - 45,
        '#f472b6',
        24
      );
    }
    this.combatEngine?.addLog(
      'system',
      `👑 ADMIN AUDIT: Evaluated multiversal spells and consecrated ${count} overpowered abilities into official Admin Powers!`
    );
    return {
      success: true,
      count,
      message: `👑 Consecrated ${count} overpowered abilities into official Admin Powers! (${grantRes.count} total powers equipped).`,
    };
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

      const isUnlocked = this.unlockManager.isElementUnlocked(elem);
      if (isUnlocked && heroClass) {
        const playBtn = document.createElement('button');
        playBtn.className = 'btn-primary';
        playBtn.style.cssText = `margin-top: 10px; padding: 6px 14px; font-size: 0.8rem; background: ${data.glowColor || 'rgba(56, 189, 248, 0.2)'}; border: 1px solid ${data.color}; color: #fff; border-radius: 6px; cursor: pointer; width: 100%; font-weight: 700; transition: transform 0.15s ease;`;
        playBtn.textContent = `⚔️ Battle CPUs as ${heroClass.className}`;
        playBtn.onclick = (e) => {
          e.stopPropagation();
          this.closeCodex();
          this.hideHomeScreen();
          this.selectedElement = elem;
          this.restartGame(elem);
          this.combatEngine.addLog('system', `⚔️ Selected ${heroClass.className} (${elem})! Entering the arena to fight CPU forces!`);
        };
        card.appendChild(playBtn);
      }

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
      const hasAdmin = this.hasAdminAccess();
      const isAdminOnly = this.unlockManager.isAdminOnly(elem);
      const isUnlocked = this.unlockManager.isElementUnlocked(elem);
      const isPickable = (elem === 'Admin') ? hasAdmin : isUnlocked;
      const card = document.createElement('div');
      card.className = `class-card ${isPickable ? '' : 'locked'}`;
      card.style.setProperty('--card-color', elemData.color);
      card.style.setProperty('--card-glow', elemData.glowColor);

      const displayAbilities = config.abilities.slice(0, 10);
      const abilityRows = displayAbilities.map((ab) => `
        <div class="class-ability-row">
          <span class="class-ability-name">${ab.icon} ${ab.name}</span>
          <span class="class-ability-meta">${ab.apCost} AP | ${ab.baseDamage} DMG</span>
        </div>
      `).join('') + (config.abilities.length > 10 ? `
        <div class="class-ability-row" style="color: #ec4899; font-weight: bold; justify-content: center;">
          ⚡ + ${config.abilities.length - 10} More Powers (All Elements!)
        </div>
      ` : '');

      const badgeHtml = elem === 'Admin'
        ? (hasAdmin
          ? `<span class="element-badge" style="background: linear-gradient(135deg, rgba(236, 72, 153, 0.3), rgba(139, 92, 246, 0.3)); color: #f472b6; border: 1px solid #ec4899;">👑 Administrator (Authorized)</span>`
          : `<span class="element-badge" style="background: rgba(239, 68, 68, 0.3); color: #fca5a5; border: 1px solid #ef4444;">🔒 Admin Access Only</span>`)
        : isAdminOnly
        ? `<span class="element-badge" style="background: rgba(239, 68, 68, 0.3); color: #fca5a5; border: 1px solid #ef4444;">👑 Admin Power</span>`
        : isUnlocked
        ? `<span class="element-badge" style="background:${elemData.glowColor}; color:${elemData.color}; width:fit-content;">${elem}</span>`
        : `<span class="lock-badge">🔒 Locked</span>`;

      const actionHtml = isPickable
        ? `<button class="class-select-btn" style="${elem === 'Admin' ? 'background: linear-gradient(135deg, #ec4899, #8b5cf6); border-color: #f472b6; box-shadow: 0 0 15px rgba(236, 72, 153, 0.4);' : isAdminOnly ? 'background: linear-gradient(135deg, #ef4444, #8b5cf6); border-color: #f87171;' : ''}">Choose ${config.className}</button>`
        : (elem === 'Admin'
          ? `<button class="class-select-btn btn-locked-admin" style="background: rgba(239, 68, 68, 0.25); border: 1px solid #ef4444; color: #fca5a5; cursor: pointer; width: 100%;">🔒 Enter Admin Passcode</button>`
          : `<div class="unlock-requirement-box">🔒 ${config.unlockRequirement || 'Defeat Boss to Unlock'}</div>`);

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

      // Attach hover tooltips to spell rows in class card
      const abilityRowEls = card.querySelectorAll<HTMLElement>('.class-ability-row');
      displayAbilities.forEach((ab, idx) => {
        const rowEl = abilityRowEls[idx];
        if (rowEl) {
          this.hud.getTooltipManager().attach(rowEl, ab);
        }
      });

      if (isPickable) {
        card.style.cursor = 'pointer';
        const selectHandler = (e: Event) => {
          e.preventDefault();
          e.stopPropagation();
          this.selectedElement = elem;
          this.characterSelectModal.classList.add('hidden');
          this.hideHomeScreen();
          this.restartGame(elem);
          this.combatEngine.addLog('system', `⚔️ Selected ${config.className} (${elem})! Entering the arena to fight CPU forces!`);
        };
        card.onclick = selectHandler;
        const btn = card.querySelector('.class-select-btn') as HTMLElement;
        if (btn) btn.onclick = selectHandler;
      } else if (elem === 'Admin') {
        card.style.cursor = 'pointer';
        const openAuthHandler = (e: Event) => {
          e.preventDefault();
          e.stopPropagation();
          this.openAdminPanel();
          const adminMsg = document.getElementById('admin-auth-msg');
          if (adminMsg) {
            adminMsg.textContent = '🔒 Master Passcode required to unlock Administrator.';
            adminMsg.style.color = '#fde68a';
          }
        };
        card.onclick = openAuthHandler;
        const btn = card.querySelector('.btn-locked-admin') as HTMLElement;
        if (btn) btn.onclick = openAuthHandler;
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
      const canUseAdmin = this.adminManager.canUseAdminCommands(true, playerNum);
      const isAdminOnly = this.unlockManager.isAdminOnly(elem);
      const isUnlocked = this.unlockManager.isElementUnlocked(elem);
      const isPickable = (elem === 'Admin') ? canUseAdmin : isUnlocked;
      const card = document.createElement('div');
      card.className = `class-card ${isPickable ? '' : 'locked'}`;
      card.style.setProperty('--card-color', elemData.color);
      card.style.setProperty('--card-glow', elemData.glowColor);

      const displayAbilities = config.abilities.slice(0, 10);
      const abilityRows = displayAbilities.map((ab) => `
        <div class="class-ability-row">
          <span class="class-ability-name">${ab.icon} ${ab.name}</span>
          <span class="class-ability-meta">${ab.apCost} AP | ${ab.baseDamage} DMG</span>
        </div>
      `).join('') + (config.abilities.length > 10 ? `
        <div class="class-ability-row" style="color: #ec4899; font-weight: bold; justify-content: center;">
          ⚡ + ${config.abilities.length - 10} More Powers (All Elements!)
        </div>
      ` : '');

      const badgeHtml = elem === 'Admin'
        ? (canUseAdmin
          ? `<span class="element-badge" style="background: linear-gradient(135deg, rgba(236, 72, 153, 0.3), rgba(139, 92, 246, 0.3)); color: #f472b6; border: 1px solid #ec4899;">👑 Administrator (Authorized)</span>`
          : `<span class="element-badge" style="background: rgba(239, 68, 68, 0.3); color: #fca5a5; border: 1px solid #ef4444;">🔒 Admin Access Only</span>`)
        : isAdminOnly
        ? `<span class="element-badge" style="background: rgba(239, 68, 68, 0.3); color: #fca5a5; border: 1px solid #ef4444;">👑 Admin Power</span>`
        : `<span class="element-badge" style="background:${elemData.glowColor}; color:${elemData.color}; width:fit-content;">${elem}</span>`;

      const actionHtml = isPickable
        ? `<button class="class-select-btn" style="${elem === 'Admin' ? 'background: linear-gradient(135deg, #ec4899, #8b5cf6); border-color: #f472b6;' : isAdminOnly ? 'background: linear-gradient(135deg, #ef4444, #8b5cf6); border-color: #f87171;' : ''}">Pick for Player ${playerNum}</button>`
        : (elem === 'Admin'
          ? `<button class="class-select-btn btn-locked-admin" style="background: rgba(239, 68, 68, 0.25); border: 1px solid #ef4444; color: #fca5a5; cursor: pointer; width: 100%;">🔒 Host Passcode Required</button>`
          : `<div class="unlock-requirement-box">🔒 Locked</div>`);

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

      // Attach hover tooltips to spell rows in hotseat card
      const abilityRowEls = card.querySelectorAll<HTMLElement>('.class-ability-row');
      displayAbilities.forEach((ab, idx) => {
        const rowEl = abilityRowEls[idx];
        if (rowEl) {
          this.hud.getTooltipManager().attach(rowEl, ab);
        }
      });

      if (isPickable) {
        card.style.cursor = 'pointer';
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
      } else if (elem === 'Admin') {
        card.style.cursor = 'pointer';
        card.onclick = () => {
          if (playerNum === 1) {
            this.openAdminPanel();
          } else {
            this.combatEngine.addLog('system', '🚫 Player 2 cannot select Administrator (restricted to Host Creator)!');
          }
        };
      }

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
    this.attachCombatEngineHooks(this.combatEngine);
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

  // --- ONLINE CO-OP GAUNTLET METHODS ---

  private setupNetworkHandlers(): void {
    this.networkManager.onMessage((msg) => this.handleNetworkMessage(msg));

    this.networkManager.onPlayerConnected(() => {
      this.soundEngine.playClick();
      if (this.networkManager.isHost()) {
        this.coopHostStatus.textContent = 'Ally connected! Ready to launch.';
        this.coopHostPartnerCard.style.display = 'flex';
        this.updatePartnerCard(this.coopP2Element);
        this.coopHostLaunchBtn.disabled = false;
        this.coopHostLaunchBtn.textContent = '⚔️ Launch Co-op Gauntlet!';
        this.networkManager.send({
          type: 'LOBBY_UPDATE',
          hostElement: this.coopP1Element,
          hostReady: true,
        });
      } else {
        this.coopJoinStatus.textContent = 'Connected to Host! Select champion.';
        this.coopJoinWaitingBox.style.display = 'flex';
        this.networkManager.send({
          type: 'LOBBY_UPDATE',
          guestElement: this.coopP2Element,
          guestReady: true,
        });
      }
    });

    this.networkManager.onPlayerDisconnected(() => {
      if (this.isCoopMode) {
        this.combatEngine.addLog('system', '⚠️ Ally disconnected from session.');
      }
      if (this.networkManager.isHost()) {
        this.coopHostStatus.textContent = 'Ally disconnected. Waiting for connection...';
        this.coopHostPartnerCard.style.display = 'none';
        this.coopHostLaunchBtn.disabled = true;
        this.coopHostLaunchBtn.textContent = '⚔️ Launch Co-op Gauntlet (Waiting for Ally...)';
      } else {
        this.coopJoinStatus.textContent = 'Disconnected from host.';
        this.coopJoinWaitingBox.style.display = 'none';
      }
    });

    this.networkManager.onStatusChange((_status, text) => {
      if (text) {
        if (this.networkManager.isHost()) {
          this.coopHostStatus.textContent = text;
        } else {
          this.coopJoinStatus.textContent = text;
        }
      }
    });
  }

  private async handleNetworkMessage(msg: NetworkMessage): Promise<void> {
    switch (msg.type) {
      case 'LOBBY_UPDATE': {
        if (this.networkManager.isHost()) {
          if (msg.guestElement) {
            this.coopP2Element = msg.guestElement;
            this.updatePartnerCard(this.coopP2Element);
          }
        } else {
          if (msg.hostElement) {
            this.coopP1Element = msg.hostElement;
          }
        }
        break;
      }
      case 'START_MATCH': {
        this.startCoopMatch(msg.hostElement, msg.guestElement, false);
        break;
      }
      case 'INTENT_MOVE': {
        if (this.isCoopMode && this.networkManager.isHost() && this.turnManager.getPhase() === 'COOP_P2_TURN') {
          await this.executeCoopMove(2, msg.targetCoord);
        }
        break;
      }
      case 'INTENT_CAST': {
        if (this.isCoopMode && this.networkManager.isHost() && this.turnManager.getPhase() === 'COOP_P2_TURN') {
          await this.executeCoopCast(2, msg.abilityId, msg.targetCoord);
        }
        break;
      }
      case 'INTENT_END_TURN': {
        if (this.isCoopMode && this.networkManager.isHost() && this.turnManager.getPhase() === 'COOP_P2_TURN') {
          await this.advanceCoopToEnemies();
        }
        break;
      }
      case 'EVENT_MOVE': {
        const unit = (msg.unitId === this.hero.id)
          ? this.hero
          : (this.combatEngine.coopHero && msg.unitId === this.combatEngine.coopHero.id)
          ? this.combatEngine.coopHero
          : this.combatEngine.getUnitAt(msg.path[0]);
        if (unit) {
          this.isBusy = true;
          this.renderer.animManager.animateMovement(unit.id, msg.path, 160, () => {
            this.combatEngine.moveUnit(unit, msg.destination);
            this.isBusy = false;
            this.updateReachableTiles();
            this.updateHUD();
            this.checkCombatState();
          });
        } else {
          this.isBusy = false;
        }
        break;
      }
      case 'EVENT_CAST': {
        const caster = (msg.casterId === this.hero.id)
          ? this.hero
          : (this.combatEngine.coopHero && msg.casterId === this.combatEngine.coopHero.id)
          ? this.combatEngine.coopHero
          : this.combatEngine.enemies.find((e) => e.id === msg.casterId) ||
            this.combatEngine.zombies.find((z) => z.id === msg.casterId) ||
            this.combatEngine.lifeBeings.find((b) => b.id === msg.casterId);

        const ability = caster?.abilities.find((a) => a.id === msg.abilityId);
        if (caster && ability) {
          this.isBusy = true;
          const startPos = this.renderer.gridToScreen(caster.coord);
          const targetPos = this.renderer.gridToScreen(msg.targetCoord);
          const elemData = CORE_ELEMENTS[ability.element] || CORE_ELEMENTS.Fire;
          this.playAbilitySounds(ability);

          const isBeam = ability.name.toLowerCase().includes('beam') ||
            ability.name.toLowerCase().includes('ray') ||
            ability.name.toLowerCase().includes('lance') ||
            ability.name.toLowerCase().includes('flare');

          if (isBeam) {
            this.renderer.particleEngine.addBeam(startPos.x, startPos.y, targetPos.x, targetPos.y, elemData.color, 8, 320);
          }

          this.renderer.projManager.spawnProjectile(startPos, targetPos, ability.element, elemData.color, 260, () => {
            const logCountBefore = this.combatEngine.logs.length;
            this.combatEngine.executeAbility(caster, ability, msg.targetCoord);
            const isAoE = ability.aoeRadius > 0;
            this.renderer.triggerSpellImpact(msg.targetCoord, ability.element, isAoE);

            const newLogs = this.combatEngine.logs.slice(logCountBefore);
            const reactionLog = newLogs.find((l) => l.type === 'reaction');

            if (ability.baseDamage > 0) {
              this.soundEngine.playHit();
              this.renderer.particleEngine.addFloatingText(
                `-${ability.baseDamage}`,
                targetPos.x,
                targetPos.y - 15,
                elemData.color,
                22
              );
            }

            if (ability.appliesStatus === 'Rooted') {
              this.soundEngine.playRoot();
            }

            if (reactionLog) {
              this.renderer.particleEngine.addFloatingText(
                `💥 ${reactionLog.message.split('!')[0]}!`,
                targetPos.x,
                targetPos.y - 38,
                '#f59e0b',
                24
              );
            }

            this.checkAndTriggerDeaths(ability.element);
            this.isBusy = false;
            this.updateReachableTiles();
            this.updateHUD();
          });
        } else {
          this.isBusy = false;
        }
        break;
      }
      case 'EVENT_PHASE_CHANGE': {
        this.turnManager.setPhase(msg.phase);
        if (msg.phase === 'COOP_P2_TURN' && this.combatEngine.coopHero) {
          this.combatEngine.coopHero.stats.currentAp = this.combatEngine.coopHero.stats.maxAp;
          this.combatEngine.coopHero.abilities.forEach((a) => {
            if (a.currentCooldown > 0) a.currentCooldown--;
          });
        } else if (msg.phase === 'COOP_P1_TURN') {
          this.hero.stats.currentAp = this.hero.stats.maxAp;
          this.hero.abilities.forEach((a) => {
            if (a.currentCooldown > 0) a.currentCooldown--;
          });
        }
        this.isBusy = false;
        this.selectedAbility = null;
        this.targetableTiles = [];
        this.updateCoopTurnHUD();
        this.updateReachableTiles();
        this.updateHUD();
        break;
      }
      case 'EVENT_ROUND_VICTORY': {
        this.currentRound = msg.nextRound;
        this.combatEngine.resetRoundState();
        this.deadUnitIds.clear();
        this.hero.coord = { x: 1, y: 1 };
        if (this.combatEngine.coopHero) {
          this.combatEngine.coopHero.coord = { x: 1, y: 3 };
        }
        this.enemies = this.escalationManager.generateRoundEnemies(this.currentRound);
        this.combatEngine.enemies = this.enemies;
        const roundBadge = document.getElementById('round-indicator');
        if (roundBadge) {
          const isBoss = this.currentRound % 5 === 0;
          roundBadge.textContent = isBoss ? `👑 BOSS ROUND ${this.currentRound.toLocaleString()} / ${this.maxRoundsStr}` : `ROUND ${this.currentRound.toLocaleString()} / ${this.maxRoundsStr}`;
          roundBadge.style.color = isBoss ? '#fbbf24' : '#38bdf8';
        }
        this.turnManager.startCoopTurn(1, this.hero);
        this.isBusy = false;
        this.selectedAbility = null;
        this.targetableTiles = [];
        this.updateCoopTurnHUD();
        this.updateReachableTiles();
        this.updateHUD();
        break;
      }
      case 'EVENT_GAME_OVER': {
        this.turnManager.setPhase('GAME_OVER');
        this.showDefeatModal();
        break;
      }
      case 'CURSOR_HOVER': {
        this.renderer.partnerHoverCoord = msg.coord;
        break;
      }
      case 'TACTICAL_PING': {
        this.triggerTacticalPing(msg.coord, msg.playerNum, msg.label);
        break;
      }
    }
  }

  private setupCoopLobbyUI(): void {
    this.closeCoopBtn.onclick = () => {
      this.soundEngine.playClick();
      this.coopModal.classList.add('hidden');
      this.networkManager.disconnect();
    };

    this.coopTabHost.onclick = () => {
      this.soundEngine.playClick();
      this.switchCoopTab('host');
    };

    this.coopTabJoin.onclick = () => {
      this.soundEngine.playClick();
      this.switchCoopTab('join');
    };

    this.coopCopyCodeBtn.onclick = () => {
      this.soundEngine.playClick();
      const code = this.networkManager.getRoomCode();
      if (code) {
        const url = `${window.location.origin}${window.location.pathname}?coop=${encodeURIComponent(code)}`;
        navigator.clipboard.writeText(url).then(() => {
          this.coopCopyCodeBtn.textContent = '✅ Copied Link!';
          setTimeout(() => {
            this.coopCopyCodeBtn.textContent = '📋 Copy Link';
          }, 2000);
        });
      }
    };

    this.coopJoinConnectBtn.onclick = () => {
      const code = this.coopJoinCodeInput.value.trim();
      if (!code) {
        this.coopJoinStatus.textContent = '⚠️ Please enter a room code first.';
        return;
      }
      this.soundEngine.playClick();
      this.networkManager.joinRoom(code).catch((err) => {
        this.coopJoinStatus.textContent = `❌ Failed: ${err.message || err}`;
      });
    };

    this.coopHostLaunchBtn.onclick = () => {
      this.soundEngine.playClick();
      this.networkManager.send({
        type: 'START_MATCH',
        hostElement: this.coopP1Element,
        guestElement: this.coopP2Element,
      });
      this.startCoopMatch(this.coopP1Element, this.coopP2Element, true);
    };
  }

  private switchCoopTab(tab: 'host' | 'join'): void {
    if (tab === 'host') {
      this.coopTabHost.classList.add('active');
      this.coopTabJoin.classList.remove('active');
      this.coopHostPanel.style.display = 'flex';
      this.coopJoinPanel.style.display = 'none';
      if (!this.networkManager.isHost() || !this.networkManager.getRoomCode()) {
        this.networkManager.hostRoom().then((code) => {
          this.coopHostRoomCode.textContent = code;
        });
      }
    } else {
      this.coopTabJoin.classList.add('active');
      this.coopTabHost.classList.remove('active');
      this.coopJoinPanel.style.display = 'flex';
      this.coopHostPanel.style.display = 'none';
    }
  }

  private updatePartnerCard(elem: ElementType): void {
    const config = HERO_CLASSES[elem];
    this.coopPartnerAvatar.textContent = config ? config.abilities[0]?.icon || '✨' : '✨';
    this.coopPartnerName.textContent = `Partner: ${config ? config.className : elem}`;
    this.coopPartnerClass.textContent = config ? config.tagline : 'Ready for battle';
  }

  private renderCoopElementGrid(container: HTMLElement, onSelect: (elem: ElementType) => void, selectedElem: ElementType): void {
    container.innerHTML = '';
    const allElements = Object.keys(HERO_CLASSES) as ElementType[];
    allElements.forEach((elem) => {
      const config = HERO_CLASSES[elem];
      if (!config) return;
      const elemData = CORE_ELEMENTS[elem] || CORE_ELEMENTS.Fire;
      const pill = document.createElement('div');
      pill.className = `coop-elem-pill ${elem === selectedElem ? 'selected' : ''}`;
      pill.innerHTML = `<span>${elemData.icon}</span> <span>${config.className}</span>`;
      pill.onclick = () => {
        container.querySelectorAll('.coop-elem-pill').forEach((p) => p.classList.remove('selected'));
        pill.classList.add('selected');
        onSelect(elem);
      };
      container.appendChild(pill);
    });
  }

  public openCoopModal(initialTab: 'host' | 'join' = 'host', prefillCode?: string): void {
    this.hideHomeScreen();
    this.characterSelectModal.classList.add('hidden');
    this.hotseatSelectModal.classList.add('hidden');
    this.coopModal.classList.remove('hidden');

    this.renderCoopElementGrid(this.coopHostElementGrid, (elem) => {
      this.coopP1Element = elem;
      if (this.networkManager.isConnected()) {
        this.networkManager.send({
          type: 'LOBBY_UPDATE',
          hostElement: this.coopP1Element,
        });
      }
    }, this.coopP1Element);

    this.renderCoopElementGrid(this.coopJoinElementGrid, (elem) => {
      this.coopP2Element = elem;
      if (this.networkManager.isConnected()) {
        this.networkManager.send({
          type: 'LOBBY_UPDATE',
          guestElement: this.coopP2Element,
        });
      }
    }, this.coopP2Element);

    if (prefillCode) {
      this.coopJoinCodeInput.value = prefillCode;
    }

    this.switchCoopTab(initialTab);
  }

  private startCoopMatch(p1Element: ElementType, p2Element: ElementType, isHost: boolean): void {
    this.hideHomeScreen();
    this.coopModal.classList.add('hidden');
    this.isCoopMode = true;
    this.coopLocalPlayer = isHost ? 1 : 2;
    this.isHotseatMode = false;
    this.isBusy = false;
    this.selectedAbility = null;
    this.targetableTiles = [];
    this.reachableTiles = [];
    this.deadUnitIds.clear();

    const p1 = createHeroForElement(p1Element);
    p1.id = 'hero_p1';
    p1.name = `Player 1 (${p1.name})`;
    p1.faction = 'Player';
    p1.coord = { x: 2, y: 4 };

    const p2 = createHeroForElement(p2Element);
    p2.id = 'hero_p2';
    p2.name = `Player 2 (${p2.name})`;
    p2.faction = 'Player';
    p2.coord = { x: 2, y: 6 };

    this.hero = p1;
    this.enemies = this.escalationManager.generateRoundEnemies(this.currentRound);

    this.grid = new Grid(10);
    this.hazardManager = new TileHazardManager(this.grid);
    this.setupObstacles();

    this.combatEngine = new CombatEngine(this.grid, this.hazardManager, this.hero, this.enemies, p2);
    this.attachCombatEngineHooks(this.combatEngine);
    const canvas = document.getElementById('battlefield-canvas') as HTMLCanvasElement;
    this.renderer = new BattlefieldRenderer(canvas, this.combatEngine);
    this.enemyAI = new EnemyAI(this.combatEngine);

    this.combatEngine.addLog('system', `🤝 Online Co-op Gauntlet: ${p1.name} & ${p2.name} have entered the arena!`);
    this.turnManager.setPhase('COOP_P1_TURN');

    this.updateCoopTurnHUD();
    this.updateReachableTiles();
    this.updateHUD();
  }

  private updateCoopTurnHUD(): void {
    if (!this.isCoopMode) return;
    const phase = this.turnManager.getPhase();
    const isMyTurn = (this.coopLocalPlayer === 1 && phase === 'COOP_P1_TURN') ||
                     (this.coopLocalPlayer === 2 && phase === 'COOP_P2_TURN');

    if (phase === 'COOP_P1_TURN') {
      this.hud.updatePhaseBanner(this.coopLocalPlayer === 1 ? "YOUR TURN (Player 1)" : "ALLY'S TURN (Player 1)");
    } else if (phase === 'COOP_P2_TURN') {
      this.hud.updatePhaseBanner(this.coopLocalPlayer === 2 ? "YOUR TURN (Player 2)" : "ALLY'S TURN (Player 2)");
    } else if (phase === 'ENEMY_TURN') {
      this.hud.updatePhaseBanner('ENEMY FORCES ADVANCING');
    }

    this.hud.setActionDockWaiting(!isMyTurn, isMyTurn ? '' : "Ally is taking their turn...");
    const partnerUnit = this.coopLocalPlayer === 1 ? this.combatEngine.coopHero : this.hero;
    this.hud.updateCoopAllyStatus(partnerUnit || null);
  }

  private async advanceCoopToEnemies(): Promise<void> {
    this.isBusy = true;
    this.turnManager.setPhase('ENEMY_TURN');
    this.selectedAbility = null;
    this.targetableTiles = [];
    this.reachableTiles = [];
    this.hud.updatePhaseBanner('ALLIED MINIONS');
    this.updateHUD();

    if (this.networkManager.isHost()) {
      this.networkManager.send({
        type: 'EVENT_PHASE_CHANGE',
        phase: 'ENEMY_TURN',
        activePlayer: 1,
      });
    }

    await delay(250);

    // 1. Allied Minions (Zombies & Beings of Life)
    const alliedMinions = [
      ...this.combatEngine.zombies.filter((z) => !z.isDead && z.faction === 'Player'),
      ...this.combatEngine.lifeBeings.filter((b) => !b.isDead && b.faction === 'Player'),
    ];

    for (const minion of alliedMinions) {
      if (minion.isDead) continue;
      minion.stats.currentAp = minion.stats.maxAp;
      const targets = this.combatEngine.enemies.filter((e) => !e.isDead);
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
          await new Promise<void>((resolve) => {
            this.renderer.animManager.animateMovement(minion.id, step.path, 160, () => {
              this.combatEngine.moveUnit(minion, step.destination);
              resolve();
            });
          });
          if (this.networkManager.isHost()) {
            this.networkManager.send({
              type: 'EVENT_MOVE',
              unitId: minion.id,
              path: step.path,
              destination: step.destination,
            });
          }
          this.updateHUD();
          await delay(150);
        } else if (step.type === 'cast') {
          this.combatEngine.executeAbility(minion, step.ability, step.targetCoord);
          if (this.networkManager.isHost()) {
            this.networkManager.send({
              type: 'EVENT_CAST',
              casterId: minion.id,
              abilityId: step.ability.id,
              targetCoord: step.targetCoord,
            });
          }
          this.updateHUD();
          await delay(250);
        }
      }
    }

    // 2. Enemy AI Turn
    this.hud.updatePhaseBanner('ENEMY TURN');
    this.updateHUD();

    for (const enemy of this.combatEngine.enemies) {
      if (enemy.isDead || this.combatEngine.areAllHeroesDead()) break;
      enemy.stats.currentAp = enemy.stats.maxAp;
      enemy.abilities.forEach((a) => {
        if (a.currentCooldown > 0) a.currentCooldown--;
      });

      this.focusedUnitId = enemy.id;
      this.hud.updatePhaseBanner(`ENEMY: ${enemy.name.toUpperCase()}`);
      await delay(250);

      const targets = this.combatEngine.getAllAllies().filter((u) => !u.isDead);
      if (targets.length === 0) break;
      const targetUnit = targets.sort(
        (a, b) =>
          this.combatEngine.grid.manhattanDistance(enemy.coord, a.coord) -
          this.combatEngine.grid.manhattanDistance(enemy.coord, b.coord)
      )[0];

      const steps = this.enemyAI.planTurnSteps(enemy, targetUnit);
      for (const step of steps) {
        if (enemy.isDead || this.combatEngine.areAllHeroesDead()) break;
        if (step.type === 'move') {
          await new Promise<void>((resolve) => {
            this.renderer.animManager.animateMovement(enemy.id, step.path, 160, () => {
              this.combatEngine.moveUnit(enemy, step.destination);
              resolve();
            });
          });
          if (this.networkManager.isHost()) {
            this.networkManager.send({
              type: 'EVENT_MOVE',
              unitId: enemy.id,
              path: step.path,
              destination: step.destination,
            });
          }
          this.updateHUD();
          await delay(200);
        } else if (step.type === 'cast') {
          const startPos = this.renderer.gridToScreen(enemy.coord);
          const targetPos = this.renderer.gridToScreen(step.targetCoord);
          const elemData = CORE_ELEMENTS[step.ability.element];
          const color = elemData ? elemData.color : '#ef4444';
          await new Promise<void>((resolve) => {
            this.renderer.projManager.spawnProjectile(
              startPos,
              targetPos,
              step.ability.element,
              color,
              260,
              () => {
                this.combatEngine.executeAbility(enemy, step.ability, step.targetCoord);
                this.renderer.triggerSpellImpact(step.targetCoord, step.ability.element, step.ability.aoeRadius > 0);
                resolve();
              }
            );
          });
          if (this.networkManager.isHost()) {
            this.networkManager.send({
              type: 'EVENT_CAST',
              casterId: enemy.id,
              abilityId: step.ability.id,
              targetCoord: step.targetCoord,
            });
          }
          this.updateHUD();
          await delay(250);
        }
      }
    }

    this.focusedUnitId = null;

    // 3. Hazard & Environment Tick
    this.hazardManager.tickHazards();
    this.combatEngine.tickZombies();
    this.combatEngine.statusManager.tickStatusEffects(this.hero);
    if (this.combatEngine.coopHero) {
      this.combatEngine.statusManager.tickStatusEffects(this.combatEngine.coopHero);
    }

    // Check if heroes or enemies wiped
    if (this.combatEngine.areAllHeroesDead()) {
      this.isBusy = false;
      this.checkCombatState();
      return;
    }

    if (this.combatEngine.areAllEnemiesDead()) {
      this.isBusy = false;
      this.checkCombatState();
      return;
    }

    // Advance to next Player cycle
    const nextPlayer: 1 | 2 = !this.hero.isDead ? 1 : 2;
    const activeHero = nextPlayer === 1 ? this.hero : this.combatEngine.coopHero!;
    this.turnManager.startCoopTurn(nextPlayer, activeHero);

    if (this.networkManager.isHost()) {
      this.networkManager.send({
        type: 'EVENT_PHASE_CHANGE',
        phase: nextPlayer === 1 ? 'COOP_P1_TURN' : 'COOP_P2_TURN',
        activePlayer: nextPlayer,
      });
    }

    this.isBusy = false;
    this.updateCoopTurnHUD();
    this.updateReachableTiles();
    this.updateHUD();
  }

  private triggerTacticalPing(coord: GridCoord, playerNum: 1 | 2, label?: string): void {
    this.renderer.activePings.push({
      coord,
      label: label || (playerNum === 1 ? 'P1 📍' : 'P2 📍'),
      playerNum,
      age: 0,
      maxAge: 2500,
    });
    this.soundEngine.playClick();
    if (this.isCoopMode && this.networkManager.isConnected() && playerNum === this.coopLocalPlayer) {
      this.networkManager.send({
        type: 'TACTICAL_PING',
        playerNum,
        coord,
        label,
      });
    }
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
    // Interactive Elemental Catalyst Orbs on Home Screen with dynamic live preview & sound
    const previewBox = document.getElementById('home-orb-preview-box');
    const previewIcon = document.getElementById('home-orb-preview-icon');
    const previewTitle = document.getElementById('home-orb-preview-title');
    const previewDesc = document.getElementById('home-orb-preview-desc');

    document.querySelectorAll('.home-orb').forEach((orb) => {
      orb.addEventListener('mouseenter', () => {
        const elem = orb.getAttribute('data-element') as ElementType;
        if (!elem) return;
        const config = HERO_CLASSES[elem];
        const elemData = CORE_ELEMENTS[elem];
        const className = config ? config.className : `${elem}mancer`;
        const title = `${className} (${elem})`;
        const desc = elemData ? elemData.description : (config ? config.description : 'Master of raw elemental forces.');

        if (previewIcon) previewIcon.textContent = orb.textContent || '✨';
        if (previewTitle) {
          previewTitle.textContent = title;
          previewTitle.style.color = elemData ? elemData.color : '#38bdf8';
        }
        if (previewDesc) previewDesc.textContent = desc;
        if (previewBox && elemData) {
          previewBox.style.borderColor = elemData.color;
          previewBox.style.boxShadow = `0 0 25px ${elemData.glowColor}, inset 0 0 12px ${elemData.glowColor}`;
        }
        this.soundEngine.playClick();
      });

      orb.addEventListener('mouseleave', () => {
        if (previewIcon) previewIcon.textContent = '✨';
        if (previewTitle) {
          previewTitle.textContent = 'Choose Your Affinity';
          previewTitle.style.color = '#f8fafc';
        }
        if (previewDesc) previewDesc.textContent = 'Hover over any catalyst orb to preview powers, or click to battle CPUs immediately!';
        if (previewBox) {
          previewBox.style.borderColor = 'rgba(56, 189, 248, 0.35)';
          previewBox.style.boxShadow = '0 0 20px rgba(0, 0, 0, 0.5), inset 0 0 12px rgba(56, 189, 248, 0.1)';
        }
      });

      orb.addEventListener('click', () => {
        const elem = orb.getAttribute('data-element') as ElementType;
        if (!elem) return;

        this.soundEngine.playSpellCast(elem);
        if (this.unlockManager.isElementUnlocked(elem)) {
          this.selectedElement = elem;
          this.characterSelectModal.classList.add('hidden');
          this.hideHomeScreen();
          this.restartGame(elem);
          const config = HERO_CLASSES[elem];
          const className = config ? config.className : elem;
          this.combatEngine.addLog('system', `⚔️ Selected ${className} (${elem})! Entering the arena to fight CPU forces!`);
        } else {
          this.hideHomeScreen();
          this.renderCharacterSelectModal();
          this.characterSelectModal.classList.remove('hidden');
        }
      });
    });

    // Quick Play Hero Action Button
    document.getElementById('home-btn-quick-play')?.addEventListener('click', () => {
      this.soundEngine.playSpellCast(this.selectedElement || 'Fire');
      this.hideHomeScreen();
      this.restartGame(this.selectedElement || 'Fire');
      const config = HERO_CLASSES[this.selectedElement || 'Fire'];
      const className = config ? config.className : 'Pyromancer';
      this.combatEngine.addLog('system', `🔥 Quick Battle Started! Entering the gauntlet as ${className}!`);
    });

    // Home Quick Utility Buttons (Top Bar)
    const quickSoundBtn = document.getElementById('home-quick-sound-btn');
    if (quickSoundBtn) {
      quickSoundBtn.addEventListener('click', () => {
        this.soundEngine.unlockAudio();
        const isMuted = this.soundEngine.toggleMute();
        quickSoundBtn.innerHTML = isMuted ? '<span class="util-icon">🔇</span> Sound OFF' : '<span class="util-icon">🔊</span> Sound ON';
        const navSound = document.getElementById('nav-sound-btn');
        if (navSound) {
          navSound.textContent = isMuted ? '🔇 Sound OFF' : '🔊 Sound ON';
          navSound.style.color = isMuted ? '#f87171' : '#7dd3fc';
        }
        this.soundEngine.playClick();
      });
    }

    document.getElementById('home-quick-cutscene-btn')?.addEventListener('click', () => {
      this.soundEngine.playClick();
      this.originCutscene.open();
    });

    document.getElementById('home-btn-origin-cta')?.addEventListener('click', () => {
      this.soundEngine.playClick();
      this.originCutscene.open();
    });

    document.getElementById('home-quick-admin-btn')?.addEventListener('click', () => {
      this.soundEngine.playClick();
      this.openAdminPanel();
    });

    // Home Screen Actions
    document.getElementById('home-btn-choose-element')?.addEventListener('click', () => {
      this.soundEngine.playClick();
      this.hideHomeScreen();
      this.renderCharacterSelectModal();
      this.characterSelectModal.classList.remove('hidden');
    });

    document.getElementById('home-btn-element-card')?.addEventListener('click', () => {
      this.soundEngine.playClick();
      this.hideHomeScreen();
      this.renderCharacterSelectModal();
      this.characterSelectModal.classList.remove('hidden');
    });

    this.homeBtnCampaign?.addEventListener('click', () => {
      this.soundEngine.playClick();
      this.hideHomeScreen();
      this.renderCharacterSelectModal();
      this.characterSelectModal.classList.remove('hidden');
    });

    // Elemental Sandbox Listeners
    document.getElementById('nav-sandbox-btn')?.addEventListener('click', () => {
      this.soundEngine.playClick();
      this.startSandboxMode();
    });

    document.getElementById('home-btn-sandbox')?.addEventListener('click', () => {
      this.soundEngine.playClick();
      this.startSandboxMode();
    });

    document.getElementById('home-btn-sandbox-card')?.addEventListener('click', () => {
      this.soundEngine.playClick();
      this.startSandboxMode();
    });

    // Online Co-op Listeners
    this.navCoopBtn?.addEventListener('click', () => {
      this.soundEngine.playClick();
      this.openCoopModal('host');
    });

    document.getElementById('home-btn-coop')?.addEventListener('click', () => {
      this.soundEngine.playClick();
      this.openCoopModal('host');
    });

    document.getElementById('home-btn-coop-card')?.addEventListener('click', () => {
      this.soundEngine.playClick();
      this.openCoopModal('host');
    });

    document.getElementById('home-btn-multiplayer')?.addEventListener('click', () => {
      this.soundEngine.playClick();
      this.openHotseatSelection();
    });

    document.getElementById('nav-multiplayer-btn')?.addEventListener('click', () => {
      this.soundEngine.playClick();
      this.openHotseatSelection();
    });

    document.getElementById('pvp-arena-btn')?.addEventListener('click', () => {
      this.soundEngine.playClick();
      this.openHotseatSelection();
    });

    document.getElementById('char-select-multiplayer-btn')?.addEventListener('click', () => {
      this.soundEngine.playClick();
      this.characterSelectModal.classList.add('hidden');
      this.openHotseatSelection();
    });

    this.homeBtnHotseat?.addEventListener('click', () => {
      this.soundEngine.playClick();
      this.openHotseatSelection();
    });

    this.homeBtnCodex?.addEventListener('click', () => {
      this.soundEngine.playClick();
      this.openCodex();
    });

    this.homeBtnGuide?.addEventListener('click', () => {
      this.soundEngine.playClick();
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

    // Global User Gesture to unlock AudioContext
    window.addEventListener('pointerdown', () => this.soundEngine.unlockAudio(), { once: true });
    window.addEventListener('keydown', () => this.soundEngine.unlockAudio(), { once: true });

    // Sound Toggle Button in Header
    const soundBtn = document.getElementById('nav-sound-btn');
    soundBtn?.addEventListener('click', () => {
      this.soundEngine.unlockAudio();
      const isMuted = this.soundEngine.toggleMute();
      soundBtn.textContent = isMuted ? '🔇 Sound OFF' : '🔊 Sound ON';
      soundBtn.style.color = isMuted ? '#f87171' : '#7dd3fc';
      soundBtn.style.borderColor = isMuted ? 'rgba(239, 68, 68, 0.4)' : 'rgba(56, 189, 248, 0.4)';
      this.soundEngine.playClick();
    });

    // Admin God Panel Controls & Creator Passcode Authentication
    document.getElementById('nav-admin-btn')?.addEventListener('click', () => {
      this.soundEngine.playClick();
      this.openAdminPanel();
    });

    document.getElementById('close-admin-btn')?.addEventListener('click', () => {
      this.soundEngine.playClick();
      this.closeAdminPanel();
    });

    document.getElementById('admin-auth-form')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const input = document.getElementById('admin-passcode-input') as HTMLInputElement;
      const msgEl = document.getElementById('admin-auth-msg');
      if (!input) return;

      const success = this.adminManager.authenticate(input.value);
      if (success) {
        if (msgEl) {
          msgEl.style.color = '#86efac';
          msgEl.textContent = '✅ Access Granted! Welcome, Creator DavePaul.';
        }
        input.value = '';
        this.renderer.particleEngine.triggerScreenShake(8, 250);
        const pos = this.renderer.gridToScreen(this.hero.coord);
        this.renderer.particleEngine.addFloatingText('👑 CREATOR AUTHENTICATED!', pos.x, pos.y - 40, '#fde68a', 26);
        this.combatEngine.addLog('system', '👑 ADMIN: Creator master passcode verified. Welcome back, DavePaul!');
        setTimeout(() => {
          this.updateAdminUI();
        }, 300);
      } else {
        if (msgEl) {
          msgEl.style.color = '#f87171';
          msgEl.textContent = '❌ Access Denied: Invalid Creator Passcode!';
        }
        this.renderer.particleEngine.triggerScreenShake(6, 200);
        input.select();
      }
    });

    document.getElementById('admin-logout-btn')?.addEventListener('click', () => {
      this.adminManager.logout();
      this.updateAdminUI();
      this.combatEngine.addLog('system', '🔒 ADMIN: Console locked and creator signed out.');
    });

    const commandForm = document.getElementById('admin-command-form');
    const commandInput = document.getElementById('admin-command-input') as HTMLInputElement | null;
    const commandFeedback = document.getElementById('admin-command-feedback');
    commandForm?.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!commandInput) return;
      const cmd = commandInput.value.trim();
      if (!cmd) return;
      const result = this.executeAdminCommand(cmd);
      if (commandFeedback) {
        commandFeedback.textContent = result.message;
        commandFeedback.style.color = result.success ? '#86efac' : '#f87171';
      }
      if (result.success) {
        commandInput.value = '';
      }
    });

    document.getElementById('admin-btn-ap')?.addEventListener('click', () => {
      if (!this.adminManager.canUseAdminCommands(this.isHotseatMode, this.hotseatCurrentPlayer)) {
        this.openAdminPanel();
        return;
      }
      this.hero.stats.maxAp = 99;
      this.hero.stats.currentAp = 99;
      this.renderer.particleEngine.triggerScreenShake(8, 250);
      const pos = this.renderer.gridToScreen(this.hero.coord);
      this.renderer.particleEngine.addFloatingText('⚡ 99 AP GOD POWER!', pos.x, pos.y - 30, '#fde68a', 26);
      this.combatEngine.addLog('system', '👑 ADMIN: Granted 99 AP to Creator champion!');
      this.updateReachableTiles();
      this.updateHUD();
    });

    document.getElementById('admin-btn-hp')?.addEventListener('click', () => {
      if (!this.adminManager.canUseAdminCommands(this.isHotseatMode, this.hotseatCurrentPlayer)) {
        this.openAdminPanel();
        return;
      }
      this.hero.stats.maxHp = 9999;
      this.hero.stats.currentHp = 9999;
      this.renderer.particleEngine.triggerScreenShake(8, 250);
      const pos = this.renderer.gridToScreen(this.hero.coord);
      this.renderer.particleEngine.addFloatingText('💖 9999 HP GOD MODE!', pos.x, pos.y - 30, '#4ade80', 26);
      this.combatEngine.addLog('system', '👑 ADMIN: Set Creator HP to 9999 (Invincibility)!');
      this.updateHUD();
    });

    document.getElementById('admin-btn-smite')?.addEventListener('click', () => {
      if (!this.adminManager.canUseAdminCommands(this.isHotseatMode, this.hotseatCurrentPlayer)) {
        this.openAdminPanel();
        return;
      }
      this.renderer.particleEngine.triggerScreenShake(20, 600);
      this.combatEngine.addLog('system', '👑 ADMIN SMITE: Obliterated all enemies!');
      for (const enemy of this.enemies) {
        if (!enemy.isDead) {
          enemy.stats.currentHp = 0;
          enemy.isDead = true;
          this.renderer.triggerDeathAnimation(enemy, 'Light');
        }
      }
      this.closeAdminPanel();
      this.updateHUD();
      this.checkCombatState();
    });

    document.getElementById('admin-btn-mass-resurrection')?.addEventListener('click', () => {
      if (!this.adminManager.canUseAdminCommands(this.isHotseatMode, this.hotseatCurrentPlayer)) {
        this.openAdminPanel();
        return;
      }
      this.invokeAdminMassResurrection();
      this.closeAdminPanel();
    });

    document.getElementById('admin-btn-grant-powers')?.addEventListener('click', () => {
      if (!this.adminManager.canUseAdminCommands(this.isHotseatMode, this.hotseatCurrentPlayer)) {
        this.openAdminPanel();
        return;
      }
      this.grantAllAdminPowers();
      this.closeAdminPanel();
    });

    document.getElementById('admin-btn-create-power')?.addEventListener('click', () => {
      if (!this.adminManager.canUseAdminCommands(this.isHotseatMode, this.hotseatCurrentPlayer)) {
        this.openAdminPanel();
        return;
      }
      const defaultName = `Admin Obliteration ${Math.floor(Math.random() * 1000)}`;
      const powerName = prompt('Enter a name for your new Admin Power:', defaultName) || defaultName;
      const dmgStr = prompt('Enter base damage for this power:', '999') || '999';
      const dmg = parseInt(dmgStr, 10) || 999;
      createAdminPower(powerName, dmg, 7, 2, `Devastating custom admin power crafted by Creator DavePaul.`);
      this.closeAdminPanel();
    });

    document.getElementById('admin-btn-convert-op')?.addEventListener('click', () => {
      if (!this.adminManager.canUseAdminCommands(this.isHotseatMode, this.hotseatCurrentPlayer)) {
        this.openAdminPanel();
        return;
      }
      this.convertOverpoweredToAdmin();
      this.closeAdminPanel();
    });

    document.getElementById('admin-btn-spawn-zombies')?.addEventListener('click', () => {
      if (!this.adminManager.canUseAdminCommands(this.isHotseatMode, this.hotseatCurrentPlayer)) {
        this.openAdminPanel();
        return;
      }
      let count = 0;
      for (let x = 0; x < this.grid.size && count < 8; x++) {
        for (let y = 0; y < this.grid.size && count < 8; y++) {
          const coord = { x, y };
          if (this.grid.isWalkable(coord) && !this.combatEngine.getUnitAt(coord)) {
            this.combatEngine.spawnZombie(coord, 60, 4, 'Player');
            count++;
          }
        }
      }
      this.combatEngine.addLog('system', `👑 ADMIN: Summoned ${count} Reanimated Zombies!`);
      this.renderer.particleEngine.triggerScreenShake(10, 300);
      this.closeAdminPanel();
      this.updateHUD();
    });

    document.getElementById('admin-btn-spawn-wizard-zombie')?.addEventListener('click', () => {
      if (!this.adminManager.canUseAdminCommands(this.isHotseatMode, this.hotseatCurrentPlayer)) {
        this.openAdminPanel();
        return;
      }
      for (let x = 0; x < this.grid.size; x++) {
        for (let y = 0; y < this.grid.size; y++) {
          const coord = { x, y };
          if (this.grid.isWalkable(coord) && !this.combatEngine.getUnitAt(coord)) {
            this.hazardManager.applyHazard(coord, 'VoidRift', 5, 20, 'Void');
            const wiz = this.combatEngine.spawnZombie(coord, 70, 6, 'Player', 'Wizard');
            this.combatEngine.addLog('system', `👑 ADMIN: Summoned Legendary ${wiz.name} (1 in 10,000 Rare) from a Void Rift on the floor!`);
            this.renderer.particleEngine.triggerScreenShake(12, 400);
            this.closeAdminPanel();
            this.updateHUD();
            return;
          }
        }
      }
    });

    document.getElementById('admin-btn-spawn-all-zombies')?.addEventListener('click', () => {
      if (!this.adminManager.canUseAdminCommands(this.isHotseatMode, this.hotseatCurrentPlayer)) {
        this.openAdminPanel();
        return;
      }
      const allClasses: Array<{ zc: ZombieClass; hazard: TileHazardType; elem: ElementType }> = [
        { zc: 'Frostbite', hazard: 'IceSurface', elem: 'Cold' },
        { zc: 'Boomer', hazard: 'LavaPool', elem: 'Fire' },
        { zc: 'Electro', hazard: 'ElectrifiedPuddle', elem: 'Lightning' },
        { zc: 'PlagueBearer', hazard: 'ToxicMire', elem: 'Poison' },
        { zc: 'Spitter', hazard: 'AcidPool', elem: 'Acid' },
        { zc: 'Wizard', hazard: 'VoidRift', elem: 'Void' },
        { zc: 'DeathKnight', hazard: 'BonePile', elem: 'Death' },
        { zc: 'Brute', hazard: 'MudWall', elem: 'Earth' },
        { zc: 'Runner', hazard: 'Puddle', elem: 'Water' },
        { zc: 'Screamer', hazard: 'CrystalSpikes', elem: 'Sound' },
        { zc: 'Walker', hazard: 'None', elem: 'Neutral' },
      ];
      let spawned = 0;
      for (const item of allClasses) {
        let placed = false;
        for (let x = 0; x < this.grid.size && !placed; x++) {
          for (let y = 0; y < this.grid.size && !placed; y++) {
            const coord = { x, y };
            if (this.grid.isWalkable(coord) && !this.combatEngine.getUnitAt(coord)) {
              if (item.hazard !== 'None') {
                this.hazardManager.applyHazard(coord, item.hazard, 5, 10, item.elem);
              }
              this.combatEngine.spawnZombie(coord, 60, 4, 'Player', item.zc);
              spawned++;
              placed = true;
            }
          }
        }
      }
      this.combatEngine.addLog(
        'system',
        `👑 ADMIN: Summoned all ${spawned} Specialized Zombie Classes rising from their native floor elements (Frost, Lava, Puddle, Mire, Void Rift, etc.)!`
      );
      this.renderer.particleEngine.triggerScreenShake(14, 500);
      this.closeAdminPanel();
      this.updateHUD();
    });

    document.getElementById('admin-btn-spawn-1000-wizards')?.addEventListener('click', () => {
      if (!this.adminManager.canUseAdminCommands(this.isHotseatMode, this.hotseatCurrentPlayer)) {
        this.openAdminPanel();
        return;
      }
      this.soundEngine.unlockAudio();
      this.soundEngine.playZombieSpawn();
      setTimeout(() => this.soundEngine.playZombieScream(), 150);

      const walkableCoords: GridCoord[] = [];
      for (let x = 0; x < this.grid.size; x++) {
        for (let y = 0; y < this.grid.size; y++) {
          const c = { x, y };
          if (this.grid.isWalkable(c)) {
            walkableCoords.push(c);
          }
        }
      }

      const totalToSpawn = 1000;
      for (let i = 0; i < totalToSpawn; i++) {
        const coord = walkableCoords[i % walkableCoords.length] || { x: i % 10, y: Math.floor(i / 10) % 10 };
        this.combatEngine.spawnZombie(coord, 70, 6, 'Player', 'Wizard', true);
      }

      this.combatEngine.addLog(
        'system',
        `👑 ADMIN: Summoned an apocalyptic legion of 1,000 Wizard Zombies! (${this.combatEngine.zombies.length} Undead Active)`
      );
      this.renderer.particleEngine.triggerScreenShake(18, 700);
      this.closeAdminPanel();
      this.updateHUD();
    });

    document.getElementById('admin-btn-spawn-life')?.addEventListener('click', () => {
      if (!this.adminManager.canUseAdminCommands(this.isHotseatMode, this.hotseatCurrentPlayer)) {
        this.openAdminPanel();
        return;
      }
      let count = 0;
      for (let x = 0; x < this.grid.size && count < 4; x++) {
        for (let y = 0; y < this.grid.size && count < 4; y++) {
          const coord = { x, y };
          if (this.grid.isWalkable(coord) && !this.combatEngine.getUnitAt(coord)) {
            this.combatEngine.spawnLifeBeing(coord, 'Player');
            count++;
          }
        }
      }
      this.combatEngine.addLog('system', `👑 ADMIN: Summoned ${count} Beings of Life!`);
      this.renderer.particleEngine.triggerScreenShake(10, 300);
      this.closeAdminPanel();
      this.updateHUD();
    });

    document.getElementById('admin-btn-cleanse')?.addEventListener('click', () => {
      if (!this.adminManager.canUseAdminCommands(this.isHotseatMode, this.hotseatCurrentPlayer)) {
        this.openAdminPanel();
        return;
      }
      for (let x = 0; x < this.grid.size; x++) {
        for (let y = 0; y < this.grid.size; y++) {
          const tile = this.grid.getTile({ x, y });
          if (tile) {
            tile.hazard = { type: 'None', duration: 0, damagePerTurn: 0, element: 'Neutral' };
          }
        }
      }
      this.combatEngine.addLog('system', '👑 ADMIN: Cleansed all hazards from battlefield!');
      this.closeAdminPanel();
      this.updateHUD();
    });

    document.getElementById('admin-btn-resources')?.addEventListener('click', () => {
      if (!this.adminManager.canUseAdminCommands(this.isHotseatMode, this.hotseatCurrentPlayer)) {
        this.openAdminPanel();
        return;
      }
      this.totalEssence += 9999;
      this.totalXp += 9999;
      this.updateHUD();
      this.combatEngine.addLog('system', '👑 ADMIN: Granted +9999 Essence and +9999 XP to Creator!');
    });

    document.getElementById('admin-btn-next-round')?.addEventListener('click', () => {
      if (!this.adminManager.canUseAdminCommands(this.isHotseatMode, this.hotseatCurrentPlayer)) {
        this.openAdminPanel();
        return;
      }
      this.closeAdminPanel();
      this.enemies.forEach((e) => { e.isDead = true; e.stats.currentHp = 0; });
      this.checkCombatState();
    });

    document.getElementById('admin-btn-last-level')?.addEventListener('click', () => {
      this.goToLastLevel(15);
    });

    document.getElementById('admin-btn-void-overlord')?.addEventListener('click', () => {
      this.goToVoidOverlord();
    });

    document.getElementById('admin-btn-jump-1000')?.addEventListener('click', () => {
      if (!this.adminManager.canUseAdminCommands(this.isHotseatMode, this.hotseatCurrentPlayer)) {
        this.openAdminPanel();
        return;
      }
      this.closeAdminPanel();
      this.currentRound += 999;
      this.advanceToNextRound();
      this.combatEngine.addLog('system', `👑 ADMIN: Warped 1,000 rounds forward to Round ${this.currentRound.toLocaleString()}!`);
    });

    document.getElementById('admin-btn-jump-1000000')?.addEventListener('click', () => {
      if (!this.adminManager.canUseAdminCommands(this.isHotseatMode, this.hotseatCurrentPlayer)) {
        this.openAdminPanel();
        return;
      }
      this.closeAdminPanel();
      this.currentRound += 999999;
      this.advanceToNextRound();
      this.combatEngine.addLog('system', `👑 ADMIN: Warped 1,000,000 rounds forward to Round ${this.currentRound.toLocaleString()}!`);
    });

    document.getElementById('admin-btn-jump-billion')?.addEventListener('click', () => {
      if (!this.adminManager.canUseAdminCommands(this.isHotseatMode, this.hotseatCurrentPlayer)) {
        this.openAdminPanel();
        return;
      }
      this.closeAdminPanel();
      this.currentRound += 999999999;
      this.advanceToNextRound();
      this.combatEngine.addLog('system', `👑 ADMIN: Warped 1,000,000,000 rounds forward to Round ${this.currentRound.toLocaleString()}!`);
    });

    document.getElementById('admin-btn-hero-death')?.addEventListener('click', () => {
      if (!this.adminManager.canUseAdminCommands(this.isHotseatMode, this.hotseatCurrentPlayer)) {
        this.openAdminPanel();
        return;
      }
      this.closeAdminPanel();
      this.hero.stats.currentHp = 0;
      this.hero.isDead = true;
      this.checkCombatState();
    });

    document.getElementById('admin-btn-cpu-death')?.addEventListener('click', () => {
      if (!this.adminManager.canUseAdminCommands(this.isHotseatMode, this.hotseatCurrentPlayer)) {
        this.openAdminPanel();
        return;
      }
      this.closeAdminPanel();
      const targetEnemy = this.enemies.find((e) => !e.isDead) || this.enemies[0];
      if (targetEnemy) {
        targetEnemy.stats.currentHp = 0;
        targetEnemy.isDead = true;
        this.deadUnitIds.add(targetEnemy.id);
        this.renderer.triggerDeathAnimation(targetEnemy, 'Darkness');
        this.combatEngine.addLog('system', `👑 ADMIN: Executed CPU Death FX Test on ${targetEnemy.name}!`);
        this.checkCombatState();
      }
    });

    document.getElementById('admin-btn-test-scream')?.addEventListener('click', () => {
      this.soundEngine.unlockAudio();
      this.soundEngine.playZombieScream();
      setTimeout(() => this.soundEngine.playScreamerWail(), 450);
      setTimeout(() => {
        this.soundEngine.playZombieBite();
        this.soundEngine.playHumanScream(1.0, true);
        this.renderer.particleEngine.triggerScreenShake(12, 450);
        const heroPos = this.renderer.gridToScreen(this.hero.coord);
        this.renderer.particleEngine.addFloatingText('🩸 CHOMP! 😱 AAAAAAAHHH!', heroPos.x, heroPos.y - 30, '#ef4444', 28);
        this.renderer.particleEngine.emit(heroPos.x, heroPos.y, '#dc2626', 30, 4);
      }, 900);
      this.combatEngine.addLog('system', '👑 ADMIN: Synthesized Bloodcurdling Zombie Screams & Loud Human Scream!');
    });

    document.getElementById('admin-btn-zombies-eat-you')?.addEventListener('click', () => {
      this.soundEngine.unlockAudio();
      this.soundEngine.playZombieScream();
      setTimeout(() => {
        this.soundEngine.playZombieBite();
        this.soundEngine.playHumanScream(1.0, true);
        this.renderer.particleEngine.triggerScreenShake(14, 550);
        const heroPos = this.renderer.gridToScreen(this.hero.coord);
        this.renderer.particleEngine.addFloatingText('🩸 DEVOURING! 😱 AAAAAAAAHHHH!', heroPos.x, heroPos.y - 35, '#ef4444', 30);
        this.renderer.particleEngine.emit(heroPos.x, heroPos.y, '#dc2626', 45, 5);
        this.combatEngine.addLog('system', '👑 ADMIN: The zombies are eating you alive! Bloodcurdling Loud Human Scream!');
      }, 350);
    });

    document.getElementById('admin-btn-spawn-enemy-zombies')?.addEventListener('click', () => {
      this.soundEngine.unlockAudio();
      let count = 0;
      const neighbors = this.grid.getNeighbors(this.hero.coord);
      for (const coord of neighbors) {
        if (!this.grid.getTile(coord)?.isObstacle && this.combatEngine.getUnitAt(coord) === null) {
          this.combatEngine.spawnZombie(coord, 60, 4, 'Enemy');
          count++;
          if (count >= 4) break;
        }
      }
      this.soundEngine.playZombieSpawn();
      setTimeout(() => this.soundEngine.playZombieScream(), 150);
      this.combatEngine.addLog('system', `👑 ADMIN: Summoned ${count} Hostile Enemy Zombies surrounding you! Prepare to be eaten!`);
      this.renderer.particleEngine.triggerScreenShake(10, 300);
      this.closeAdminPanel();
      this.updateHUD();
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

      // Placement Preview & Drag Painting
      if (this.activePlacementItem && gridCoord) {
        const canPlace = this.placementManager.canPlaceAt(
          this.activePlacementItem,
          gridCoord,
          this.grid,
          this.combatEngine
        );
        this.renderer.activePlacementPreview = {
          icon: this.activePlacementItem.icon,
          name: this.activePlacementItem.name,
          category: this.activePlacementItem.category,
          color: this.activePlacementItem.color,
          isValid: canPlace.valid,
        };

        if (
          this.isPlacementMouseDown &&
          (!this.lastPlacedCoord ||
            this.lastPlacedCoord.x !== gridCoord.x ||
            this.lastPlacedCoord.y !== gridCoord.y)
        ) {
          this.handlePlacementAtCoord(gridCoord);
        }
      } else {
        this.renderer.activePlacementPreview = null;
      }

      if (this.isCoopMode && this.networkManager.isConnected()) {
        const now = performance.now();
        if (now - this.lastCursorHoverSent > 60) {
          this.lastCursorHoverSent = now;
          this.networkManager.send({
            type: 'CURSOR_HOVER',
            playerNum: this.coopLocalPlayer,
            coord: gridCoord,
          });
        }
      }
    });

    canvas.addEventListener('mousedown', (e) => {
      if (e.button === 0 && this.activePlacementItem) {
        this.isPlacementMouseDown = true;
        const gridCoord = this.renderer.screenToGrid(e.clientX, e.clientY);
        if (gridCoord) {
          this.handlePlacementAtCoord(gridCoord);
        }
      }
    });

    window.addEventListener('mouseup', () => {
      this.isPlacementMouseDown = false;
      this.lastPlacedCoord = null;
    });

    canvas.addEventListener('contextmenu', (e) => {
      if (!this.isSandboxMode) return;
      e.preventDefault();
      const gridCoord = this.renderer.screenToGrid(e.clientX, e.clientY);
      if (!gridCoord) return;

      this.openSandboxContextMenu(e.clientX, e.clientY, gridCoord);
    });

    window.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      if (this.sandboxContextMenu && !this.sandboxContextMenu.contains(target)) {
        this.hideSandboxContextMenu();
      }
    });

    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.hideSandboxContextMenu();
        if (this.activePlacementItem) {
          this.deselectPlacementBrush();
        }
      }
    });

    canvas.addEventListener('click', async (e) => {
      if (this.isBusy) return;
      this.hideSandboxContextMenu();
      const gridCoord = this.renderer.screenToGrid(e.clientX, e.clientY);
      if (!gridCoord) return;

      if (this.activePlacementItem) {
        this.handlePlacementAtCoord(gridCoord);
        return;
      }

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

    // Home Menu Resume Tile Actions
    this.homeBtnResume?.addEventListener('click', (e) => {
      if ((e.target as HTMLElement).closest('#home-resume-discard-btn')) {
        return;
      }
      this.soundEngine.playClick();
      this.resumeSavedGame();
    });

    this.homeResumeActionBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.soundEngine.playClick();
      this.resumeSavedGame();
    });

    this.homeBtnResumeCta?.addEventListener('click', () => {
      this.soundEngine.playClick();
      this.resumeSavedGame();
    });

    this.homeResumeDiscardBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.soundEngine.playClick();
      this.saveManager.clearSave();
      this.updateHomeResumeTile();
    });

    // Resume Run Modal Actions
    this.resumeGameBtn?.addEventListener('click', () => {
      this.soundEngine.playClick();
      this.resumeSavedGame();
    });

    this.discardSaveBtn?.addEventListener('click', () => {
      this.soundEngine.playClick();
      this.saveManager.clearSave();
      this.resumeRunModal.classList.add('hidden');
      this.updateHomeResumeTile();
      this.renderCharacterSelectModal();
      this.characterSelectModal.classList.remove('hidden');
    });

    // Auto-save on page exit or tab switch
    window.addEventListener('beforeunload', () => {
      this.autoSaveGame();
    });

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        this.autoSaveGame();
      }
    });

    window.addEventListener('keydown', (e) => {
      if (this.isBusy) return;

      const targetTag = (e.target as HTMLElement)?.tagName;
      if (targetTag === 'INPUT' || targetTag === 'TEXTAREA' || targetTag === 'SELECT') {
        if (e.key === 'Escape') {
          (e.target as HTMLElement).blur();
        }
        return;
      }

      if (e.key === 'F1' || e.key === '`' || e.key === '~') {
        e.preventDefault();
        this.toggleAdminPanel();
        return;
      }

      // Tactical Ping in Co-op Mode
      if (e.key === 'p' || e.key === 'P') {
        if (this.isCoopMode && this.hoveredCoord) {
          this.triggerTacticalPing(this.hoveredCoord, this.coopLocalPlayer);
          return;
        }
      }

      const activeUnit = this.getLocalPlayerUnit();
      if ((e.key >= '1' && e.key <= '9') || e.key === '0') {
        const idx = e.key === '0' ? 9 : parseInt(e.key) - 1;
        const visibleAbility = this.hud.getVisibleAbility(idx) || activeUnit.abilities[idx];
        if (visibleAbility) {
          this.selectAbility(visibleAbility);
        }
      } else if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault();
        this.endPlayerTurn();
      } else if (e.key === 'Escape') {
        this.selectedAbility = null;
        this.targetableTiles = [];
        this.closeAdminPanel();
        this.updateHUD();
      }
    });

    this.initHomeSecrets();
  }

  private initHomeSecrets(): void {
    const secretSpots = document.querySelectorAll<HTMLElement>('.home-secret-spot');
    const modal = document.getElementById('home-secret-modal');
    const closeBtn = document.getElementById('home-secret-close-btn');
    const dismissBtn = document.getElementById('home-secret-dismiss-btn');
    const actionBtn = document.getElementById('home-secret-action-btn') as HTMLButtonElement | null;
    const badgeEl = document.getElementById('home-secret-badge');
    const avatarEl = document.getElementById('home-secret-avatar');
    const titleEl = document.getElementById('home-secret-title');
    const tagEl = document.getElementById('home-secret-tag');
    const descEl = document.getElementById('home-secret-desc');
    const statsBox = document.getElementById('home-secret-stats-box');
    const countEl = document.getElementById('home-secrets-found-count');

    if (!modal || secretSpots.length === 0) return;

    const getDiscovered = (): Set<string> => {
      try {
        const raw = localStorage.getItem('elemental_mayhem_secrets_discovered');
        return raw ? new Set(JSON.parse(raw)) : new Set();
      } catch {
        return new Set();
      }
    };

    const saveDiscovered = (set: Set<string>): void => {
      try {
        localStorage.setItem('elemental_mayhem_secrets_discovered', JSON.stringify(Array.from(set)));
      } catch (err) {
        console.warn('Failed to save discovered secrets:', err);
      }
    };

    const updateCounterDisplay = () => {
      if (countEl) {
        countEl.textContent = `${getDiscovered().size}`;
      }
    };
    updateCounterDisplay();

    const secretsMap: Record<
      string,
      {
        badge: string;
        avatar: string;
        title: string;
        tag: string;
        desc: string;
        stats: string[];
        themeColor: string;
        actionLabel: string;
        onAction: () => void;
      }
    > = {
      'void-archon': {
        badge: '🌌 SECRET FINAL BOSS VISION',
        avatar: '🌌👑',
        title: 'THE VOID ARCHON',
        tag: 'Round 15 Supreme Overlord • 480 HP • Void Singularity',
        desc: 'The cosmic architect of the void waiting at the end of the 15-round gauntlet. Unleashes Cosmic Singularity, Dimensional Collapse, and Event Horizon Pulse to rend reality!',
        stats: ['480 Max HP', '7 AP', 'Void Affinity', 'Event Horizon Pulse', 'Dimensional Collapse'],
        themeColor: '#c084fc',
        actionLabel: '🌌 Challenge Final Boss in Arena',
        onAction: () => {
          modal.classList.add('hidden');
          this.goToLastLevel(15);
        },
      },
      'titan-colossus': {
        badge: '🗿 PRIMORDIAL TITAN REVEAL',
        avatar: '🗿🌋',
        title: 'THE TITAN COLOSSUS',
        tag: 'Round 10 Boss • 2,500 HP in Sandbox • Earth & Magma',
        desc: 'A monolithic primordial titan forged from the earth’s tectonic core. Smashes tectonic faults, summons molten volcanic fissures, and shrugs off mortal strikes.',
        stats: ['2,500 Max HP', 'Earth & Magma', 'Tectonic Cataclysm', 'Volcanic Rupture', 'Unstoppable'],
        themeColor: '#f59e0b',
        actionLabel: '🧪 Spawn Titan in Sandbox Mode',
        onAction: () => {
          modal.classList.add('hidden');
          this.startSandboxMode();
          setTimeout(() => {
            this.executeAdminCommand('spawn titan');
          }, 300);
        },
      },
      'ban-hammer': {
        badge: '👑 CREATOR GOD ARTIFACT',
        avatar: '🔨⚡',
        title: "THE CREATOR'S BAN HAMMER",
        tag: 'Supreme Admin Weapon • 999 Holy Damage • 0 Cooldown',
        desc: 'The ultimate server-level execution instrument. Striking with 999 Holy Admin Damage, it permanently expels any enemy into oblivion for 1 AP.',
        stats: ['999 Admin DMG', '1 AP Cost', '0 Cooldown', 'Instant Ban', 'Root Authority'],
        themeColor: '#ec4899',
        actionLabel: '👑 Open Creator Console',
        onAction: () => {
          modal.classList.add('hidden');
          this.adminManager.grantAdmin();
          this.openAdminPanel();
        },
      },
      'undead-legion': {
        badge: '🧟‍♂️ REANIMATION ARMY ARCHIVE',
        avatar: '🧟‍♂️💀',
        title: 'THE REANIMATED UNDEAD LEGION',
        tag: '11 Unique Zombie Classes • Necromantic Forces',
        desc: 'Slain warriors do not perish—they join the reanimated legion! Command Brutes, Electro Zombies, Death Knights, and Wizards with unique powers and status effects.',
        stats: ['11 Zombie Classes', 'Brute Stun', 'Death Knight Shield', 'Electro Zap', 'Wizard Bolts'],
        themeColor: '#10b981',
        actionLabel: '🧟 Summon Undead in Sandbox',
        onAction: () => {
          modal.classList.add('hidden');
          this.startSandboxMode();
          setTimeout(() => {
            this.executeAdminCommand('spawn zombies');
          }, 300);
        },
      },
      'chrono-paradox': {
        badge: '⏳ TEMPORAL COSMIC MYSTERY',
        avatar: '⏳✨',
        title: 'CHRONO PARADOX & TIME MAGIC',
        tag: '4th-Dimensional Power • Turn Acceleration & Rewind',
        desc: 'Distorts the fabric of space-time. Accelerates Action Points, resets ability cooldowns, and rewinds turns before catastrophe strikes. You uncover ancient essence!',
        stats: ['Grand Time Warp', 'Temporal Stasis', 'Turn Acceleration', '+50 🔮 Cosmic Essence'],
        themeColor: '#38bdf8',
        actionLabel: '🔮 Absorb +50 Cosmic Essence',
        onAction: () => {
          this.addEssence(50);
          this.soundEngine.playLevelUp();
          modal.classList.add('hidden');
        },
      },
      'reaction-matrix': {
        badge: '⚗️ ALCHEMICAL REACTION MATRIX',
        avatar: '💥⚡',
        title: 'ELEMENTAL REACTION MATRIX',
        tag: '50 Elemental Forces • Dynamic Combat Combos',
        desc: 'Discover explosive chain reactions: Vaporize (Fire + Water = 2.0x DMG), Superconduct (Ice + Lightning = Shockwave), and Overload (Fire + Lightning = Stun)!',
        stats: ['Vaporize (2.0x)', 'Superconduct AOE', 'Overload Stun', 'Toxic Detonation', '+50 🔮 Essence'],
        themeColor: '#eab308',
        actionLabel: '📖 Open Elemental Reaction Codex',
        onAction: () => {
          modal.classList.add('hidden');
          this.openCodex();
        },
      },
      'origin-cutscene': {
        badge: '🎬 THE AWAKENING MEMORIAL',
        avatar: '🎬✨',
        title: 'THE ORIGIN OF POWER',
        tag: 'Cinematic Chronicle • How Mortals Gained The Primal Elements',
        desc: 'Witness the ancient cataclysm that shattered the Primal Nexus and bound the three starter elements—Fire, Water, and Earth—to your mortal soul.',
        stats: ['Cinematic Chronicle', '3 Starter Sparks', '50-Element Matrix', 'Creator Mandate', '+50 🔮 Essence'],
        themeColor: '#f472b6',
        actionLabel: '🎬 Watch Origin Cutscene',
        onAction: () => {
          modal.classList.add('hidden');
          this.originCutscene.open();
        },
      },
    };

    secretSpots.forEach((spot) => {
      spot.addEventListener('click', (e) => {
        e.stopPropagation();
        this.soundEngine.unlockAudio();
        const secretKey = spot.getAttribute('data-secret') || '';
        const secret = secretsMap[secretKey];
        if (!secret) return;

        this.soundEngine.playLevelUp();
        this.triggerHomeClickNova(e.clientX, e.clientY);

        // Check if discovered for the first time
        const discovered = getDiscovered();
        const isNew = !discovered.has(secretKey);
        if (isNew) {
          discovered.add(secretKey);
          saveDiscovered(discovered);
          this.addEssence(50);
          updateCounterDisplay();
        }

        // Populate modal content
        if (badgeEl) badgeEl.textContent = secret.badge;
        if (avatarEl) avatarEl.textContent = secret.avatar;
        if (titleEl) {
          titleEl.textContent = secret.title;
          titleEl.style.background = `linear-gradient(135deg, #fff, ${secret.themeColor})`;
          (titleEl.style as any).webkitBackgroundClip = 'text';
          (titleEl.style as any).webkitTextFillColor = 'transparent';
        }
        if (tagEl) tagEl.textContent = secret.tag;
        if (descEl) descEl.textContent = secret.desc;

        if (statsBox) {
          statsBox.innerHTML = '';
          secret.stats.forEach((st) => {
            const pill = document.createElement('span');
            pill.style.cssText = `background: rgba(255,255,255,0.08); border: 1px solid ${secret.themeColor}88; color: #fff; font-size: 0.8rem; font-weight: 700; padding: 4px 12px; border-radius: 999px; box-shadow: 0 0 10px ${secret.themeColor}44;`;
            pill.textContent = st;
            statsBox.appendChild(pill);
          });
        }

        if (actionBtn) {
          actionBtn.textContent = secret.actionLabel;
          actionBtn.style.background = `linear-gradient(135deg, ${secret.themeColor}, #8b5cf6)`;
          actionBtn.style.borderColor = secret.themeColor;
          actionBtn.onclick = () => {
            this.soundEngine.playClick();
            secret.onAction();
          };
        }

        modal.classList.remove('hidden');
      });
    });

    const closeModal = () => {
      this.soundEngine.playClick();
      modal.classList.add('hidden');
    };

    closeBtn?.addEventListener('click', closeModal);
    dismissBtn?.addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        closeModal();
      }
    });
  }

  private getLocalPlayerUnit(): Unit {
    if (this.isHotseatMode) {
      return this.hotseatCurrentPlayer === 2 ? this.enemies[0] : this.hero;
    }
    if (this.isCoopMode) {
      return this.coopLocalPlayer === 2 ? (this.combatEngine?.coopHero || this.hero) : this.hero;
    }
    return this.hero;
  }

  private getActivePlayerUnit(): Unit {
    if (this.isHotseatMode && this.hotseatCurrentPlayer === 2) {
      return this.enemies[0];
    }
    if (this.isCoopMode) {
      const isP2Turn = this.turnManager.getPhase() === 'COOP_P2_TURN';
      if (isP2Turn && this.combatEngine?.coopHero) {
        return this.combatEngine.coopHero;
      }
      return this.hero;
    }
    return this.hero;
  }

  private selectAbility(ability: Ability): void {
    if (this.isCoopMode) {
      const phase = this.turnManager.getPhase();
      const isMyTurn = (this.coopLocalPlayer === 1 && phase === 'COOP_P1_TURN') ||
                       (this.coopLocalPlayer === 2 && phase === 'COOP_P2_TURN');
      if (!isMyTurn) return;
    }
    const activeUnit = this.getLocalPlayerUnit();
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
      } else if (
        ability.id === 'admin_mass_resurrection' ||
        ability.name.toLowerCase() === 'mass resurrection' ||
        ability.targeting === 'AnyTile'
      ) {
        // Admin Mass Resurrection & AnyTile abilities can be cast anywhere within range ignoring walls and line of sight!
        for (let x = 0; x < this.grid.size; x++) {
          for (let y = 0; y < this.grid.size; y++) {
            const coord = { x, y };
            const dist = this.grid.manhattanDistance(centerCoord, coord);
            if (dist <= ability.range) {
              this.targetableTiles.push(coord);
            }
          }
        }
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

  private async executeCoopMove(playerNum: 1 | 2, targetCoord: GridCoord): Promise<void> {
    const unit = playerNum === 1 ? this.hero : this.combatEngine.coopHero;
    if (!unit || unit.isDead) return;
    if (this.combatEngine.statusManager.hasStatus(unit, 'Rooted')) return;

    const tile = this.grid.getTile(targetCoord);
    if (!tile || tile.isObstacle) return;
    if (this.combatEngine.getUnitAt(targetCoord) !== null) return;

    const path = this.grid.findPath(unit.coord, targetCoord);
    if (!path || path.length === 0) return;

    const apCost = path.length * unit.stats.moveCostPerTile;
    if (unit.stats.currentAp < apCost) return;

    // Check confusion on unit
    if (unit.statusEffects.some((s) => s.type === 'Confused')) {
      if (Math.random() < 0.35) {
        const selfDmg = 10;
        unit.stats.currentHp = Math.max(0, unit.stats.currentHp - selfDmg);
        unit.stats.currentAp = Math.max(0, unit.stats.currentAp - 1);
        const screenPos = this.renderer.gridToScreen(unit.coord);
        this.renderer.particleEngine.addFloatingText(
          `🌀 Stumbled in Confusion! -${selfDmg}`,
          screenPos.x,
          screenPos.y - 20,
          '#f59e0b',
          20
        );
        this.renderer.particleEngine.emit(screenPos.x, screenPos.y, '#f59e0b', 16, 2.5);
        this.renderer.particleEngine.triggerScreenShake(4, 200);
        this.combatEngine.addLog(
          'system',
          `🌀 ${unit.name} is confused and stumbled, taking ${selfDmg} damage!`
        );
        if (unit.stats.currentHp <= 0) {
          unit.isDead = true;
          this.checkAndTriggerDeaths(unit.stats.elementalAffinity);
        }
        this.updateReachableTiles();
        this.updateHUD();
        this.checkCombatState();
        return;
      }
    }

    this.isBusy = true;
    this.reachableTiles = [];
    this.selectedAbility = null;
    this.targetableTiles = [];

    await new Promise<void>((resolve) => {
      this.renderer.animManager.animateMovement(unit.id, path, 160, () => {
        this.combatEngine.moveUnit(unit, targetCoord);
        if (this.networkManager.isHost()) {
          this.networkManager.send({
            type: 'EVENT_MOVE',
            unitId: unit.id,
            path,
            destination: targetCoord,
          });
        }
        resolve();
      });
    });

    this.isBusy = false;
    this.updateReachableTiles();
    this.updateHUD();
    this.checkCombatState();
  }

  private async executeCoopCast(playerNum: 1 | 2, abilityId: string, targetCoord: GridCoord): Promise<void> {
    const unit = playerNum === 1 ? this.hero : this.combatEngine.coopHero;
    if (!unit || unit.isDead) return;

    const ability = unit.abilities.find((a) => a.id === abilityId);
    if (!ability) return;

    if (unit.stats.currentAp < ability.apCost || ability.currentCooldown > 0) return;

    const dist = this.grid.manhattanDistance(unit.coord, targetCoord);
    if (dist > ability.range && ability.targeting !== 'Self') return;
    if (ability.targeting !== 'Self' && !this.grid.hasLineOfSight(unit.coord, targetCoord)) return;

    // Check confusion on unit
    if (unit.statusEffects.some((s) => s.type === 'Confused')) {
      if (Math.random() < 0.45) {
        const selfDmg = 15;
        unit.stats.currentHp = Math.max(0, unit.stats.currentHp - selfDmg);
        unit.stats.currentAp = Math.max(0, unit.stats.currentAp - 1);
        const screenPos = this.renderer.gridToScreen(unit.coord);
        this.renderer.particleEngine.addFloatingText(
          `🌀 Hurt in Confusion! -${selfDmg}`,
          screenPos.x,
          screenPos.y - 20,
          '#f59e0b',
          22
        );
        this.renderer.particleEngine.emit(screenPos.x, screenPos.y, '#f59e0b', 20, 3);
        this.renderer.particleEngine.triggerScreenShake(6, 250);
        this.soundEngine.playHit();
        this.combatEngine.addLog(
          'system',
          `🌀 ${unit.name} is confused and hurt itself for ${selfDmg} damage!`
        );
        if (unit.stats.currentHp <= 0) {
          unit.isDead = true;
          this.checkAndTriggerDeaths(unit.stats.elementalAffinity);
        }
        this.selectedAbility = null;
        this.targetableTiles = [];
        this.updateReachableTiles();
        this.updateHUD();
        this.checkCombatState();
        return;
      }
    }

    this.isBusy = true;
    this.selectedAbility = null;
    this.targetableTiles = [];
    this.reachableTiles = [];
    this.updateHUD();

    const startPos = this.renderer.gridToScreen(unit.coord);
    const targetPos = this.renderer.gridToScreen(targetCoord);
    const elemData = CORE_ELEMENTS[ability.element];
    const color = elemData ? elemData.color : '#ffd000';

    this.playAbilitySounds(ability);

    const isBeam = ability.name.toLowerCase().includes('beam') ||
      ability.name.toLowerCase().includes('ray') ||
      ability.name.toLowerCase().includes('lance') ||
      ability.name.toLowerCase().includes('flare');

    if (isBeam) {
      this.renderer.particleEngine.addBeam(startPos.x, startPos.y, targetPos.x, targetPos.y, color, 8, 320);
    }

    await new Promise<void>((resolve) => {
      this.renderer.projManager.spawnProjectile(startPos, targetPos, ability.element, color, 260, () => {
        const logCountBefore = this.combatEngine.logs.length;
        this.combatEngine.executeAbility(unit, ability, targetCoord);

        if (this.networkManager.isHost()) {
          this.networkManager.send({
            type: 'EVENT_CAST',
            casterId: unit.id,
            abilityId: ability.id,
            targetCoord,
          });
        }

        const isAoE = ability.aoeRadius > 0;
        this.renderer.triggerSpellImpact(targetCoord, ability.element, isAoE);

        const newLogs = this.combatEngine.logs.slice(logCountBefore);
        const reactionLog = newLogs.find((l) => l.type === 'reaction');

        if (ability.baseDamage > 0) {
          this.soundEngine.playHit();
          this.renderer.particleEngine.addFloatingText(
            `-${ability.baseDamage}`,
            targetPos.x,
            targetPos.y - 15,
            color,
            22
          );
        }

        if (ability.appliesStatus === 'Rooted') {
          this.soundEngine.playRoot();
        }

        if (reactionLog) {
          this.renderer.particleEngine.addFloatingText(
            `💥 ${reactionLog.message.split('!')[0]}!`,
            targetPos.x,
            targetPos.y - 38,
            '#f59e0b',
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

  private async handlePlayerMove(targetCoord: GridCoord): Promise<void> {
    if (this.isCoopMode) {
      const phase = this.turnManager.getPhase();
      const isMyTurn = (this.coopLocalPlayer === 1 && phase === 'COOP_P1_TURN') ||
                       (this.coopLocalPlayer === 2 && phase === 'COOP_P2_TURN');
      if (!isMyTurn) return;

      if (this.coopLocalPlayer === 2 && !this.networkManager.isHost()) {
        const isReachable = this.reachableTiles.some((c) => c.x === targetCoord.x && c.y === targetCoord.y);
        if (!isReachable) return;

        this.isBusy = true;
        this.networkManager.send({
          type: 'INTENT_MOVE',
          playerNum: 2,
          targetCoord,
        });
        this.reachableTiles = [];
        setTimeout(() => {
          if (this.isBusy && this.isCoopMode && this.coopLocalPlayer === 2) {
            this.isBusy = false;
            this.updateReachableTiles();
            this.updateHUD();
          }
        }, 2000);
        return;
      }

      if (this.networkManager.isHost()) {
        await this.executeCoopMove(1, targetCoord);
        return;
      }
    }

    const activeUnit = this.getActivePlayerUnit();
    if (this.combatEngine.statusManager.hasStatus(activeUnit, 'Rooted')) {
      const screenPos = this.renderer.gridToScreen(activeUnit.coord);
      this.renderer.particleEngine.addFloatingText(
        '⛓️ BOUND TO SPOT! (Rooted)',
        screenPos.x,
        screenPos.y - 25,
        '#c084fc',
        22
      );
      this.combatEngine.addLog('system', `⛓️ ${activeUnit.name} is Rooted and bound to the spot! Cannot run away!`);
      return;
    }

    const isReachable = this.reachableTiles.some((c) => c.x === targetCoord.x && c.y === targetCoord.y);
    if (!isReachable) return;

    // Check if player unit is Confused
    if (activeUnit.statusEffects.some((s) => s.type === 'Confused')) {
      if (Math.random() < 0.35) {
        const selfDmg = 10;
        activeUnit.stats.currentHp = Math.max(0, activeUnit.stats.currentHp - selfDmg);
        activeUnit.stats.currentAp = Math.max(0, activeUnit.stats.currentAp - 1);
        const screenPos = this.renderer.gridToScreen(activeUnit.coord);
        this.renderer.particleEngine.addFloatingText(
          `🌀 Stumbled in Confusion! -${selfDmg}`,
          screenPos.x,
          screenPos.y - 20,
          '#f59e0b',
          20
        );
        this.renderer.particleEngine.emit(screenPos.x, screenPos.y, '#f59e0b', 16, 2.5);
        this.renderer.particleEngine.triggerScreenShake(4, 200);
        this.combatEngine.addLog(
          'system',
          `🌀 ${activeUnit.name} is confused and stumbled, taking ${selfDmg} damage!`
        );
        if (activeUnit.stats.currentHp <= 0) {
          activeUnit.isDead = true;
          this.checkAndTriggerDeaths(activeUnit.stats.elementalAffinity);
        }
        this.updateReachableTiles();
        this.updateHUD();
        this.checkCombatState();
        return;
      }
    }

    const path = this.grid.findPath(activeUnit.coord, targetCoord);
    if (!path || path.length === 0) return;

    this.isBusy = true;
    this.reachableTiles = [];
    this.selectedAbility = null;
    this.targetableTiles = [];

    await new Promise<void>((resolve) => {
      this.renderer.animManager.animateMovement(activeUnit.id, path, 160, () => {
        this.combatEngine.moveUnit(activeUnit, targetCoord);
        if (this.isSandboxMode && this.sandboxInfiniteAp) {
          activeUnit.stats.currentAp = activeUnit.stats.maxAp;
        }
        if (this.isCoopMode && this.networkManager.isHost()) {
          this.networkManager.send({
            type: 'EVENT_MOVE',
            unitId: activeUnit.id,
            path,
            destination: targetCoord,
          });
        }
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
      ...(this.combatEngine.coopHero ? [this.combatEngine.coopHero] : []),
      ...this.combatEngine.zombies,
      ...this.combatEngine.lifeBeings,
      ...this.combatEngine.enemies,
    ];

    for (const unit of allUnits) {
      if (unit.isDead && !this.deadUnitIds.has(unit.id)) {
        this.deadUnitIds.add(unit.id);
        this.renderer.triggerDeathAnimation(unit, killerElement || unit.stats.elementalAffinity);
        if (unit.isZombie) {
          this.soundEngine.playZombieDeathScream();
        } else if (unit.faction === 'Player') {
          this.soundEngine.playHeroDeathScream();
          this.soundEngine.playHumanScream(1.0, true);
        } else {
          this.soundEngine.playEnemyDeathScream();
        }
      }
    }
  }

  private playAbilitySounds(ability: Ability): void {
    if (ability.id === 'screamer_wail') {
      this.soundEngine.playScreamerWail();
      this.soundEngine.playZombieScream();
    } else if (ability.id === 'zombie_bite') {
      this.soundEngine.playZombieBite();
    } else if (ability.id === 'boomer_detonation') {
      this.soundEngine.playExplosion();
    } else if (ability.appliesStatus === 'Rooted') {
      this.soundEngine.playRoot();
    } else {
      this.soundEngine.playSpellCast(ability.element);
    }
  }

  private async handlePlayerCast(ability: Ability, targetCoord: GridCoord): Promise<void> {
    if (this.isCoopMode) {
      const phase = this.turnManager.getPhase();
      const isMyTurn = (this.coopLocalPlayer === 1 && phase === 'COOP_P1_TURN') ||
                       (this.coopLocalPlayer === 2 && phase === 'COOP_P2_TURN');
      if (!isMyTurn) return;

      if (this.coopLocalPlayer === 2 && !this.networkManager.isHost()) {
        const isTargetable = this.targetableTiles.some((c) => c.x === targetCoord.x && c.y === targetCoord.y);
        if (!isTargetable) return;

        this.isBusy = true;
        this.networkManager.send({
          type: 'INTENT_CAST',
          playerNum: 2,
          abilityId: ability.id,
          targetCoord,
        });
        this.selectedAbility = null;
        this.targetableTiles = [];
        this.updateHUD();
        setTimeout(() => {
          if (this.isBusy && this.isCoopMode && this.coopLocalPlayer === 2) {
            this.isBusy = false;
            this.updateReachableTiles();
            this.updateHUD();
          }
        }, 2000);
        return;
      }

      if (this.networkManager.isHost()) {
        await this.executeCoopCast(1, ability.id, targetCoord);
        return;
      }
    }

    const activeUnit = this.getActivePlayerUnit();
    const isTargetable = this.targetableTiles.some((c) => c.x === targetCoord.x && c.y === targetCoord.y);
    if (!isTargetable) return;

    // Check if player unit is Confused
    if (activeUnit.statusEffects.some((s) => s.type === 'Confused')) {
      if (Math.random() < 0.45) {
        const selfDmg = 15;
        activeUnit.stats.currentHp = Math.max(0, activeUnit.stats.currentHp - selfDmg);
        activeUnit.stats.currentAp = Math.max(0, activeUnit.stats.currentAp - 1);
        const screenPos = this.renderer.gridToScreen(activeUnit.coord);
        this.renderer.particleEngine.addFloatingText(
          `🌀 Hurt in Confusion! -${selfDmg}`,
          screenPos.x,
          screenPos.y - 20,
          '#f59e0b',
          22
        );
        this.renderer.particleEngine.emit(screenPos.x, screenPos.y, '#f59e0b', 20, 3);
        this.renderer.particleEngine.triggerScreenShake(6, 250);
        this.soundEngine.playHit();
        this.combatEngine.addLog(
          'system',
          `🌀 ${activeUnit.name} is confused and hurt itself for ${selfDmg} damage!`
        );
        if (activeUnit.stats.currentHp <= 0) {
          activeUnit.isDead = true;
          this.checkAndTriggerDeaths(activeUnit.stats.elementalAffinity);
        }
        this.selectedAbility = null;
        this.targetableTiles = [];
        this.updateReachableTiles();
        this.updateHUD();
        this.checkCombatState();
        return;
      }
    }

    this.isBusy = true;
    this.selectedAbility = null;
    this.targetableTiles = [];
    this.reachableTiles = [];
    this.updateHUD();

    const startPos = this.renderer.gridToScreen(activeUnit.coord);
    const targetPos = this.renderer.gridToScreen(targetCoord);
    const elemData = CORE_ELEMENTS[ability.element];
    const color = elemData ? elemData.color : '#ffd000';

    this.playAbilitySounds(ability);

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
        if (this.isSandboxMode && this.sandboxInfiniteAp) {
          activeUnit.stats.currentAp = activeUnit.stats.maxAp;
        }

        if (this.isCoopMode && this.networkManager.isHost()) {
          this.networkManager.send({
            type: 'EVENT_CAST',
            casterId: activeUnit.id,
            abilityId: ability.id,
            targetCoord,
          });
        }

        const isAoE = ability.aoeRadius > 0;
        this.renderer.triggerSpellImpact(targetCoord, ability.element, isAoE);

        const newLogs = this.combatEngine.logs.slice(logCountBefore);
        const reactionLog = newLogs.find((l) => l.type === 'reaction');

        if (ability.baseDamage > 0) {
          this.soundEngine.playHit();
          this.renderer.particleEngine.addFloatingText(
            `-${ability.baseDamage}`,
            targetPos.x,
            targetPos.y - 15,
            color,
            22
          );
        }

        if (ability.appliesStatus === 'Rooted') {
          this.soundEngine.playRoot();
        }

        if (
          ability.id === 'admin_mass_resurrection' ||
          ability.name.toLowerCase() === 'mass resurrection'
        ) {
          this.soundEngine.playLevelUp();
          this.renderer.particleEngine.triggerScreenShake(12, 350);
          const casterPos = this.renderer.gridToScreen(activeUnit.coord);
          this.renderer.particleEngine.addFloatingText(
            '👑 MASS RESURRECTION: CLEARED WALLS & FLOOR!',
            casterPos.x,
            casterPos.y - 45,
            '#c084fc',
            24
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
    this.cancelAutoTurnCountdown();
    if (this.isBusy) return;

    // --- ONLINE CO-OP TURN MANAGEMENT ---
    if (this.isCoopMode) {
      if (this.coopLocalPlayer === 2) {
        this.networkManager.send({
          type: 'INTENT_END_TURN',
          playerNum: 2,
        });
        return;
      }

      // Host executes co-op turn transition
      const currentPhase = this.turnManager.getPhase();
      if (currentPhase === 'COOP_P1_TURN') {
        const p2 = this.combatEngine.coopHero;
        if (p2 && !p2.isDead) {
          this.turnManager.startCoopTurn(2, p2);
          if (this.networkManager.isHost()) {
            this.networkManager.send({
              type: 'EVENT_PHASE_CHANGE',
              phase: 'COOP_P2_TURN',
              activePlayer: 2,
            });
          }
          this.updateCoopTurnHUD();
          this.updateReachableTiles();
          this.updateHUD();
          return;
        }
      }

      await this.advanceCoopToEnemies();
      return;
    }

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
            const targetedUnit = this.combatEngine.getUnitAt(step.targetCoord);
            this.combatEngine.executeAbility(minion, step.ability, step.targetCoord);
            if (targetedUnit && (minion.isZombie || step.ability.id === 'zombie_bite')) {
              this.soundEngine.playZombieBite();
              this.soundEngine.playLoudHumanScream(true);
              const screenPos = this.renderer.gridToScreen(step.targetCoord);
              this.renderer.particleEngine.triggerScreenShake(12, 450);
              this.renderer.particleEngine.emit(screenPos.x, screenPos.y, '#dc2626', 25, 4);
              this.renderer.particleEngine.addFloatingText(
                '🩸 CHOMPED! 😱 AAAAAAAHHH!',
                screenPos.x,
                screenPos.y - 35,
                '#ef4444',
                26
              );
            }
          }
        }
      }

      const p1 = this.hero;
      const p2 = this.enemies[0];
      if (p1.isDead || p2.isDead) {
        if (!this.isHeroDeathAnimating) {
          this.isHeroDeathAnimating = true;
          this.isBusy = true;
          const loser = p1.isDead ? p1 : p2;
          const winnerName = p1.isDead ? 'PLAYER 2' : 'PLAYER 1';
          this.deadUnitIds.add(loser.id);
          this.renderer.triggerDeathAnimation(loser, loser.stats.elementalAffinity);
          setTimeout(() => {
            this.showHotseatVictoryModal(winnerName);
            this.isBusy = false;
            this.isHeroDeathAnimating = false;
          }, 2400);
        }
        return;
      }

      this.hazardManager.tickHazards();
      this.combatEngine.tickZombies();
      this.combatEngine.statusManager.tickStatusEffects(p1);
      this.combatEngine.statusManager.tickStatusEffects(p2);

      if (this.hotseatCurrentPlayer === 1) {
        this.hotseatCurrentPlayer = 2;
        this.closeAdminPanel();
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
      this.updateAdminUI();
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

          this.playAbilitySounds(step.ability);
          const projDuration = alliedMinions.length > 50 ? 50 : 200;
          await new Promise<void>((resolve) => {
            this.renderer.projManager.spawnProjectile(
              startPos,
              targetPos,
              step.ability.element,
              minion.isLifeBeing ? '#4ade80' : '#84cc16',
              projDuration,
              () => {
                this.combatEngine.executeAbility(minion, step.ability, step.targetCoord);
                this.renderer.triggerSpellImpact(step.targetCoord, step.ability.element, false);
                if (step.ability.baseDamage > 0) {
                  this.soundEngine.playHit();
                  this.renderer.particleEngine.addFloatingText(
                    `-${step.ability.baseDamage}`,
                    targetPos.x,
                    targetPos.y - 15,
                    minion.isLifeBeing ? '#4ade80' : '#84cc16',
                    22
                  );
                }
                if (step.ability.appliesStatus === 'Rooted') {
                  this.soundEngine.playRoot();
                }
                this.checkAndTriggerDeaths(minion.isLifeBeing ? 'Life' : 'Undead');
                resolve();
              }
            );
          });

          this.updateHUD();
          await delay(alliedMinions.length > 50 ? 30 : 250);
        }
      }
      this.focusedUnitId = null;
    }

    // 2. Sequential Enemy AI Turns
    this.turnManager.startEnemyTurn(this.enemies);

    const enemyCombatants = [
      ...this.enemies.filter((e) => !e.isDead),
      ...this.combatEngine.zombies.filter((z) => !z.isDead && z.faction === 'Enemy'),
    ];

    if (!(this.isSandboxMode && !this.sandboxAiEnabled)) {
      for (const enemy of enemyCombatants) {
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

          this.playAbilitySounds(step.ability);

          const isBeam = step.ability.name.toLowerCase().includes('beam') ||
            step.ability.name.toLowerCase().includes('ray') ||
            step.ability.name.toLowerCase().includes('lance');

          if (isBeam) {
            this.renderer.particleEngine.addBeam(startPos.x, startPos.y, targetPos.x, targetPos.y, color, 8, 300);
          }

          await new Promise<void>((resolve) => {
            this.renderer.projManager.spawnProjectile(startPos, targetPos, step.ability.element, color, 260, () => {
              const targetUnitBefore = this.combatEngine.getUnitAt(step.targetCoord);
              const isTargetPlayer = targetUnitBefore && targetUnitBefore.faction === 'Player';
              const isZombieEating = isTargetPlayer && (enemy.isZombie || step.ability.id === 'zombie_bite');

              const logCountBefore = this.combatEngine.logs.length;
              this.combatEngine.executeAbility(enemy, step.ability, step.targetCoord);

              const isAoE = step.ability.aoeRadius > 0;
              this.renderer.triggerSpellImpact(step.targetCoord, step.ability.element, isAoE);

              if (isZombieEating) {
                // THE ZOMBIES ARE EATING YOU!
                this.soundEngine.playZombieBite();
                this.soundEngine.playLoudHumanScream(true);
                this.renderer.particleEngine.triggerScreenShake(12, 450);
                this.renderer.particleEngine.emit(targetPos.x, targetPos.y, '#dc2626', 30, 4);
                this.renderer.particleEngine.addFloatingText(
                  '🩸 CHOMPED! 😱 AAAAAAAHHH!',
                  targetPos.x,
                  targetPos.y - 35,
                  '#ef4444',
                  26
                );
              } else if (step.ability.baseDamage > 0) {
                this.soundEngine.playHit();
                this.renderer.particleEngine.addFloatingText(
                  `-${step.ability.baseDamage}`,
                  targetPos.x,
                  targetPos.y - 15,
                  color,
                  22
                );
              }

              if (step.ability.appliesStatus === 'Rooted') {
                this.soundEngine.playRoot();
              }

              const newLogs = this.combatEngine.logs.slice(logCountBefore);
              const reactionLog = newLogs.find((l) => l.type === 'reaction');

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
    if (this.isSandboxMode) {
      if (this.sandboxGodMode) {
        this.hero.stats.currentHp = this.hero.stats.maxHp;
        this.hero.isDead = false;
      }
      if (this.sandboxInfiniteAp) {
        this.hero.stats.currentAp = this.hero.stats.maxAp;
      }
      this.turnManager.startPlayerTurn([this.hero]);
      this.isBusy = false;
      this.updateReachableTiles();
      this.updateHUD();
      return;
    }

    if (!this.hero.isDead && !this.combatEngine.areAllEnemiesDead()) {
      this.turnManager.startPlayerTurn([this.hero]);
      this.isBusy = false;
      this.updateReachableTiles();
      this.updateHUD();
    }

    this.checkCombatState();
  }

  private checkCombatState(): void {
    if (this.isHotseatMode || this.isSandboxMode) return;

    if (this.isCoopMode) {
      const p1 = this.hero;
      const p2 = this.combatEngine.coopHero;
      const bothDead = p1.isDead && (!p2 || p2.isDead);

      if (bothDead) {
        if (!this.isHeroDeathAnimating) {
          this.isHeroDeathAnimating = true;
          this.isBusy = true;
          this.combatEngine.addLog('system', '💀 Both allied champions have fallen in combat! Gauntlet Over.');
          setTimeout(() => {
            this.turnManager.setPhase('GAME_OVER');
            this.showDefeatModal();
            this.isHeroDeathAnimating = false;
            if (this.networkManager.isHost()) {
              this.networkManager.send({
                type: 'EVENT_GAME_OVER',
                reason: 'Both champions defeated',
              });
            }
          }, 2400);
        }
        return;
      }

      if (this.combatEngine.areAllEnemiesDead()) {
        if (!this.networkManager.isHost()) return;
        if (this.isRoundVictoryAnimating) return;
        this.isRoundVictoryAnimating = true;
        this.isBusy = true;
        setTimeout(() => {
          this.isRoundVictoryAnimating = false;
          this.isBusy = false;
          this.advanceToNextRound();
        }, 1800);
      }
      return;
    }

    if (this.hero.isDead) {
      if (!this.isHeroDeathAnimating) {
        this.isHeroDeathAnimating = true;
        this.isBusy = true;
        this.deadUnitIds.add(this.hero.id);
        this.combatEngine.addLog('system', `💀 ${this.hero.name} has fallen in combat! Game Over.`);
        this.renderer.triggerDeathAnimation(this.hero, this.hero.stats.elementalAffinity);
        setTimeout(() => {
          this.turnManager.setPhase('GAME_OVER');
          this.showDefeatModal();
          this.isHeroDeathAnimating = false;
        }, 2400);
      }
      return;
    }

    if (this.combatEngine.areAllEnemiesDead()) {
      if (this.isRoundVictoryAnimating) return;
      this.isRoundVictoryAnimating = true;
      this.isBusy = true;
      setTimeout(() => {
        this.isRoundVictoryAnimating = false;
        this.isBusy = false;
        if (this.currentRound >= this.maxRounds) {
          this.showVictoryModal();
        } else {
          this.openUpgradeModal();
        }
      }, 1800);
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
    this.cancelAutoTurnCountdown();
    this.turnManager.setPhase('UPGRADE_PHASE');
    const rewards = this.scorer.calculateRoundRewards(this.combatEngine.performance);
    this.totalEssence += rewards.essence;
    this.totalXp += rewards.xp;
    this.checkHeroLevelUp(true);

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

    if (this.currentRound === 30) {
      this.combatEngine.addLog(
        'system',
        '🌟 ROUND 30 CRUCIBLE CONQUERED! The Celestial Fusion Altar awaits your elemental essences!'
      );
      this.soundEngine.playVictoryFanfare();
      setTimeout(() => {
        this.essenceFusionModal.open();
      }, 350);
    }

    if (this.currentRound === 1000) {
      this.totalEssence += 50000;
      this.totalXp += 50000;
      this.unlockManager.unlockAllElements(true);
      this.combatEngine.addLog(
        'system',
        '👑 LORE MISSION COMPLETE: THE VOID OVERLORD HAS BEEN VANQUISHED! All stolen godlike elemental magic has been reclaimed (+50,000 Essence)!'
      );
      this.soundEngine.playVictoryFanfare();
      this.renderer.particleEngine.triggerScreenShake(20, 600);
    }

    const progress = this.upgradeManager.getEssenceProgress(this.totalEssence);
    const resonanceMult = this.upgradeManager.calculateEssenceResonanceMultiplier(
      this.hero.level || progress.currentLevel,
      this.totalEssence
    );
    const bonusPct = Math.round((resonanceMult - 1) * 100);

    const modalLevel = document.getElementById('modal-hero-level');
    if (modalLevel) modalLevel.textContent = `${progress.currentLevel} (${progress.title})`;
    const modalPower = document.getElementById('modal-spell-power');
    if (modalPower) modalPower.textContent = `+${bonusPct}%`;

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
      // Attach hover tooltip for current ability details
      this.hud.getTooltipManager().attach(card, ability);
      this.upgradeChoicesContainer.appendChild(card);
    });

    this.upgradeModal.classList.remove('hidden');
  }

  private attachCombatEngineHooks(engine: CombatEngine): void {
    engine.onZombieSpawn = () => {
      this.soundEngine.playZombieSpawn();
      this.soundEngine.playZombieScream();
    };
    engine.onEssenceEarned = (amount: number, coord: GridCoord) => {
      this.addEssence(amount, coord);
    };
    engine.onElementalEssenceEarned = (element: ElementType, amount: number, coord: GridCoord) => {
      this.addElementalEssence(element, amount, coord);
    };
    engine.getEssenceResonanceMultiplier = (caster: Unit) => {
      const level = caster.level ?? this.upgradeManager.getLevelFromEssence(this.totalEssence);
      return this.upgradeManager.calculateEssenceResonanceMultiplier(level, this.totalEssence);
    };
  }

  public addElementalEssence(element: ElementType, amount: number = 1, coord?: GridCoord): void {
    const total = this.essenceMergeManager.addEssence(element, amount);
    if (coord && this.renderer) {
      const pos = this.renderer.gridToScreen(coord);
      this.renderer.particleEngine.addFloatingText(`+${amount}x ${element} Essence (${total}/2)!`, pos.x, pos.y - 45, '#facc15', 24);
    }
    if (total >= 2) {
      this.combatEngine?.addLog('system', `✨ Ready to Merge: You have ${total}x ${element} Essences! Visit the Round 30 Fusion Area to awaken this element!`);
    }
    if (this.essenceFusionModal.isOpen()) {
      this.essenceFusionModal.render();
    }
  }

  public addEssence(amount: number, coord?: GridCoord): void {
    if (amount <= 0) return;
    this.totalEssence += amount;
    if (coord && this.renderer) {
      const pos = this.renderer.gridToScreen(coord);
      this.renderer.particleEngine.addFloatingText(`+${amount} 🔮 Essence!`, pos.x, pos.y - 25, '#c084fc', 22);
    }
    this.checkHeroLevelUp(true);
    this.updateHUD();
  }

  public checkHeroLevelUp(showEffects: boolean = true): LevelUpResult {
    if (!this.hero) {
      return {
        leveledUp: false,
        oldLevel: 0,
        newLevel: 0,
        hpGain: 0,
        apGain: 0,
        title: 'Initiate',
      };
    }

    const result = this.upgradeManager.checkAndApplyLevelUp(this.hero, this.totalEssence);

    if (result.leveledUp) {
      this.soundEngine.playLevelUp();

      if (showEffects && this.renderer) {
        this.renderer.particleEngine.triggerScreenShake(8, 300);
        const heroPos = this.renderer.gridToScreen(this.hero.coord);
        this.renderer.particleEngine.addFloatingText(
          `🌟 LEVEL UP! Lv. ${result.newLevel} ${result.title}!`,
          heroPos.x,
          heroPos.y - 45,
          '#fbbf24',
          30
        );
        this.renderer.particleEngine.addFloatingText(
          `+${result.hpGain} HP • +${result.newLevel * 15}% Spell Power!`,
          heroPos.x,
          heroPos.y - 18,
          '#38bdf8',
          22
        );
      }

      const powerBonus = result.newLevel * 15;
      this.combatEngine.addLog(
        'system',
        `🌟 LEVEL UP! You reached Level ${result.newLevel} (${result.title})! Max HP +${result.hpGain}, Spell Power +${powerBonus}%!`
      );

      this.updateHUD();
    }

    return result;
  }

  public goToVoidOverlord(bypassAuth: boolean = false): { success: boolean; message: string } {
    return this.goToLastLevel(1000, bypassAuth);
  }

  public goToRound30(bypassAuth: boolean = false): { success: boolean; message: string } {
    const res = this.goToLastLevel(30, bypassAuth);
    if (res.success) {
      setTimeout(() => {
        this.essenceFusionModal.open();
      }, 400);
    }
    return res;
  }

  public goToLastLevel(round: number = 15, bypassAuth: boolean = false): { success: boolean; message: string } {
    if (!bypassAuth && !this.adminManager.canUseAdminCommands(this.isHotseatMode, this.hotseatCurrentPlayer)) {
      this.openAdminPanel();
      return { success: false, message: '🔒 Admin access required. Please enter admin passcode first.' };
    }
    this.closeAdminPanel();
    this.cancelAutoTurnCountdown();

    if (this.isSandboxMode) {
      this.exitSandboxMode();
    }
    this.hideHomeScreen();

    const targetRound = Math.max(1, round);
    this.currentRound = targetRound - 1;
    this.advanceToNextRound();

    if (this.hero.isDead || this.hero.stats.currentHp <= 0) {
      this.hero.isDead = false;
      this.hero.stats.currentHp = this.hero.stats.maxHp;
    }
    this.hero.stats.currentAp = Math.max(this.hero.stats.currentAp, this.hero.stats.maxAp);

    const isOverlord = targetRound === 1000;
    const isCrucible = targetRound === 30;
    const pos = this.renderer.gridToScreen(this.hero.coord);
    this.renderer.particleEngine.triggerScreenShake(isOverlord ? 22 : isCrucible ? 14 : 10, isOverlord ? 650 : isCrucible ? 450 : 350);
    this.renderer.particleEngine.addFloatingText(
      isOverlord
        ? `👑 ROUND 1,000: THE VOID OVERLORD!`
        : isCrucible
        ? `🌟 ROUND 30: THE CELESTIAL FUSION CRUCIBLE!`
        : `👑 LAST LEVEL: ROUND ${this.currentRound}!`,
      pos.x,
      pos.y - 35,
      isOverlord ? '#c084fc' : isCrucible ? '#facc15' : '#f59e0b',
      isOverlord ? 30 : isCrucible ? 26 : 28
    );
    this.soundEngine.playWarp();
    if (isCrucible) {
      this.soundEngine.playCutsceneWizardBlessing();
    } else {
      this.soundEngine.playExplosion();
    }
    this.combatEngine.addLog(
      'system',
      isOverlord
        ? `👑 ADMIN COMMAND: Warped to Round 1,000! Facing THE VOID OVERLORD (Ultimate Boss - Reclaim Stolen Magic)!`
        : isCrucible
        ? `🌟 ADMIN COMMAND: Warped to Round 30! Entered THE CELESTIAL FUSION CRUCIBLE (Merge 2 Matching Essences)!`
        : `👑 ADMIN COMMAND: Warped to Last Level (Round ${this.currentRound})! Facing THE VOID ARCHON (Supreme Boss)!`
    );
    this.updateHUD();
    this.updateReachableTiles();

    return {
      success: true,
      message: isOverlord
        ? `Warped to Round 1,000: Confronting THE VOID OVERLORD (Ultimate Boss)!`
        : `Warped to Last Level: Round ${this.currentRound} (The Void Archon Supreme Boss)!`,
    };
  }

  public executeAdminCommand(input: string): { success: boolean; message: string } {
    const raw = input.trim();
    if (!raw) return { success: false, message: 'Command is empty.' };
    const cmd = raw.toLowerCase();

    // Check admin permissions
    if (!this.adminManager.canUseAdminCommands(this.isHotseatMode, this.hotseatCurrentPlayer)) {
      this.openAdminPanel();
      return { success: false, message: '🔒 Admin Console locked. Please authenticate first.' };
    }

    // 0a. Make Me Admin / Grant Admin
    if (
      cmd === 'make me admin' ||
      cmd === 'admin' ||
      cmd === 'grant admin' ||
      cmd === 'unlock all' ||
      cmd === 'unlock all powers'
    ) {
      this.adminManager.grantAdmin();
      this.unlockManager.unlockAllElements(true);
      this.grantAllAdminPowers();
      this.updateAdminUI();
      return { success: true, message: '👑 You are now an Admin! All elements & admin powers unlocked!' };
    }

    // 0b. Create New Admin Power: "create admin power <name> [damage] [range] [aoe]"
    const createPowerMatch = raw.match(
      /^(?:create\s+admin\s+power|new\s+admin\s+power|create\s+power|add\s+admin\s+power|add\s+power)\s+([a-zA-Z0-9\s]+?)(?:\s+(\d+))?(?:\s+(\d+))?(?:\s+(\d+))?$/i
    );
    if (createPowerMatch) {
      const name = createPowerMatch[1].trim();
      const dmg = createPowerMatch[2] ? parseInt(createPowerMatch[2], 10) : 500;
      const range = createPowerMatch[3] ? parseInt(createPowerMatch[3], 10) : 6;
      const aoe = createPowerMatch[4] ? parseInt(createPowerMatch[4], 10) : 1;
      const power = createAdminPower(name, dmg, range, aoe);
      return {
        success: true,
        message: `👑 Created and acquired new Admin Power "${power.name}" (${power.baseDamage} DMG)!`,
      };
    }

    // 0c. Grant All Admin Powers to Active Hero
    if (
      cmd === 'grant all admin powers' ||
      cmd === 'grant all powers' ||
      cmd === 'get all admin powers' ||
      cmd === 'all powers' ||
      cmd === 'admin powers'
    ) {
      return this.grantAllAdminPowers();
    }

    // 0d. Convert Overpowered Powers to Admin: "convert op", "op to admin", "audit op"
    if (
      cmd === 'convert op' ||
      cmd === 'promote op' ||
      cmd === 'audit op' ||
      cmd === 'op to admin' ||
      cmd === 'make op admin' ||
      cmd === 'make admin op' ||
      cmd === 'overpowered'
    ) {
      return this.convertOverpoweredToAdmin();
    }

    // 0e. Make specific ability an Admin Power: "make admin <name>"
    const makeAdminMatch = raw.match(/^(?:make\s+admin|promote\s+to\s+admin|admin\s+power)\s+([a-zA-Z0-9\s]+)$/i);
    if (makeAdminMatch) {
      const targetName = makeAdminMatch[1].trim().toLowerCase();
      let foundAbility: Ability | undefined = this.hero?.abilities.find(
        (a) => a.name.toLowerCase() === targetName || a.id.toLowerCase() === targetName
      );
      if (!foundAbility) {
        for (const c of Object.values(HERO_CLASSES)) {
          const match = c.abilities.find(
            (a) => a.name.toLowerCase() === targetName || a.id.toLowerCase() === targetName
          );
          if (match) {
            foundAbility = match;
            break;
          }
        }
      }
      if (foundAbility) {
        const promoted = registerAdminAbility({
          ...foundAbility,
          id: foundAbility.id.startsWith('admin_') ? foundAbility.id : `admin_${foundAbility.id}`,
          name: foundAbility.name.startsWith('👑') ? foundAbility.name : `👑 ${foundAbility.name}`,
          element: 'Admin',
          baseDamage: Math.max(foundAbility.baseDamage, 250),
          apCost: Math.min(foundAbility.apCost, 1),
          cooldown: 0,
        });
        this.grantAllAdminPowers();
        return {
          success: true,
          message: `👑 Successfully converted "${foundAbility.name}" into official Admin Power "${promoted.name}"!`,
        };
      } else {
        return {
          success: false,
          message: `Could not find ability matching "${makeAdminMatch[1]}".`,
        };
      }
    }

    // 1. Last Level / Go to Last level
    if (
      cmd === 'go to last level' ||
      cmd === 'goto last level' ||
      cmd === 'last level' ||
      cmd === 'last round' ||
      cmd === 'final level' ||
      cmd === 'final boss' ||
      cmd === 'last' ||
      cmd === 'level 15' ||
      cmd === 'round 15' ||
      cmd === 'boss 15'
    ) {
      return this.goToLastLevel(15);
    }

    // 1b. Void Overlord / Round 1000 Command
    if (
      cmd === 'round 1000' ||
      cmd === 'go to round 1000' ||
      cmd === 'goto round 1000' ||
      cmd === 'level 1000' ||
      cmd === 'go to level 1000' ||
      cmd === 'void overlord' ||
      cmd === 'go to void overlord' ||
      cmd === 'goto void overlord' ||
      cmd === 'get to void overlord' ||
      cmd === 'get to round 1000' ||
      cmd === 'fight void overlord' ||
      cmd === 'boss 1000' ||
      cmd === 'round 1000 void overlord' ||
      cmd === 'overlord' ||
      cmd === 'ultimate boss' ||
      cmd === 'void boss' ||
      cmd === 'reclaim power' ||
      cmd === 'reclaim powers'
    ) {
      return this.goToVoidOverlord();
    }

    // 1c. Round 30 / Celestial Essence Fusion Crucible Command
    if (
      cmd === 'round 30' ||
      cmd === 'go to round 30' ||
      cmd === 'goto round 30' ||
      cmd === 'level 30' ||
      cmd === 'go to level 30' ||
      cmd === 'fusion' ||
      cmd === 'fusion area' ||
      cmd === 'crucible' ||
      cmd === 'merge' ||
      cmd === 'merge essence' ||
      cmd === 'merge essences'
    ) {
      this.goToRound30(true);
      return { success: true, message: '🌟 Warped to Round 30: Celestial Essence Fusion Crucible!' };
    }

    // 1d. Grant Essence Pairs for Merging
    if (
      cmd === 'give pairs' ||
      cmd === 'give essence' ||
      cmd === 'give essences' ||
      cmd === 'essence pairs' ||
      cmd === 'grant essence' ||
      cmd === 'grant essences' ||
      cmd === 'grant pairs'
    ) {
      const elementsToGrant: ElementType[] = ['Fire', 'Water', 'Lightning', 'Void', 'Ice', 'Nature', 'Chaos', 'Life', 'Light', 'Darkness'];
      elementsToGrant.forEach((e) => this.essenceMergeManager.addEssence(e, 2));
      this.combatEngine?.addLog('system', '👑 ADMIN COMMAND: Granted 2x of Fire, Water, Lightning, Void, Ice, Nature, Chaos, Life, Light & Darkness Essences for merging!');
      this.soundEngine.playUnlock();
      this.essenceFusionModal.open();
      return { success: true, message: '✨ Granted 2x essence pairs for all major disciplines!' };
    }

    // 2. Specific round jump: "round 15", "level 10", "goto 12", "go to round 5"
    const roundMatch = cmd.match(/^(?:(?:go\s*to|goto)\s+)?(?:round|level)\s+(\d+)$/i);
    if (roundMatch) {
      const r = parseInt(roundMatch[1], 10);
      if (isNaN(r) || r < 1) {
        return { success: false, message: `Invalid round number: ${roundMatch[1]}` };
      }
      return this.goToLastLevel(r);
    }

    // 3. Smite / Kill all
    if (cmd === 'smite' || cmd === 'kill all' || cmd === 'kill enemies' || cmd === 'nuke') {
      this.enemies.forEach((e) => {
        e.stats.currentHp = 0;
        e.isDead = true;
      });
      this.combatEngine.addLog('system', '👑 ADMIN COMMAND: Smote all enemies on the battlefield!');
      this.checkCombatState();
      return { success: true, message: 'All enemies eliminated!' };
    }

    // 4. Heal / God HP
    if (cmd === 'heal' || cmd === 'full heal' || cmd === 'god hp' || cmd === 'hp') {
      this.hero.stats.maxHp = 9999;
      this.hero.stats.currentHp = 9999;
      this.hero.isDead = false;
      this.combatEngine.addLog('system', '👑 ADMIN COMMAND: Granted 9999 God HP!');
      this.updateHUD();
      return { success: true, message: 'HP set to 9,999 God Health!' };
    }

    // 5. AP / God AP
    if (cmd === 'ap' || cmd === 'refill ap' || cmd === 'max ap' || cmd === '99 ap') {
      this.hero.stats.maxAp = 99;
      this.hero.stats.currentAp = 99;
      this.combatEngine.addLog('system', '👑 ADMIN COMMAND: Granted 99 Action Points!');
      this.updateReachableTiles();
      this.updateHUD();
      return { success: true, message: 'AP refilled to 99!' };
    }

    // 6. Cleanse
    if (cmd === 'cleanse' || cmd === 'clear hazards' || cmd === 'clean') {
      for (let x = 0; x < this.grid.size; x++) {
        for (let y = 0; y < this.grid.size; y++) {
          const tile = this.grid.getTile({ x, y });
          if (tile) {
            tile.hazard = { type: 'None', duration: 0, damagePerTurn: 0, element: 'Neutral' };
          }
        }
      }
      this.combatEngine.addLog('system', '👑 ADMIN COMMAND: Cleansed all environmental hazards!');
      return { success: true, message: 'All hazards cleansed!' };
    }

    // 6b. Mass Resurrection (Clears all walls & resurrects undead legion)
    if (
      cmd === 'mass resurrection' ||
      cmd === 'resurrection' ||
      cmd === 'mass resurrect' ||
      cmd === 'resurrect' ||
      cmd === 'revive' ||
      cmd === 'revive all' ||
      cmd === 'clear walls'
    ) {
      return this.invokeAdminMassResurrection();
    }

    // 7. Sandbox
    if (cmd === 'sandbox' || cmd === 'enter sandbox') {
      this.closeAdminPanel();
      this.startSandboxMode();
      return { success: true, message: 'Entered Sandbox Mode with all elements unlocked!' };
    }

    // 8. Essence & Level Up Commands
    if (cmd === 'level up' || cmd === 'lvl up') {
      const currentLvl = this.hero.level || this.upgradeManager.getLevelFromEssence(this.totalEssence);
      const nextReq = this.upgradeManager.getEssenceRequiredForLevel(currentLvl + 1);
      const diff = Math.max(50, nextReq - this.totalEssence);
      this.addEssence(diff);
      return {
        success: true,
        message: `⭐ Leveled up to Level ${this.hero.level} (${this.upgradeManager.getLevelTitle(this.hero.level || 0)})!`,
      };
    }

    const addEssenceMatch = cmd.match(/^(?:add\s+essence|essence|add\s+esense)\s+(\d+)$/i);
    if (addEssenceMatch) {
      const amt = parseInt(addEssenceMatch[1], 10);
      if (!isNaN(amt) && amt > 0) {
        this.addEssence(amt);
        return { success: true, message: `🔮 Added +${amt} Essence! Total: ${this.totalEssence}` };
      }
    }

    const setLevelMatch = cmd.match(/^(?:set\s+level|set\s+lvl)\s+(\d+)$/i);
    if (setLevelMatch) {
      const targetLvl = parseInt(setLevelMatch[1], 10);
      if (!isNaN(targetLvl) && targetLvl >= 0) {
        const needed = this.upgradeManager.getEssenceRequiredForLevel(targetLvl);
        this.totalEssence = needed;
        this.checkHeroLevelUp(true);
        this.updateHUD();
        return { success: true, message: `⭐ Set Hero Level to ${targetLvl}!` };
      }
    }

    // 9. Help
    if (cmd === 'help' || cmd === '?') {
      return {
        success: true,
        message:
          'Commands: "go to last level", "round <N>", "smite", "heal", "ap", "cleanse", "level up", "add essence <N>", "sandbox"',
      };
    }

    return {
      success: false,
      message: `Unknown command "${raw}". Try "go to last level", "level up", "add essence 100", "smite", "heal", or "ap".`,
    };
  }

  private advanceToNextRound(): void {
    this.cancelAutoTurnCountdown();
    this.upgradeModal.classList.add('hidden');
    this.currentRound += 1;

    // Reset round state
    this.combatEngine.resetRoundState();
    this.hero.coord = { x: 1, y: 1 };
    if (this.isCoopMode && this.combatEngine.coopHero) {
      this.combatEngine.coopHero.coord = { x: 1, y: 3 };
    }

    // Generate new enemies for this round
    this.enemies = this.escalationManager.generateRoundEnemies(this.currentRound);
    this.combatEngine.enemies = this.enemies;

    // Update round indicator
    const roundBadge = document.getElementById('round-indicator');
    if (roundBadge) {
      const isBoss = this.currentRound % 5 === 0;
      roundBadge.textContent = isBoss ? `👑 BOSS ROUND ${this.currentRound.toLocaleString()} / ${this.maxRoundsStr}` : `ROUND ${this.currentRound.toLocaleString()} / ${this.maxRoundsStr}`;
      roundBadge.style.color = isBoss ? '#fbbf24' : '#38bdf8';
    }

    if (this.isCoopMode) {
      this.turnManager.startCoopTurn(1, this.hero);
      if (this.networkManager.isHost()) {
        this.networkManager.send({
          type: 'EVENT_ROUND_VICTORY',
          nextRound: this.currentRound,
        });
      }
      this.updateCoopTurnHUD();
    } else {
      this.turnManager.startPlayerTurn([this.hero]);
    }
    this.isBusy = false;
    this.updateReachableTiles();
    this.updateHUD();
    this.autoSaveGame();

    if (this.currentRound === 30) {
      this.soundEngine.playLevelUp();
      this.combatEngine.addLog(
        'system',
        '🌌 [ROUND 30] You have entered the CELESTIAL FUSION CRUCIBLE SANCTUARY! Dual essences can be merged here to unlock or empower elements!'
      );
      setTimeout(() => {
        if (this.currentRound === 30 && this.essenceFusionModal) {
          this.essenceFusionModal.open();
        }
      }, 700);
    }
  }

  private showVictoryModal(): void {
    this.cancelAutoTurnCountdown();
    this.saveManager.clearSave();
    this.updateHomeResumeTile();
    this.soundEngine.playVictoryFanfare();
    this.turnManager.setPhase('VICTORY');
    this.outcomeTitle.textContent = 'GAUNTLET CONQUERED!';
    this.outcomeSubtitle.textContent = `You have mastered all ${this.maxRoundsStr} rounds of the Elemental Mayhem!`;
    this.renderOutcomeStats();
    this.gameOverModal.classList.remove('hidden');
  }

  private showDefeatModal(): void {
    this.cancelAutoTurnCountdown();
    this.saveManager.clearSave();
    this.updateHomeResumeTile();
    this.turnManager.setPhase('GAME_OVER');
    this.outcomeTitle.textContent = 'DEFEATED IN BATTLE';
    this.outcomeSubtitle.textContent = `You fell on Round ${this.currentRound.toLocaleString()}. Re-arm and try again!`;
    this.renderOutcomeStats();
    this.gameOverModal.classList.remove('hidden');
  }

  private renderOutcomeStats(): void {
    const isVictory = this.turnManager.getPhase() === 'VICTORY';
    const completed = isVictory ? this.currentRound : Math.max(0, this.currentRound - 1);
    this.outcomeStatsList.innerHTML = `
      <div class="stat-row">
        <span>Rounds Completed:</span>
        <strong style="${isVictory ? 'color: #4ade80;' : ''}">${completed.toLocaleString()} / ${this.maxRoundsStr}</strong>
      </div>
      <div class="stat-row">
        <span>Total Essence:</span>
        <strong>${this.totalEssence.toLocaleString()}</strong>
      </div>
      <div class="stat-row">
        <span>Total XP:</span>
        <strong>${this.totalXp.toLocaleString()}</strong>
      </div>
    `;
  }

  public updateHomeResumeTile(): void {
    const summary = this.saveManager.getSaveSummary();

    if (!summary) {
      if (this.homeBtnResume) this.homeBtnResume.classList.add('hidden');
      if (this.homeBtnResumeCta) this.homeBtnResumeCta.classList.add('hidden');
      return;
    }

    if (this.homeBtnResume) {
      this.homeBtnResume.classList.remove('hidden');
      const iconEl = document.getElementById('home-resume-icon');
      const descEl = document.getElementById('home-resume-desc');
      const detailsEl = document.getElementById('home-resume-details');
      const badgeEl = document.getElementById('home-resume-badge');

      if (iconEl) iconEl.textContent = summary.heroAvatar || '⚔️';
      if (badgeEl) badgeEl.textContent = `Round ${summary.round.toLocaleString()}`;
      if (descEl) {
        descEl.textContent = `${summary.heroName} (${summary.element}) • In-progress battle`;
      }
      if (detailsEl) {
        detailsEl.innerHTML = `
          <div>❤️ HP: <strong style="color: #4ade80;">${summary.heroCurrentHp} / ${summary.heroMaxHp}</strong></div>
          <div>⚡ AP: <strong style="color: #60a5fa;">${summary.heroCurrentAp} / ${summary.heroMaxAp}</strong></div>
          <div>👾 Foes: <strong style="color: #f87171;">${summary.enemiesAlive}</strong></div>
          <div>✨ Essence: <strong style="color: #fbbf24;">${summary.essence.toLocaleString()}</strong></div>
        `;
      }
    }

    if (this.homeBtnResumeCta) {
      this.homeBtnResumeCta.classList.remove('hidden');
      this.homeBtnResumeCta.innerHTML = `<span>▶️</span> RESUME RUN (Round ${summary.round.toLocaleString()})`;
    }
  }

  public promptResumeRun(): void {
    const summary = this.saveManager.getSaveSummary();
    if (!summary) return;

    this.resumeRunDetails.innerHTML = `
      <div style="display: flex; align-items: center; gap: 16px; margin-bottom: 14px;">
        <span style="font-size: 2.6rem; filter: drop-shadow(0 0 12px rgba(251, 191, 36, 0.6));">${summary.heroAvatar}</span>
        <div>
          <div style="font-weight: 800; font-size: 1.25rem; color: #f8fafc;">${summary.heroName}</div>
          <div style="font-size: 0.9rem; color: #38bdf8; font-weight: 600;">Affinity: ${summary.element}</div>
        </div>
        <div style="margin-left: auto; text-align: right;">
          <span style="background: rgba(245, 158, 11, 0.2); border: 1px solid #f59e0b; color: #fbbf24; font-weight: 800; padding: 5px 12px; border-radius: 8px; font-size: 0.95rem;">
            ROUND ${summary.round.toLocaleString()}
          </span>
        </div>
      </div>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-size: 0.95rem; color: #cbd5e1; background: rgba(0, 0, 0, 0.35); padding: 12px; border-radius: 8px; border: 1px solid rgba(255, 255, 255, 0.08);">
        <div>❤️ HP: <strong style="color: #4ade80;">${summary.heroCurrentHp} / ${summary.heroMaxHp}</strong></div>
        <div>⚡ AP: <strong style="color: #60a5fa;">${summary.heroCurrentAp} / ${summary.heroMaxAp} AP</strong></div>
        <div>👾 Living Enemies: <strong style="color: #f87171;">${summary.enemiesAlive}</strong></div>
        <div>🧟 Active Zombies: <strong style="color: #a3e635;">${summary.zombiesAlive}</strong></div>
        <div style="grid-column: span 2;">✨ Essence: <strong style="color: #fbbf24;">${summary.essence.toLocaleString()}</strong></div>
      </div>
      <div style="margin-top: 12px; font-size: 0.8rem; color: #94a3b8; text-align: right;">
        Session Saved: ${new Date(summary.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
      </div>
    `;

    this.resumeRunModal.classList.remove('hidden');
  }

  public resumeSavedGame(): boolean {
    const saveData = this.saveManager.loadGame();
    if (!saveData || !saveData.hero || saveData.hero.isDead) {
      this.saveManager.clearSave();
      this.updateHomeResumeTile();
      this.resumeRunModal.classList.add('hidden');
      return false;
    }

    this.hideHomeScreen();
    this.resumeRunModal.classList.add('hidden');
    this.characterSelectModal.classList.add('hidden');
    this.hotseatSelectModal.classList.add('hidden');
    this.codexModal.classList.add('hidden');
    this.guideModal.classList.add('hidden');
    this.gameOverModal.classList.add('hidden');
    this.upgradeModal.classList.add('hidden');

    this.currentRound = saveData.round;
    this.totalEssence = saveData.totalEssence || 0;
    this.totalXp = saveData.totalXp || 0;
    this.selectedElement = saveData.selectedElement || saveData.hero.stats.elementalAffinity || 'Fire';
    this.isHotseatMode = false;
    this.isHeroDeathAnimating = false;
    this.isRoundVictoryAnimating = false;
    this.deadUnitIds.clear();

    this.hero = saveData.hero;
    this.enemies = saveData.enemies;

    this.grid = new Grid(10);
    this.hazardManager = new TileHazardManager(this.grid);
    this.setupObstacles();

    // Restore saved hazards onto the grid
    if (saveData.hazards && saveData.hazards.length > 0) {
      for (const h of saveData.hazards) {
        const tile = this.grid.getTile(h.coord);
        if (tile) {
          tile.hazard = { ...h.hazard };
        }
      }
    }

    this.combatEngine = new CombatEngine(this.grid, this.hazardManager, this.hero, this.enemies);
    this.attachCombatEngineHooks(this.combatEngine);
    this.checkHeroLevelUp(false);

    // Restore zombies and beings of life
    if (saveData.zombies && saveData.zombies.length > 0) {
      this.combatEngine.zombies = saveData.zombies;
    }
    if (saveData.lifeBeings && saveData.lifeBeings.length > 0) {
      this.combatEngine.lifeBeings = saveData.lifeBeings;
    }

    // Restore elemental essences pouch if saved
    if (saveData.elementalEssences && this.essenceMergeManager) {
      this.essenceMergeManager.importState(saveData.elementalEssences);
    }

    // Restore logs
    if (saveData.logs && saveData.logs.length > 0) {
      this.combatEngine.logs = saveData.logs;
    }
    this.combatEngine.addLog('system', `🔄 Resumed battle on Round ${this.currentRound}!`);

    const canvas = document.getElementById('battlefield-canvas') as HTMLCanvasElement;
    this.renderer = new BattlefieldRenderer(canvas, this.combatEngine);
    this.enemyAI = new EnemyAI(this.combatEngine);

    const roundBadge = document.getElementById('round-indicator');
    if (roundBadge) {
      const isBoss = this.currentRound % 5 === 0;
      roundBadge.textContent = isBoss
        ? `👑 BOSS ROUND ${this.currentRound.toLocaleString()} / ${this.maxRoundsStr}`
        : `ROUND ${this.currentRound.toLocaleString()} / ${this.maxRoundsStr}`;
      roundBadge.style.color = isBoss ? '#fbbf24' : '#38bdf8';
    }

    this.turnManager.startPlayerTurn([this.hero, ...this.combatEngine.getAllAllies()]);
    this.hud.updatePhaseBanner('PLAYER PHASE');

    this.isBusy = false;
    this.updateReachableTiles();
    this.updateHUD();
    return true;
  }

  public autoSaveGame(): void {
    if (this.isHotseatMode || this.isSandboxMode) return;
    if (!this.hero || this.hero.isDead || this.hero.stats.currentHp <= 0) {
      this.saveManager.clearSave();
      return;
    }
    if (!this.combatEngine || !this.grid) return;

    // Collect all active hazards from grid
    const savedHazards: SavedHazardTile[] = [];
    for (let x = 0; x < this.grid.size; x++) {
      for (let y = 0; y < this.grid.size; y++) {
        const tile = this.grid.getTile({ x, y });
        if (tile && tile.hazard && tile.hazard.type !== 'None') {
          savedHazards.push({
            coord: { x, y },
            hazard: { ...tile.hazard },
          });
        }
      }
    }

    const saveData: GameSaveData = {
      round: this.currentRound,
      selectedElement: this.selectedElement,
      hero: JSON.parse(JSON.stringify(this.hero)),
      enemies: JSON.parse(JSON.stringify(this.enemies)),
      zombies: JSON.parse(JSON.stringify(this.combatEngine.zombies)),
      lifeBeings: JSON.parse(JSON.stringify(this.combatEngine.lifeBeings)),
      hazards: savedHazards,
      totalEssence: this.totalEssence,
      elementalEssences: this.essenceMergeManager ? this.essenceMergeManager.exportState() : {},
      totalXp: this.totalXp,
      turnPhase: this.turnManager.getPhase(),
      logs: this.combatEngine.logs.slice(-20),
      timestamp: Date.now(),
    };

    this.saveManager.saveGame(saveData);
  }

  private restartGame(element: ElementType): void {
    if (element === 'Admin' && !this.hasAdminAccess()) {
      this.openAdminPanel();
      const msgEl = document.getElementById('admin-auth-msg');
      if (msgEl) {
        msgEl.style.color = '#f87171';
        msgEl.textContent = '🔒 Master Passcode required to play as the Administrator.';
      }
      return;
    }

    this.cancelAutoTurnCountdown();
    this.hideHomeScreen();
    this.resumeRunModal.classList.add('hidden');
    this.characterSelectModal.classList.add('hidden');
    this.hotseatSelectModal.classList.add('hidden');
    this.codexModal.classList.add('hidden');
    this.guideModal.classList.add('hidden');
    this.gameOverModal.classList.add('hidden');
    this.upgradeModal.classList.add('hidden');
    this.currentRound = 1;
    this.totalEssence = 0;
    this.totalXp = 0;
    this.selectedElement = element;
    this.isHotseatMode = false;
    this.isSandboxMode = false;
    this.sandboxToolbar?.classList.add('hidden');
    this.isHeroDeathAnimating = false;
    this.isRoundVictoryAnimating = false;
    this.deadUnitIds.clear();

    this.hero = this.createHero(element);
    this.enemies = this.escalationManager.generateRoundEnemies(1);

    this.grid = new Grid(10);
    this.hazardManager = new TileHazardManager(this.grid);
    this.setupObstacles();

    this.combatEngine = new CombatEngine(this.grid, this.hazardManager, this.hero, this.enemies);
    this.attachCombatEngineHooks(this.combatEngine);
    this.checkHeroLevelUp(false);
    const canvas = document.getElementById('battlefield-canvas') as HTMLCanvasElement;
    this.renderer = new BattlefieldRenderer(canvas, this.combatEngine);
    this.enemyAI = new EnemyAI(this.combatEngine);

    const roundBadge = document.getElementById('round-indicator');
    if (roundBadge) {
      roundBadge.textContent = `ROUND 1 / ${this.maxRoundsStr}`;
      roundBadge.style.color = '#38bdf8';
    }

    this.turnManager.startPlayerTurn([this.hero]);
    this.syncAdminPowers();
    this.isBusy = false;
    this.updateReachableTiles();
    this.updateHUD();
    this.autoSaveGame();
  }

  public startSandboxMode(initialElement: ElementType = 'Fire'): void {
    this.cancelAutoTurnCountdown();
    this.hideHomeScreen();
    this.resumeRunModal.classList.add('hidden');
    this.characterSelectModal.classList.add('hidden');
    this.hotseatSelectModal.classList.add('hidden');
    this.codexModal.classList.add('hidden');
    this.guideModal.classList.add('hidden');
    this.gameOverModal.classList.add('hidden');
    this.upgradeModal.classList.add('hidden');

    this.isSandboxMode = true;
    this.isHotseatMode = false;
    this.isCoopMode = false;
    this.isHeroDeathAnimating = false;
    this.isRoundVictoryAnimating = false;
    this.deadUnitIds.clear();
    this.selectedElement = initialElement;

    // Build the omni-elemental Sandbox hero with all 501 abilities and 99 AP
    this.hero = createSandboxHero(initialElement);
    if (this.sandboxGodMode) {
      this.hero.stats.maxHp = 9999;
      this.hero.stats.currentHp = 9999;
    }
    if (this.sandboxInfiniteAp) {
      this.hero.stats.maxAp = 99;
      this.hero.stats.currentAp = 99;
    }

    this.grid = new Grid(10);
    this.hazardManager = new TileHazardManager(this.grid);
    this.grid.setObstacle({ x: 0, y: 5 }, true);
    this.grid.setObstacle({ x: 9, y: 5 }, true);

    // Initial practice dummies: 1 Water Dummy & 1 Ice Dummy
    this.enemies = [
      {
        id: 'sandbox_dummy_1',
        name: 'Water Dummy',
        faction: 'Enemy',
        avatar: '💧',
        coord: { x: 7, y: 3 },
        stats: {
          maxHp: 300,
          currentHp: 300,
          maxAp: 4,
          currentAp: 4,
          moveCostPerTile: 1,
          elementalAffinity: 'Water',
        },
        abilities: HERO_CLASSES.Water?.abilities ? [HERO_CLASSES.Water.abilities[0]] : [],
        statusEffects: [],
        isDead: false,
      },
      {
        id: 'sandbox_dummy_2',
        name: 'Ice Dummy',
        faction: 'Enemy',
        avatar: '❄️',
        coord: { x: 7, y: 6 },
        stats: {
          maxHp: 300,
          currentHp: 300,
          maxAp: 4,
          currentAp: 4,
          moveCostPerTile: 1,
          elementalAffinity: 'Ice',
        },
        abilities: HERO_CLASSES.Ice?.abilities ? [HERO_CLASSES.Ice.abilities[0]] : [],
        statusEffects: [],
        isDead: false,
      },
    ];

    this.combatEngine = new CombatEngine(this.grid, this.hazardManager, this.hero, this.enemies);
    this.attachCombatEngineHooks(this.combatEngine);
    this.checkHeroLevelUp(false);

    const canvas = document.getElementById('battlefield-canvas') as HTMLCanvasElement;
    this.renderer = new BattlefieldRenderer(canvas, this.combatEngine);
    this.enemyAI = new EnemyAI(this.combatEngine);

    const roundBadge = document.getElementById('round-indicator');
    if (roundBadge) {
      roundBadge.textContent = '🧪 SANDBOX ARENA • ALL 50 ELEMENTS';
      roundBadge.style.color = '#34d399';
    }

    const phaseText = document.getElementById('phase-text');
    if (phaseText) {
      phaseText.textContent = 'PLAYER TURN (SANDBOX)';
    }

    this.sandboxToolbar?.classList.remove('hidden');

    if (this.sandboxHeroAffinitySelect) {
      this.sandboxHeroAffinitySelect.value = initialElement;
    }

    // Set initial active element chip
    document.querySelectorAll('#sandbox-chips-row .element-chip').forEach((chip) => {
      chip.classList.toggle('active', chip.getAttribute('data-element') === initialElement);
    });

    this.turnManager.startPlayerTurn([this.hero]);
    this.isBusy = false;
    this.updateReachableTiles();
    this.updateHUD();

    // Default filter to selected element
    this.hud.setElementFilter(initialElement);

    // Initialize placement palette and board placement bar
    this.sandboxPlacementPanel?.classList.add('collapsed');
    this.sandboxBoardPlacementBar?.classList.remove('hidden');
    this.renderPlacementGrid();

    // Default to Water Dummy for instant board placement
    const defaultEnemy = this.placementManager.getItemById('dummy_water');
    if (defaultEnemy) {
      this.selectPlacementBrush(defaultEnemy);
    }

    this.combatEngine.addLog(
      'system',
      '🧪 Welcome to the Elemental Sandbox! Click anywhere on the board to place enemies, or right-click any tile for instant spawn.'
    );
  }

  public exitSandboxMode(): void {
    this.deselectPlacementBrush();
    this.hideSandboxContextMenu();
    this.sandboxBoardPlacementBar?.classList.add('hidden');
    this.isSandboxMode = false;
    this.sandboxToolbar?.classList.add('hidden');
    this.showHomeScreen();
  }

  public switchSandboxHeroAffinity(element: ElementType | 'All'): void {
    if (element === 'All') {
      this.hud.setElementFilter('All');
      this.combatEngine.addLog('system', '🌟 Spellbook filtered to display all 500+ powers!');
      return;
    }

    this.hero.stats.elementalAffinity = element;
    const config = HERO_CLASSES[element];
    if (config) {
      this.hero.avatar = config.avatar;
      this.hero.name = `Sandbox ${config.className}`;
    }
    this.selectedElement = element;
    if (this.sandboxHeroAffinitySelect) {
      this.sandboxHeroAffinitySelect.value = element;
    }
    this.hud.setElementFilter(element);
    this.updateHUD();
    this.combatEngine.addLog('system', `🧪 Switched Elemental Affinity to ${element}! Spellbook filtered.`);
  }

  public spawnSandboxDummy(element: ElementType, hp: number = 300, coord?: GridCoord): Unit {
    const elemData = CORE_ELEMENTS[element] || CORE_ELEMENTS.Neutral;
    const config = HERO_CLASSES[element] || HERO_CLASSES.Neutral;
    const dummyCoord = coord || this.findFreeCoordAround({ x: 6, y: 5 });

    const dummy: Unit = {
      id: `dummy_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      name: `${element} Dummy`,
      faction: 'Enemy',
      avatar: elemData.icon || '🎯',
      coord: dummyCoord,
      stats: {
        maxHp: hp,
        currentHp: hp,
        maxAp: 4,
        currentAp: 4,
        moveCostPerTile: 1,
        elementalAffinity: element,
      },
      abilities: config?.abilities ? [config.abilities[0]] : [],
      statusEffects: [],
      isDead: false,
    };

    this.combatEngine.enemies.push(dummy);
    this.updateReachableTiles();

    const screenPos = this.renderer.gridToScreen(dummyCoord);
    this.renderer.particleEngine.addFloatingText(`🎯 +${element} Dummy`, screenPos.x, screenPos.y - 20, elemData.color, 22);
    this.soundEngine.playHit();
    this.combatEngine.addLog('system', `🎯 Spawned ${element} Dummy (${hp} HP) at (${dummyCoord.x}, ${dummyCoord.y}).`);
    return dummy;
  }

  public spawnSandboxBoss(): Unit {
    const bossCoord = this.findFreeCoordAround({ x: 7, y: 4 });
    const titanConfig = HERO_CLASSES.Titan || HERO_CLASSES.Fire;
    const boss: Unit = {
      id: `sandbox_boss_${Date.now()}`,
      name: 'Titan Golem Boss',
      faction: 'Enemy',
      avatar: '🗿',
      coord: bossCoord,
      isBoss: true,
      stats: {
        maxHp: 2500,
        currentHp: 2500,
        maxAp: 6,
        currentAp: 6,
        moveCostPerTile: 1,
        elementalAffinity: 'Titan',
      },
      abilities: titanConfig.abilities ? titanConfig.abilities.slice(0, 3) : [],
      statusEffects: [],
      isDead: false,
    };

    this.combatEngine.enemies.push(boss);
    this.updateReachableTiles();

    const screenPos = this.renderer.gridToScreen(bossCoord);
    this.renderer.particleEngine.addFloatingText('👑 TITAN BOSS SPAWNED!', screenPos.x, screenPos.y - 30, '#eab308', 26);
    this.soundEngine.playHit();
    this.combatEngine.addLog('system', `👑 Spawned colossal Titan Golem Boss (2,500 HP) at (${bossCoord.x}, ${bossCoord.y})!`);
    return boss;
  }

  public spawnSandboxVoidArchon(): Unit {
    const bossCoord = this.findFreeCoordAround({ x: 8, y: 5 });
    const boss: Unit = {
      id: `sandbox_void_archon_${Date.now()}`,
      name: 'THE VOID ARCHON (Supreme Boss)',
      faction: 'Enemy',
      avatar: '👑',
      coord: bossCoord,
      isBoss: true,
      stats: {
        maxHp: 480,
        currentHp: 480,
        maxAp: 7,
        currentAp: 7,
        moveCostPerTile: 1,
        elementalAffinity: 'Void',
      },
      abilities: [
        {
          id: 'cosmic_singularity',
          name: 'Cosmic Singularity',
          element: 'Void',
          icon: '🌌',
          apCost: 3,
          cooldown: 0,
          currentCooldown: 0,
          range: 5,
          aoeRadius: 1,
          targeting: 'SingleUnit',
          baseDamage: 48,
          appliesStatus: 'VoidMarked',
          statusDuration: 3,
          createsHazard: 'VoidRift',
          hazardDuration: 3,
          description: 'Tears a massive singularity in reality causing entropic annihilation.',
          level: 5,
        },
        {
          id: 'event_horizon_pulse',
          name: 'Event Horizon Pulse',
          element: 'Void',
          icon: '🌀',
          apCost: 2,
          cooldown: 0,
          currentCooldown: 0,
          range: 4,
          aoeRadius: 1,
          targeting: 'SingleUnit',
          baseDamage: 38,
          appliesStatus: 'Stunned',
          statusDuration: 1,
          description: 'Gravitational wave that pulls reality inward and stuns.',
          level: 5,
        },
      ],
      statusEffects: [],
      isDead: false,
    };

    this.combatEngine.enemies.push(boss);
    this.updateReachableTiles();

    const screenPos = this.renderer.gridToScreen(bossCoord);
    this.renderer.particleEngine.addFloatingText('👑 THE VOID ARCHON SPAWNED!', screenPos.x, screenPos.y - 30, '#ec4899', 26);
    this.soundEngine.playHit();
    this.combatEngine.addLog('system', `👑 Spawned Last Level Final Boss: THE VOID ARCHON at (${bossCoord.x}, ${bossCoord.y})!`);
    return boss;
  }

  private findFreeCoordAround(center: GridCoord): GridCoord {
    for (let radius = 1; radius < this.grid.size; radius++) {
      for (let dx = -radius; dx <= radius; dx++) {
        for (let dy = -radius; dy <= radius; dy++) {
          const x = center.x + dx;
          const y = center.y + dy;
          if (x >= 0 && x < this.grid.size && y >= 0 && y < this.grid.size) {
            const c = { x, y };
            if (!this.grid.getTile(c)?.isObstacle && this.combatEngine.getUnitAt(c) === null) {
              return c;
            }
          }
        }
      }
    }
    return { x: 5, y: 5 };
  }

  private initSandboxUI(): void {
    if (!this.sandboxToolbar) return;

    // Populate Hero Affinity Select with all 50 elements
    if (this.sandboxHeroAffinitySelect) {
      this.sandboxHeroAffinitySelect.innerHTML = '';
      const allElements = Object.keys(HERO_CLASSES) as ElementType[];
      allElements.forEach((elem) => {
        const config = HERO_CLASSES[elem];
        const opt = document.createElement('option');
        opt.value = elem;
        opt.textContent = `${config.avatar || '✨'} ${elem} (${config.className || elem})`;
        this.sandboxHeroAffinitySelect!.appendChild(opt);
      });

      this.sandboxHeroAffinitySelect.addEventListener('change', (e) => {
        const selElem = (e.target as HTMLSelectElement).value as ElementType;
        this.switchSandboxHeroAffinity(selElem);
        // Update chip active state
        document.querySelectorAll('#sandbox-chips-row .element-chip').forEach((chip) => {
          chip.classList.toggle('active', chip.getAttribute('data-element') === selElem);
        });
      });
    }

    // Populate Dummy Element Select
    if (this.sandboxDummyElementSelect) {
      this.sandboxDummyElementSelect.innerHTML = '';
      const dummyElements: ElementType[] = ['Neutral', ...(Object.keys(HERO_CLASSES) as ElementType[])];
      dummyElements.forEach((elem) => {
        const elemData = CORE_ELEMENTS[elem];
        const opt = document.createElement('option');
        opt.value = elem;
        opt.textContent = `${elemData ? elemData.icon : '🎯'} ${elem}`;
        this.sandboxDummyElementSelect!.appendChild(opt);
      });
      this.sandboxDummyElementSelect.value = 'Water';
    }

    // Quick Element Chips Row
    const chips = document.querySelectorAll('#sandbox-chips-row .element-chip');
    chips.forEach((chip) => {
      chip.addEventListener('click', () => {
        chips.forEach((c) => c.classList.remove('active'));
        chip.classList.add('active');
        const elem = chip.getAttribute('data-element') as ElementType | 'All';
        if (elem) {
          this.switchSandboxHeroAffinity(elem);
        }
      });
    });

    // Spawn Dummy Button
    document.getElementById('sandbox-spawn-dummy-btn')?.addEventListener('click', () => {
      this.soundEngine.playClick();
      const elem = (this.sandboxDummyElementSelect?.value as ElementType) || 'Neutral';
      const hp = parseInt(this.sandboxDummyHpSelect?.value || '300', 10);
      this.spawnSandboxDummy(elem, hp);
    });

    // Spawn Boss Button
    document.getElementById('sandbox-spawn-boss-btn')?.addEventListener('click', () => {
      this.soundEngine.playClick();
      this.spawnSandboxBoss();
    });

    // Spawn Void Archon (Last Level Final Boss) Button
    document.getElementById('sandbox-spawn-last-boss-btn')?.addEventListener('click', () => {
      this.soundEngine.playClick();
      this.spawnSandboxVoidArchon();
    });

    // Refill AP Button
    document.getElementById('sandbox-btn-refill-ap')?.addEventListener('click', () => {
      this.soundEngine.playClick();
      this.hero.stats.currentAp = this.hero.stats.maxAp;
      this.updateHUD();
      this.combatEngine.addLog('system', '⚡ Action Points refilled to 99 AP!');
    });

    // Infinite AP Toggle
    const infApBtn = document.getElementById('sandbox-toggle-inf-ap');
    infApBtn?.addEventListener('click', () => {
      this.soundEngine.playClick();
      this.sandboxInfiniteAp = !this.sandboxInfiniteAp;
      infApBtn.classList.toggle('active', this.sandboxInfiniteAp);
      infApBtn.textContent = this.sandboxInfiniteAp ? '♾️ Inf AP: ON' : '♾️ Inf AP: OFF';
      if (this.sandboxInfiniteAp) {
        this.hero.stats.currentAp = this.hero.stats.maxAp;
        this.updateHUD();
      }
      this.combatEngine.addLog('system', `♾️ Infinite AP: ${this.sandboxInfiniteAp ? 'ENABLED' : 'DISABLED'}`);
    });

    // God HP Toggle
    const godHpBtn = document.getElementById('sandbox-toggle-god-hp');
    godHpBtn?.addEventListener('click', () => {
      this.soundEngine.playClick();
      this.sandboxGodMode = !this.sandboxGodMode;
      godHpBtn.classList.toggle('active', this.sandboxGodMode);
      godHpBtn.textContent = this.sandboxGodMode ? '💖 God HP: ON' : '💖 God HP: OFF';
      if (this.sandboxGodMode) {
        this.hero.stats.maxHp = 9999;
        this.hero.stats.currentHp = 9999;
        this.hero.isDead = false;
        this.updateHUD();
      }
      this.combatEngine.addLog('system', `💖 God Mode HP: ${this.sandboxGodMode ? 'ENABLED (9999 HP)' : 'DISABLED'}`);
    });

    // Reset Cooldowns Button
    document.getElementById('sandbox-btn-reset-cd')?.addEventListener('click', () => {
      this.soundEngine.playClick();
      for (const ab of this.hero.abilities) {
        ab.currentCooldown = 0;
      }
      this.updateHUD();
      this.combatEngine.addLog('system', '🔄 All 500+ ability cooldowns reset to 0 turns!');
    });

    // Add Essence Button
    document.getElementById('sandbox-btn-add-essence')?.addEventListener('click', () => {
      this.soundEngine.playClick();
      this.addEssence(100);
      this.combatEngine.addLog('system', '🔮 Added +100 Essence in Sandbox Mode!');
    });

    // Level Up Button
    document.getElementById('sandbox-btn-level-up')?.addEventListener('click', () => {
      this.soundEngine.playClick();
      const currentLvl = this.hero.level || this.upgradeManager.getLevelFromEssence(this.totalEssence);
      const nextReq = this.upgradeManager.getEssenceRequiredForLevel(currentLvl + 1);
      const diff = Math.max(50, nextReq - this.totalEssence);
      this.addEssence(diff);
    });

    // Dummy AI Toggle
    const aiBtn = document.getElementById('sandbox-toggle-ai');
    aiBtn?.addEventListener('click', () => {
      this.soundEngine.playClick();
      this.sandboxAiEnabled = !this.sandboxAiEnabled;
      aiBtn.classList.toggle('active', this.sandboxAiEnabled);
      aiBtn.textContent = this.sandboxAiEnabled ? '🤖 AI: Active' : '🤖 AI: Passive';
      this.combatEngine.addLog('system', `🤖 Target Dummy AI: ${this.sandboxAiEnabled ? 'ACTIVE (Attacks & Moves)' : 'PASSIVE (Stationary Target)'}`);
    });

    // Clear Targets Button
    document.getElementById('sandbox-btn-clear-enemies')?.addEventListener('click', () => {
      this.soundEngine.playClick();
      this.clearAllEnemies();
    });

    // Clear Hazards Button
    document.getElementById('sandbox-btn-clear-hazards')?.addEventListener('click', () => {
      this.soundEngine.playClick();
      this.clearAllHazards();
    });

    // Toggle Placement Panel Button
    document.getElementById('sandbox-toggle-placement-btn')?.addEventListener('click', () => {
      this.soundEngine.playClick();
      if (this.sandboxPlacementPanel) {
        this.sandboxPlacementPanel.classList.toggle('collapsed');
      }
    });

    // Close Placement Panel Button
    document.getElementById('placement-close-btn')?.addEventListener('click', () => {
      this.soundEngine.playClick();
      this.sandboxPlacementPanel?.classList.add('collapsed');
    });

    // Category Tabs
    const tabs = document.querySelectorAll('#sandbox-placement-panel .placement-tab');
    tabs.forEach((tab) => {
      tab.addEventListener('click', () => {
        this.soundEngine.playClick();
        tabs.forEach((t) => t.classList.remove('active'));
        tab.classList.add('active');
        const cat = tab.getAttribute('data-category') as PlacementCategory;
        if (cat) {
          this.placementCategory = cat;
          const subfilters = document.getElementById('placement-enemy-subfilters');
          if (subfilters) {
            subfilters.style.display = cat === 'enemy' ? 'flex' : 'none';
          }
          this.renderPlacementGrid();
        }
      });
    });

    // Enemy Subcategory Filters
    const subChips = document.querySelectorAll('#placement-enemy-subfilters .subfilter-chip');
    subChips.forEach((chip) => {
      chip.addEventListener('click', () => {
        this.soundEngine.playClick();
        subChips.forEach((c) => c.classList.remove('active'));
        chip.classList.add('active');
        this.placementEnemySubfilter = chip.getAttribute('data-sub') || 'all';
        this.renderPlacementGrid();
      });
    });

    // Active Brush Cancel / Quick Actions
    document.getElementById('brush-cancel-btn')?.addEventListener('click', () => {
      this.soundEngine.playClick();
      this.deselectPlacementBrush();
    });

    document.getElementById('brush-quick-eraser')?.addEventListener('click', () => {
      this.soundEngine.playClick();
      const eraser = this.placementManager.getItemById('tool_eraser');
      if (eraser) this.selectPlacementBrush(eraser);
    });

    document.getElementById('brush-quick-wall')?.addEventListener('click', () => {
      this.soundEngine.playClick();
      const wall = this.placementManager.getItemById('wall_rock');
      if (wall) this.selectPlacementBrush(wall);
    });

    // Mass Clear Actions
    document.getElementById('placement-mass-clear-walls')?.addEventListener('click', () => {
      this.soundEngine.playClick();
      this.clearAllWalls();
    });

    document.getElementById('placement-mass-clear-hazards')?.addEventListener('click', () => {
      this.soundEngine.playClick();
      this.clearAllHazards();
    });

    document.getElementById('placement-mass-clear-enemies')?.addEventListener('click', () => {
      this.soundEngine.playClick();
      this.clearAllEnemies();
    });

    // Populate Quick Enemy Select on Board Toolbar
    if (this.sandboxQuickEnemySelect) {
      this.sandboxQuickEnemySelect.innerHTML = '';
      const enemies = this.placementManager.getItemsByCategory('enemy');
      enemies.forEach((enemy) => {
        const opt = document.createElement('option');
        opt.value = enemy.id;
        opt.textContent = `${enemy.icon} ${enemy.name} (${enemy.hp ? enemy.hp + ' HP' : enemy.element || ''})`;
        this.sandboxQuickEnemySelect!.appendChild(opt);
      });
      this.sandboxQuickEnemySelect.value = 'dummy_water';

      this.sandboxQuickEnemySelect.addEventListener('change', () => {
        const item = this.placementManager.getItemById(this.sandboxQuickEnemySelect!.value);
        if (item) {
          this.selectPlacementBrush(item);
        }
      });
    }

    // Board Place Enemy Toggle Button
    this.sandboxBoardPlaceEnemyBtn?.addEventListener('click', () => {
      this.soundEngine.playClick();
      const selectedId = this.sandboxQuickEnemySelect?.value || 'dummy_water';
      const item = this.placementManager.getItemById(selectedId);
      if (this.activePlacementItem && this.activePlacementItem.id === selectedId) {
        this.deselectPlacementBrush();
      } else if (item) {
        this.selectPlacementBrush(item);
      }
    });

    // Board Toolbar Quick Shortcuts
    document.getElementById('sandbox-board-quick-wall-btn')?.addEventListener('click', () => {
      this.soundEngine.playClick();
      const wall = this.placementManager.getItemById('wall_rock');
      if (wall) this.selectPlacementBrush(wall);
    });

    document.getElementById('sandbox-board-quick-lava-btn')?.addEventListener('click', () => {
      this.soundEngine.playClick();
      const lava = this.placementManager.getItemById('hazard_lava');
      if (lava) this.selectPlacementBrush(lava);
    });

    document.getElementById('sandbox-board-quick-eraser-btn')?.addEventListener('click', () => {
      this.soundEngine.playClick();
      const eraser = this.placementManager.getItemById('tool_eraser');
      if (eraser) this.selectPlacementBrush(eraser);
    });

    document.getElementById('sandbox-board-open-palette-btn')?.addEventListener('click', () => {
      this.soundEngine.playClick();
      this.sandboxPlacementPanel?.classList.toggle('collapsed');
    });

    // Initialize Canvas Context Menu Items
    this.initContextMenuItems();

    this.renderPlacementGrid();

    // Exit Button
    document.getElementById('sandbox-btn-exit')?.addEventListener('click', () => {
      this.soundEngine.playClick();
      this.exitSandboxMode();
    });
  }

  private initContextMenuItems(): void {
    const enemyContainer = document.getElementById('context-enemy-items');
    if (!enemyContainer) return;
    enemyContainer.innerHTML = '';

    const quickEnemyIds = [
      'dummy_water',
      'dummy_fire',
      'dummy_lightning',
      'enemy_toxic_mire_adept',
      'enemy_pyroclast_sorcerer',
      'enemy_frost_archer',
      'undead_wizard',
      'undead_death_knight',
      'boss_void_archon',
      'boss_titan_golem',
    ];

    quickEnemyIds.forEach((id) => {
      const item = this.placementManager.getItemById(id);
      if (!item) return;

      const btn = document.createElement('button');
      btn.className = 'context-item';
      btn.innerHTML = `<span>${item.icon}</span> <span>${item.name}</span>`;
      btn.addEventListener('click', () => {
        if (this.contextMenuCoord) {
          const res = this.placementManager.executePlacement(
            item,
            this.contextMenuCoord,
            this.grid,
            this.hazardManager,
            this.combatEngine
          );
          if (res.success) {
            const screenPos = this.renderer.gridToScreen(this.contextMenuCoord);
            this.soundEngine.playZombieSpawn();
            this.renderer.particleEngine.addFloatingText(
              `+${item.name}`,
              screenPos.x,
              screenPos.y - 20,
              item.color || '#34d399',
              20
            );
            this.renderer.particleEngine.emit(screenPos.x, screenPos.y, item.color || '#34d399', 12, 2.0, 'spark');
            this.combatEngine.addLog('system', `🔨 Spawned ${item.name} at (${this.contextMenuCoord.x}, ${this.contextMenuCoord.y})`);
            this.updateReachableTiles();
            this.updateHUD();
          }
        }
        this.hideSandboxContextMenu();
      });
      enemyContainer.appendChild(btn);
    });

    // More Enemies option
    const moreBtn = document.createElement('button');
    moreBtn.className = 'context-item';
    moreBtn.style.color = '#c084fc';
    moreBtn.innerHTML = `<span>📋</span> <span>All 35+ Enemies...</span>`;
    moreBtn.addEventListener('click', () => {
      this.hideSandboxContextMenu();
      this.placementCategory = 'enemy';
      this.sandboxPlacementPanel?.classList.remove('collapsed');
      this.renderPlacementGrid();
    });
    enemyContainer.appendChild(moreBtn);

    // Quick objects in context menu
    document.querySelectorAll('#context-quick-items .context-item').forEach((btn) => {
      btn.addEventListener('click', () => {
        const action = btn.getAttribute('data-action');
        if (!this.contextMenuCoord) return;

        let item: PlacementItem | undefined;
        if (action === 'wall-rock') item = this.placementManager.getItemById('wall_rock');
        else if (action === 'wall-crystal') item = this.placementManager.getItemById('wall_crystal');
        else if (action === 'hazard-lava') item = this.placementManager.getItemById('hazard_lava');
        else if (action === 'hazard-shock') item = this.placementManager.getItemById('hazard_electrified');
        else if (action === 'clear-tile') item = this.placementManager.getItemById('tool_eraser');

        if (item) {
          const res = this.placementManager.executePlacement(
            item,
            this.contextMenuCoord,
            this.grid,
            this.hazardManager,
            this.combatEngine
          );
          if (res.success) {
            const screenPos = this.renderer.gridToScreen(this.contextMenuCoord);
            this.soundEngine.playHit();
            this.renderer.particleEngine.addFloatingText(
              `+${item.name}`,
              screenPos.x,
              screenPos.y - 15,
              item.color || '#94a3b8',
              18
            );
            this.combatEngine.addLog('system', `🔨 ${res.message}`);
            this.updateReachableTiles();
            this.updateHUD();
          }
        }
        this.hideSandboxContextMenu();
      });
    });
  }

  public openSandboxContextMenu(clientX: number, clientY: number, coord: GridCoord): void {
    if (!this.sandboxContextMenu) return;
    this.contextMenuCoord = coord;

    const header = document.getElementById('context-menu-header');
    if (header) {
      header.textContent = `👾 Spawn at (${coord.x}, ${coord.y})`;
    }

    this.sandboxContextMenu.classList.remove('hidden');

    const rect = this.sandboxContextMenu.getBoundingClientRect();
    const maxX = window.innerWidth - (rect.width || 240) - 10;
    const maxY = window.innerHeight - (rect.height || 300) - 10;
    const posX = Math.min(clientX, maxX);
    const posY = Math.min(clientY, maxY);

    this.sandboxContextMenu.style.left = `${posX}px`;
    this.sandboxContextMenu.style.top = `${posY}px`;
  }

  public hideSandboxContextMenu(): void {
    if (this.sandboxContextMenu) {
      this.sandboxContextMenu.classList.add('hidden');
    }
  }

  public selectPlacementBrush(item: PlacementItem): void {
    this.activePlacementItem = item;
    if (this.sandboxActiveBrushBar) {
      this.sandboxActiveBrushBar.classList.remove('hidden');
    }
    if (this.activeBrushBadge) {
      this.activeBrushBadge.innerHTML = `${item.icon} ${item.name}`;
      this.activeBrushBadge.style.borderColor = item.color || '#c084fc';
    }
    if (this.sandboxBoardPlaceEnemyBtn) {
      this.sandboxBoardPlaceEnemyBtn.classList.add('active');
      this.sandboxBoardPlaceEnemyBtn.textContent = `🎯 Placing: ${item.name} (Click Board)`;
    }
    if (this.sandboxQuickEnemySelect && item.category === 'enemy') {
      this.sandboxQuickEnemySelect.value = item.id;
    }
    document.querySelectorAll('.placement-card').forEach((card) => {
      card.classList.toggle('active-brush', card.querySelector('.placement-card-title')?.textContent === item.name);
    });
    this.combatEngine.addLog('system', `🏗️ Selected brush: ${item.icon} ${item.name}. Click or drag on any tile to place!`);
  }

  public deselectPlacementBrush(): void {
    this.activePlacementItem = null;
    this.renderer.activePlacementPreview = null;
    if (this.sandboxActiveBrushBar) {
      this.sandboxActiveBrushBar.classList.add('hidden');
    }
    if (this.sandboxBoardPlaceEnemyBtn) {
      this.sandboxBoardPlaceEnemyBtn.classList.remove('active');
      this.sandboxBoardPlaceEnemyBtn.textContent = '🎯 Click Board to Place';
    }
    document.querySelectorAll('.placement-card').forEach((card) => {
      card.classList.remove('active-brush');
    });
    this.combatEngine.addLog('system', '❌ Placement mode exited. Restored normal targeting.');
  }

  public renderPlacementGrid(): void {
    if (!this.placementGrid) return;
    this.placementGrid.innerHTML = '';

    let items = this.placementManager.getItemsByCategory(this.placementCategory);

    if (this.placementCategory === 'enemy' && this.placementEnemySubfilter !== 'all') {
      items = items.filter((i) => i.subcategory === this.placementEnemySubfilter);
    }

    const countBadge = document.getElementById('count-enemies');
    if (countBadge) {
      countBadge.textContent = `${this.placementManager.getItemsByCategory('enemy').length}`;
    }

    items.forEach((item) => {
      const card = document.createElement('div');
      card.className = 'placement-card';
      if (this.activePlacementItem && this.activePlacementItem.id === item.id) {
        card.classList.add('active-brush');
      }

      const elemBadge = item.element
        ? `<span class="placement-card-badge" style="color: ${item.color || '#fff'}">${item.element}</span>`
        : '';
      const hpBadge = item.hp
        ? `<span class="placement-card-badge" style="color: #4ade80">${item.hp} HP</span>`
        : '';

      card.innerHTML = `
        <span class="placement-card-icon">${item.icon}</span>
        <div class="placement-card-body">
          <div class="placement-card-title">${item.name}</div>
          <div class="placement-card-meta">
            ${elemBadge}
            ${hpBadge}
          </div>
          <div class="placement-card-desc">${item.description}</div>
        </div>
      `;

      card.addEventListener('click', () => {
        this.soundEngine.playClick();
        if (this.activePlacementItem && this.activePlacementItem.id === item.id) {
          this.deselectPlacementBrush();
        } else {
          this.selectPlacementBrush(item);
        }
      });

      this.placementGrid!.appendChild(card);
    });
  }

  public handlePlacementAtCoord(coord: GridCoord): void {
    if (!this.activePlacementItem) return;

    const result = this.placementManager.executePlacement(
      this.activePlacementItem,
      coord,
      this.grid,
      this.hazardManager,
      this.combatEngine
    );

    const screenPos = this.renderer.gridToScreen(coord);

    if (result.success) {
      this.lastPlacedCoord = coord;
      const color = this.activePlacementItem.color || '#34d399';

      if (this.activePlacementItem.category === 'enemy') {
        this.soundEngine.playZombieSpawn();
        this.renderer.particleEngine.addFloatingText(
          `+${result.spawnedUnit?.name || this.activePlacementItem.name}`,
          screenPos.x,
          screenPos.y - 20,
          color,
          20
        );
        this.renderer.particleEngine.emit(screenPos.x, screenPos.y, color, 12, 2.0, 'spark');
      } else if (this.activePlacementItem.category === 'wall') {
        this.soundEngine.playHit();
        this.renderer.particleEngine.addFloatingText(
          `+${this.activePlacementItem.name}`,
          screenPos.x,
          screenPos.y - 15,
          '#94a3b8',
          18
        );
        this.renderer.particleEngine.emit(screenPos.x, screenPos.y, '#64748b', 8, 1.5, 'circle');
      } else if (this.activePlacementItem.category === 'hazard') {
        this.soundEngine.playHit();
        this.renderer.particleEngine.addFloatingText(
          `+${this.activePlacementItem.name}`,
          screenPos.x,
          screenPos.y - 15,
          color,
          18
        );
        this.renderer.particleEngine.emit(screenPos.x, screenPos.y, color, 10, 2.0, 'spark');
      } else if (this.activePlacementItem.category === 'eraser') {
        this.soundEngine.playClick();
        this.renderer.particleEngine.addFloatingText('🧹 Cleared', screenPos.x, screenPos.y - 15, '#f43f5e', 18);
      }

      this.combatEngine.addLog('system', `🔨 ${result.message}`);
      this.updateReachableTiles();
      this.updateHUD();
    } else {
      this.soundEngine.playHit();
      this.renderer.particleEngine.addFloatingText(`❌ ${result.message}`, screenPos.x, screenPos.y - 20, '#ef4444', 16);
    }
  }

  public invokeAdminMassResurrection(): { success: boolean; message: string } {
    const result = this.combatEngine.executeMassResurrection(this.hero, this.hero.coord);
    this.updateReachableTiles();
    this.updateHUD();
    this.soundEngine.playLevelUp();
    const screenPos = this.renderer.gridToScreen(this.hero.coord);
    this.renderer.particleEngine.addFloatingText(
      '👑 MASS RESURRECTION: CLEARED WALLS & FLOOR!',
      screenPos.x,
      screenPos.y - 40,
      '#c084fc',
      22
    );
    this.renderer.particleEngine.addFloatingText(
      `🧹 Cleared ${result.clearedWalls} Walls & ${result.clearedFloor} Floor Hazards!`,
      screenPos.x,
      screenPos.y - 15,
      '#6ee7b7',
      18
    );
    return {
      success: true,
      message: `Mass Resurrection invoked! Cleared ${result.clearedWalls} walls and ${result.clearedFloor} floor hazards!`,
    };
  }

  public clearAllWalls(): void {
    let count = 0;
    for (let x = 0; x < this.grid.size; x++) {
      for (let y = 0; y < this.grid.size; y++) {
        const t = this.grid.getTile({ x, y });
        if (t && t.isObstacle) {
          this.grid.setObstacle({ x, y }, false);
          count++;
        }
      }
    }
    this.updateReachableTiles();
    this.soundEngine.playHit();
    this.combatEngine.addLog('system', `🧹 Cleared ${count} walls from the battlefield.`);
  }

  public clearAllHazards(): void {
    for (let x = 0; x < this.grid.size; x++) {
      for (let y = 0; y < this.grid.size; y++) {
        const t = this.grid.getTile({ x, y });
        if (t) {
          t.hazard = { type: 'None', duration: 0, damagePerTurn: 0, element: 'Neutral' };
        }
      }
    }
    this.updateReachableTiles();
    this.soundEngine.playHit();
    this.combatEngine.addLog('system', '🌊 Cleared all ground hazards from the battlefield.');
  }

  public clearAllEnemies(): void {
    for (const e of this.combatEngine.enemies) {
      e.isDead = true;
    }
    this.combatEngine.enemies = [];
    this.combatEngine.zombies = [];
    this.combatEngine.lifeBeings = [];
    this.updateReachableTiles();
    this.soundEngine.playHit();
    this.combatEngine.addLog('system', '🧹 Cleared all enemy units from the battlefield.');
  }

  private updateReachableTiles(): void {
    if (this.isCoopMode) {
      const phase = this.turnManager.getPhase();
      const isMyTurn = (this.coopLocalPlayer === 1 && phase === 'COOP_P1_TURN') ||
                       (this.coopLocalPlayer === 2 && phase === 'COOP_P2_TURN');
      if (!isMyTurn) {
        this.reachableTiles = [];
        return;
      }
    }

    const activeUnit = this.getActivePlayerUnit();
    this.reachableTiles = [];
    if (this.combatEngine.statusManager.hasStatus(activeUnit, 'Rooted')) {
      return; // Bound to the spot! Cannot run away!
    }
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
    const localUnit = this.getLocalPlayerUnit();
    const progress = this.upgradeManager.getEssenceProgress(this.totalEssence);
    const resonanceMultiplier = this.upgradeManager.calculateEssenceResonanceMultiplier(
      localUnit.level || progress.currentLevel,
      this.totalEssence
    );

    this.hud.updateHeroLevel(
      progress.currentLevel,
      progress.title,
      this.totalEssence,
      progress.nextLevelThreshold,
      progress.percentage,
      resonanceMultiplier
    );

    this.hud.updateHeroStatus(localUnit);
    this.hud.renderAbilities(
      localUnit.abilities,
      this.selectedAbility?.id || null,
      localUnit.stats.currentAp,
      (ability) => this.selectAbility(ability)
    );

    if (this.isCoopMode) {
      this.updateCoopTurnHUD();
    }

    this.hud.updateCurrencies(
      this.totalEssence,
      this.totalXp,
      this.currentRound,
      this.maxRoundsStr
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

    this.checkAutoTurnEnd();
  }

  private checkAutoTurnEnd(): void {
    if (!this.combatEngine || !this.hero || this.hero.isDead) {
      this.cancelAutoTurnCountdown();
      return;
    }

    if (this.homeScreen && !this.homeScreen.classList.contains('hidden')) {
      this.cancelAutoTurnCountdown();
      return;
    }

    if (this.gameOverModal && !this.gameOverModal.classList.contains('hidden')) {
      this.cancelAutoTurnCountdown();
      return;
    }

    if (this.upgradeModal && !this.upgradeModal.classList.contains('hidden')) {
      this.cancelAutoTurnCountdown();
      return;
    }

    if (this.isRoundVictoryAnimating || this.isHeroDeathAnimating) {
      this.cancelAutoTurnCountdown();
      return;
    }

    let isPlayerTurn = false;
    if (this.isHotseatMode) {
      isPlayerTurn = true;
    } else if (this.isCoopMode) {
      const phase = this.turnManager.getPhase();
      isPlayerTurn =
        (this.coopLocalPlayer === 1 && phase === 'COOP_P1_TURN') ||
        (this.coopLocalPlayer === 2 && phase === 'COOP_P2_TURN');
    } else {
      isPlayerTurn = this.turnManager.getPhase() === 'PLAYER_TURN';
    }

    if (!isPlayerTurn) {
      this.cancelAutoTurnCountdown();
      return;
    }

    const activeUnit = this.getActivePlayerUnit();
    if (!activeUnit || activeUnit.isDead) {
      this.cancelAutoTurnCountdown();
      return;
    }

    if (activeUnit.stats.currentAp <= 0 && !this.isBusy) {
      if (!this.autoTurnTimer.isActive()) {
        this.combatEngine.addLog(
          'system',
          '⏳ Out of AP! Turn will automatically end in 10 seconds.'
        );
        this.autoTurnTimer.start(10);
      }
    } else {
      if (activeUnit.stats.currentAp > 0 && this.autoTurnTimer.isActive()) {
        this.cancelAutoTurnCountdown();
      }
    }
  }

  private cancelAutoTurnCountdown(): void {
    if (this.autoTurnTimer && this.autoTurnTimer.isActive()) {
      this.autoTurnTimer.stop();
    }
    this.hud?.updateEndTurnCountdown(null);
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
  const game = new GameApp();
  (window as any).game = game;
  (window as any).goToLastLevel = (round?: number) => game.goToLastLevel(round ?? 15, true);
  (window as any).executeAdminCommand = (cmd: string) => game.executeAdminCommand(cmd);
  (window as any).adminCommand = (cmd: string) => game.executeAdminCommand(cmd);
  (window as any).massResurrection = () => game.invokeAdminMassResurrection();
  (window as any).grantAllAdminPowers = () => game.grantAllAdminPowers();
  (window as any).convertOverpoweredToAdmin = () => game.convertOverpoweredToAdmin();
  (window as any).syncAdminPowers = () => game.syncAdminPowers();
  (window as any).isOverpoweredAbility = isOverpoweredAbility;
  (window as any).auditAndPromoteOverpoweredAbilities = auditAndPromoteOverpoweredAbilities;
  (window as any).registerAdminAbility = registerAdminAbility;
  (window as any).createAdminPower = (name: string, dmg?: number, range?: number, aoe?: number) => createAdminPower(name, dmg, range, aoe);
  (window as any).makeMeAdmin = () => {
    game.adminManager.grantAdmin();
    (game as any).unlockManager.unlockAllElements(true);
    game.grantAllAdminPowers();
    game.updateAdminUI();
    return '👑 Granted Admin! All powers & elements unlocked.';
  };
});
