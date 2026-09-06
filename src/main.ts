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
import { AdminManager } from './engine/AdminManager';
import { BattlefieldRenderer } from './renderer/BattlefieldRenderer';
import { HUDManager } from './ui/HUDManager';
import { SoundEngine } from './audio/SoundEngine';
import { SaveManager, GameSaveData, SavedHazardTile } from './engine/SaveManager';
import { ElementType, Unit, Ability, GridCoord, ZombieClass, TileHazardType } from './types';
import { CORE_ELEMENTS } from './constants/elements';
import { HERO_CLASSES, createHeroForElement } from './constants/classes';

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

  constructor() {
    const canvas = document.getElementById('battlefield-canvas') as HTMLCanvasElement;
    this.grid = new Grid(10);
    this.hazardManager = new TileHazardManager(this.grid);
    this.turnManager = new TurnManager();
    this.scorer = new PerformanceScorer();
    this.upgradeManager = new UpgradeManager();
    this.escalationManager = new EscalationManager();
    this.unlockManager = new UnlockManager();
    this.adminManager = new AdminManager();

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

    // Hotseat modal elements
    this.hotseatSelectModal = document.getElementById('hotseat-select-modal')!;
    this.hotseatModalTitle = document.getElementById('hotseat-modal-title')!;
    this.hotseatModalSubtitle = document.getElementById('hotseat-modal-subtitle')!;
    this.hotseatClassSelectContainer = document.getElementById('hotseat-class-select-container')!;
    this.pvpArenaBtn = document.getElementById('pvp-arena-btn');

    this.hero = this.createHero(this.selectedElement);
    this.enemies = this.escalationManager.generateRoundEnemies(1);

    this.combatEngine = new CombatEngine(this.grid, this.hazardManager, this.hero, this.enemies);
    this.soundEngine = new SoundEngine();
    this.combatEngine.onZombieSpawn = () => {
      this.soundEngine.playZombieSpawn();
      this.soundEngine.playZombieScream();
    };
    this.enemyAI = new EnemyAI(this.combatEngine);
    this.renderer = new BattlefieldRenderer(canvas, this.combatEngine);
    this.hud = new HUDManager();

    this.setupCategoryTabs();
    this.setupCodexTabs();
    this.setupObstacles();
    this.setupEventListeners(canvas);
    this.updateAdminUI();
    this.updateReachableTiles();
    this.updateHUD();

    // Start Game Loop
    this.lastFrameTime = performance.now();
    this.gameLoop();

    // Check for unfinished active run on startup
    if (this.saveManager.hasActiveSave()) {
      this.promptResumeRun();
    }
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
    this.autoSaveGame();
    this.homeScreen.classList.remove('hidden');
    this.homeScreen.style.display = 'flex';
    this.resumeRunModal.classList.add('hidden');
    this.characterSelectModal.classList.add('hidden');
    this.hotseatSelectModal.classList.add('hidden');
    this.codexModal.classList.add('hidden');
    this.guideModal.classList.add('hidden');
    this.gameOverModal.classList.add('hidden');
    this.upgradeModal.classList.add('hidden');
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
      const isAdmin = this.unlockManager.isAdminOnly(elem);
      const isUnlocked = this.unlockManager.isElementUnlocked(elem);
      const isPickable = isUnlocked || elem === 'Admin';
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
        ? `<span class="element-badge" style="background: rgba(236, 72, 153, 0.3); color: #f472b6; border: 1px solid #ec4899;">👑 All Powers</span>`
        : isAdmin
        ? `<span class="element-badge" style="background: rgba(239, 68, 68, 0.3); color: #fca5a5; border: 1px solid #ef4444;">👑 Admin Power</span>`
        : isUnlocked
        ? `<span class="element-badge" style="background:${elemData.glowColor}; color:${elemData.color}; width:fit-content;">${elem}</span>`
        : `<span class="lock-badge">🔒 Locked</span>`;

      const actionHtml = isPickable
        ? `<button class="class-select-btn" style="${elem === 'Admin' ? 'background: linear-gradient(135deg, #ec4899, #8b5cf6); border-color: #f472b6; box-shadow: 0 0 15px rgba(236, 72, 153, 0.4);' : isAdmin ? 'background: linear-gradient(135deg, #ef4444, #8b5cf6); border-color: #f87171;' : ''}">Choose ${config.className}</button>`
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
      const isPickable = isUnlocked || elem === 'Admin';
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
        ? `<span class="element-badge" style="background: rgba(236, 72, 153, 0.3); color: #f472b6; border: 1px solid #ec4899;">👑 All Powers</span>`
        : isAdmin
        ? `<span class="element-badge" style="background: rgba(239, 68, 68, 0.3); color: #fca5a5; border: 1px solid #ef4444;">👑 Admin Power</span>`
        : `<span class="element-badge" style="background:${elemData.glowColor}; color:${elemData.color}; width:fit-content;">${elem}</span>`;

      const actionHtml = `<button class="class-select-btn" style="${elem === 'Admin' ? 'background: linear-gradient(135deg, #ec4899, #8b5cf6); border-color: #f472b6;' : isAdmin ? 'background: linear-gradient(135deg, #ef4444, #8b5cf6); border-color: #f87171;' : ''}">Pick for Player ${playerNum}</button>`;

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
      if (this.saveManager.hasActiveSave()) {
        this.promptResumeRun();
        return;
      }
      this.hideHomeScreen();
      this.renderCharacterSelectModal();
      this.characterSelectModal.classList.remove('hidden');
    });

    this.homeBtnCampaign?.addEventListener('click', () => {
      this.soundEngine.playClick();
      if (this.saveManager.hasActiveSave()) {
        this.promptResumeRun();
        return;
      }
      this.hideHomeScreen();
      this.renderCharacterSelectModal();
      this.characterSelectModal.classList.remove('hidden');
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

    document.getElementById('char-select-unlock-all-btn')?.addEventListener('click', () => {
      this.soundEngine.playUnlock();
      this.unlockManager.unlockAllElements(true);
      this.renderCharacterSelectModal();
      this.combatEngine.addLog('system', '✨ All 50 Elemental Powers & Omnipotent Avatar have been unlocked for everyone!');
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

    // Resume Run Modal Actions
    this.resumeGameBtn?.addEventListener('click', () => {
      this.soundEngine.playClick();
      this.resumeSavedGame();
    });

    this.discardSaveBtn?.addEventListener('click', () => {
      this.soundEngine.playClick();
      this.saveManager.clearSave();
      this.resumeRunModal.classList.add('hidden');
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

      const activeUnit = this.getActivePlayerUnit();
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
      const isBoss = this.currentRound % 5 === 0;
      roundBadge.textContent = isBoss ? `👑 BOSS ROUND ${this.currentRound.toLocaleString()} / ${this.maxRoundsStr}` : `ROUND ${this.currentRound.toLocaleString()} / ${this.maxRoundsStr}`;
      roundBadge.style.color = isBoss ? '#fbbf24' : '#38bdf8';
    }

    this.turnManager.startPlayerTurn([this.hero]);
    this.isBusy = false;
    this.updateReachableTiles();
    this.updateHUD();
    this.autoSaveGame();
  }

  private showVictoryModal(): void {
    this.saveManager.clearSave();
    this.soundEngine.playVictoryFanfare();
    this.turnManager.setPhase('VICTORY');
    this.outcomeTitle.textContent = 'GAUNTLET CONQUERED!';
    this.outcomeSubtitle.textContent = `You have mastered all ${this.maxRoundsStr} rounds of the Elemental Mayhem!`;
    this.renderOutcomeStats();
    this.gameOverModal.classList.remove('hidden');
  }

  private showDefeatModal(): void {
    this.saveManager.clearSave();
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
    this.combatEngine.onZombieSpawn = () => {
      this.soundEngine.playZombieSpawn();
      this.soundEngine.playZombieScream();
    };

    // Restore zombies and beings of life
    if (saveData.zombies && saveData.zombies.length > 0) {
      this.combatEngine.zombies = saveData.zombies;
    }
    if (saveData.lifeBeings && saveData.lifeBeings.length > 0) {
      this.combatEngine.lifeBeings = saveData.lifeBeings;
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
    if (this.isHotseatMode) return;
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
      totalXp: this.totalXp,
      turnPhase: this.turnManager.getPhase(),
      logs: this.combatEngine.logs.slice(-20),
      timestamp: Date.now(),
    };

    this.saveManager.saveGame(saveData);
  }

  private restartGame(element: ElementType): void {
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
    this.isHeroDeathAnimating = false;
    this.isRoundVictoryAnimating = false;
    this.deadUnitIds.clear();

    this.hero = this.createHero(element);
    this.enemies = this.escalationManager.generateRoundEnemies(1);

    this.grid = new Grid(10);
    this.hazardManager = new TileHazardManager(this.grid);
    this.setupObstacles();

    this.combatEngine = new CombatEngine(this.grid, this.hazardManager, this.hero, this.enemies);
    this.combatEngine.onZombieSpawn = () => {
      this.soundEngine.playZombieSpawn();
      this.soundEngine.playZombieScream();
    };
    const canvas = document.getElementById('battlefield-canvas') as HTMLCanvasElement;
    this.renderer = new BattlefieldRenderer(canvas, this.combatEngine);
    this.enemyAI = new EnemyAI(this.combatEngine);

    const roundBadge = document.getElementById('round-indicator');
    if (roundBadge) {
      roundBadge.textContent = `ROUND 1 / ${this.maxRoundsStr}`;
      roundBadge.style.color = '#38bdf8';
    }

    this.turnManager.startPlayerTurn([this.hero]);
    this.isBusy = false;
    this.updateReachableTiles();
    this.updateHUD();
    this.autoSaveGame();
  }

  private updateReachableTiles(): void {
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
