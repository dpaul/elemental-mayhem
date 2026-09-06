// Elemental Mayhem - Sound Engine Unit Tests
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SoundEngine } from '../audio/SoundEngine';

describe('SoundEngine (Web Audio API & Procedural SFX)', () => {
  let soundEngine: SoundEngine;
  let mockAudioContext: any;
  let mockDestination: any;
  let mockGainNode: any;
  let mockOscillatorNode: any;
  let mockBufferSourceNode: any;
  let mockBiquadFilterNode: any;
  let mockWaveShaperNode: any;

  beforeEach(() => {
    mockDestination = {};
    mockGainNode = {
      gain: {
        setValueAtTime: vi.fn(),
        linearRampToValueAtTime: vi.fn(),
        exponentialRampToValueAtTime: vi.fn(),
      },
      connect: vi.fn(),
    };
    mockOscillatorNode = {
      type: 'sine',
      frequency: {
        setValueAtTime: vi.fn(),
        linearRampToValueAtTime: vi.fn(),
        exponentialRampToValueAtTime: vi.fn(),
      },
      connect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
    };
    mockBufferSourceNode = {
      buffer: null,
      connect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
    };
    mockBiquadFilterNode = {
      type: 'lowpass',
      frequency: {
        setValueAtTime: vi.fn(),
        linearRampToValueAtTime: vi.fn(),
        exponentialRampToValueAtTime: vi.fn(),
      },
      Q: { setValueAtTime: vi.fn() },
      connect: vi.fn(),
    };
    mockWaveShaperNode = {
      curve: null,
      connect: vi.fn(),
    };

    mockAudioContext = {
      state: 'running',
      currentTime: 0,
      sampleRate: 44100,
      destination: mockDestination,
      createGain: vi.fn(() => mockGainNode),
      createOscillator: vi.fn(() => mockOscillatorNode),
      createBufferSource: vi.fn(() => mockBufferSourceNode),
      createBiquadFilter: vi.fn(() => mockBiquadFilterNode),
      createWaveShaper: vi.fn(() => mockWaveShaperNode),
      createBuffer: vi.fn(() => ({
        getChannelData: vi.fn(() => new Float32Array(1024)),
      })),
      resume: vi.fn().mockResolvedValue(undefined),
    };

    // Provide AudioContext on globalThis
    (globalThis as any).AudioContext = vi.fn(() => mockAudioContext);

    soundEngine = new SoundEngine();
  });

  it('should initialize with default volume and not muted', () => {
    expect(soundEngine.isMuted).toBe(false);
    expect(soundEngine.masterVolume).toBe(0.45);
  });

  it('should toggle mute state correctly', () => {
    expect(soundEngine.toggleMute()).toBe(true);
    expect(soundEngine.isMuted).toBe(true);

    expect(soundEngine.toggleMute()).toBe(false);
    expect(soundEngine.isMuted).toBe(false);
  });

  it('should synthesize zombie scream and banshee wails', () => {
    soundEngine.playZombieScream();
    expect(mockAudioContext.createOscillator).toHaveBeenCalled();
    expect(mockAudioContext.createWaveShaper).toHaveBeenCalled();

    soundEngine.playScreamerWail();
    expect(mockAudioContext.createBiquadFilter).toHaveBeenCalled();

    soundEngine.playZombieBite();
    expect(mockAudioContext.createBufferSource).toHaveBeenCalled();

    soundEngine.playZombieSpawn();
    expect(mockAudioContext.createGain).toHaveBeenCalled();

    soundEngine.playZombieDeathScream();
    expect(mockOscillatorNode.start).toHaveBeenCalled();
  });

  it('should synthesize player and enemy death screams without errors', () => {
    soundEngine.playHeroDeathScream();
    expect(mockAudioContext.createOscillator).toHaveBeenCalled();

    soundEngine.playEnemyDeathScream();
    expect(mockAudioContext.createWaveShaper).toHaveBeenCalled();
  });

  it('should synthesize elemental combat sounds and explosions', () => {
    soundEngine.playExplosion();
    expect(mockAudioContext.createBufferSource).toHaveBeenCalled();

    soundEngine.playSpellCast('Fire');
    soundEngine.playSpellCast('Cold');
    soundEngine.playSpellCast('Lightning');
    soundEngine.playSpellCast('Sound');
    soundEngine.playSpellCast('Poison');

    soundEngine.playHit();
    soundEngine.playRoot();
    soundEngine.playVictoryFanfare();
    soundEngine.playWarp();
    soundEngine.playClick();
  });

  it('should safely suppress sound synthesis when muted', () => {
    soundEngine.isMuted = true;
    const initialOscCallCount = mockAudioContext.createOscillator.mock.calls.length;

    soundEngine.playZombieScream();
    soundEngine.playHeroDeathScream();
    expect(mockAudioContext.createOscillator.mock.calls.length).toBe(initialOscCallCount);
  });

  it('should play loaded realistic sample buffers with pitch variation when available', () => {
    const mockBuffer: any = { duration: 1.0 };
    soundEngine.setSampleBuffer('zombie_scream_1', mockBuffer);
    soundEngine.setSampleBuffer('zombie_scream_2', mockBuffer);
    soundEngine.setSampleBuffer('zombie_scream_3', mockBuffer);
    soundEngine.setSampleBuffer('zombie_scream_4', mockBuffer);
    soundEngine.setSampleBuffer('hit_1', mockBuffer);
    soundEngine.setSampleBuffer('hit_2', mockBuffer);
    soundEngine.setSampleBuffer('hit_3', mockBuffer);
    soundEngine.setSampleBuffer('spell_fire', mockBuffer);
    soundEngine.setSampleBuffer('spell_earth', mockBuffer);
    soundEngine.setSampleBuffer('spell_light', mockBuffer);

    expect(soundEngine.hasSample('zombie_scream_1')).toBe(true);

    mockBufferSourceNode.start.mockClear();
    soundEngine.playZombieScream();
    expect(mockAudioContext.createBufferSource).toHaveBeenCalled();
    expect(mockBufferSourceNode.start).toHaveBeenCalled();

    mockBufferSourceNode.start.mockClear();
    soundEngine.playHit();
    expect(mockBufferSourceNode.start).toHaveBeenCalled();

    mockBufferSourceNode.start.mockClear();
    soundEngine.playSpellCast('Fire');
    expect(mockBufferSourceNode.start).toHaveBeenCalled();

    mockBufferSourceNode.start.mockClear();
    soundEngine.playSpellCast('Blast');
    expect(mockBufferSourceNode.start).toHaveBeenCalled();

    mockBufferSourceNode.start.mockClear();
    soundEngine.playSpellCast('Earth');
    expect(mockBufferSourceNode.start).toHaveBeenCalled();

    mockBufferSourceNode.start.mockClear();
    soundEngine.playSpellCast('Light');
    expect(mockBufferSourceNode.start).toHaveBeenCalled();
  });
});

