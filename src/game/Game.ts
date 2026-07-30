import { GameConfig } from '@/game/constants';
import { SaveManager } from '@/systems/SaveManager';
import { AudioEngine } from '@/systems/AudioEngine';
import { InputManager, InputState } from '@/systems/InputManager';
import { SeededRNG } from '@/utils/Math';
import { SaveData } from '@/systems/SaveManager';

export class Game {
  scene: Phaser.Scene | null = null;
  config: GameConfig;
  state: GameState;
  rng: SeededRNG;
  audio: AudioEngine;
  save: SaveManager;
  input: InputManager | null = null;

  constructor() {
    this.config = {
      canvasWidth: 720,
      canvasHeight: 1280,
      worldScale: 1,
      physicsFps: 60,
      fixedTimestep: 1/60,
      maxSubSteps: 3,
      trackWidth: 120,
      trackSegmentLength: { min: 100, max: 600 },
      playerStartBoost: 50,
      playerInvincibleTime: 1000,
      aiReactionTime: 0.15,
      aiMaxSpeedMult: 0.95,
      baseCreditReward: 100,
      creditMultPerChapter: 1.3,
      saveVersion: 1,
      saveKey: 'neon_drift_save_v1',
      masterVolume: 0.7,
      sfxVolume: 0.8,
      musicVolume: 0.5,
      hapticsEnabled: true,
    };
    
    this.state = {
      currentScene: 'boot',
      chapter: 1,
      missionIndex: 0,
      missionSeed: 0,
      isPaused: false,
      gameOver: false,
      victory: false,
    };
    
    this.rng = new SeededRNG(Date.now());
    this.audio = new AudioEngine();
    this.save = SaveManager.getInstance();
  }

  init(scene: Phaser.Scene): void {
    this.scene = scene;
    this.input = new InputManager(scene.sys.canvas);
    this.loadSettings();
    this.audio.setMasterVolume(this.save.load().settings.masterVol);
    this.audio.setMusicVolume(this.save.load().settings.musicVol);
    this.audio.setSfxVolume(this.save.load().settings.sfxVol);
  }

  newRun(chapter = 1): void {
    this.state.chapter = chapter;
    this.state.missionIndex = 0;
    this.state.missionSeed = this.rng.nextInt(0x7fffffff);
    this.state.gameOver = false;
    this.state.victory = false;
    this.state.isPaused = false;
    this.save.load().runSeed = this.state.missionSeed;
    this.save.load().runProgress = { chapter: this.state.chapter, missionIndex: 0, carState: null };
    this.save.save(this.save.load());
  }

  loadRun(): boolean {
    const save = this.save.load();
    if (save.runSeed && save.runProgress) {
      this.state.chapter = save.runProgress.chapter;
      this.state.missionIndex = save.runProgress.missionIndex;
      this.state.missionSeed = save.runSeed;
      this.state.gameOver = false;
      this.state.victory = false;
      this.state.isPaused = false;
      return true;
    }
    return false;
  }

  endRun(victory: boolean): void {
    this.state.gameOver = true;
    this.state.victory = victory;
    const save = this.save.load();
    save.stats.totalRuns++;
    if (victory) save.stats.wins++;
    save.stats.bestScore = Math.max(save.stats.bestScore, this.state.missionIndex);
    save.runSeed = undefined;
    save.runProgress = undefined;
    this.save.save(save);
  }

  pause(): void {
    this.state.isPaused = true;
    this.audio.stopMusic();
  }

  resume(): void {
    this.state.isPaused = false;
  }

  getSave(): SaveData {
    return this.save.load();
  }

  updateSettings(settings: Partial<SaveData['settings']>): void {
    const save = this.save.load();
    save.settings = { ...save.settings, ...settings };
    this.save.save(save);
    this.audio.setMasterVolume(save.settings.masterVol);
    this.audio.setMusicVolume(save.settings.musicVol);
    this.audio.setSfxVolume(save.settings.sfxVol);
  }

  private loadSettings(): void {
    const save = this.save.load();
    this.audio.setMasterVolume(save.settings.masterVol);
    this.audio.setMusicVolume(save.settings.musicVol);
    this.audio.setSfxVolume(save.settings.sfxVol);
  }

  getInputState(): Readonly<InputState> {
    return this.input?.getState() ?? { steer: 0, throttle: 0, brake: 0, handbrake: false, boost: false, weapon: false, pause: false };
  }

  updateInput(): void {
    this.input?.update();
  }
}

export interface GameState {
  currentScene: string;
  chapter: number;
  missionIndex: number;
  missionSeed: number;
  isPaused: boolean;
  gameOver: boolean;
  victory: boolean;
}