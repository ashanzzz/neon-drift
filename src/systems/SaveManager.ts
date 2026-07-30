import { SeededRNG } from '@/utils/Math';

export class SaveManager {
  private static instance: SaveManager;
  private saveKey: string;
  private cache: SaveData | null = null;

  private constructor() {
    this.saveKey = 'neon_drift_save_v1';
  }

  static getInstance(): SaveManager {
    if (!SaveManager.instance) SaveManager.instance = new SaveManager();
    return SaveManager.instance;
  }

  load(): SaveData {
    if (this.cache) return this.cache;
    try {
      const raw = localStorage.getItem(this.saveKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        this.cache = this.migrate(parsed);
        return this.cache;
      }
    } catch (e) {
      console.warn('Save load failed:', e);
    }
    this.cache = this.defaultSave();
    return this.cache;
  }

  save(data: SaveData): void {
    this.cache = data;
    try {
      localStorage.setItem(this.saveKey, JSON.stringify(data));
    } catch (e) {
      console.error('Save failed:', e);
    }
  }

  export(): string {
    const data = this.load();
    return btoa(JSON.stringify(data));
  }

  import(code: string): boolean {
    try {
      const data = JSON.parse(atob(code));
      this.save(this.migrate(data));
      return true;
    } catch {
      return false;
    }
  }

  clear(): void {
    this.cache = null;
    localStorage.removeItem(this.saveKey);
  }

  private defaultSave(): SaveData {
    return {
      version: 1,
      credits: 0,
      reputation: 0,
      unlockedChassis: ['chassis_street'],
      ownedParts: {},
      ownedChips: {},
      equipped: { chassis: 'chassis_street', parts: [], chips: [] },
      stats: { totalRuns: 0, wins: 0, bestScore: 0, totalDriftScore: 0 },
      settings: { masterVol: 0.7, sfxVol: 0.8, musicVol: 0.5, haptics: true, graphics: 'high' },
    };
  }

  private migrate(data: SaveData): SaveData {
    if (!data.version) data.version = 1;
    if (!data.settings) data.settings = this.defaultSave().settings;
    if (!data.stats) data.stats = this.defaultSave().stats;
    if (!data.equipped) data.equipped = this.defaultSave().equipped;
    return data;
  }
}

export interface SaveData {
  version: number;
  credits: number;
  reputation: number;
  unlockedChassis: string[];
  ownedParts: Record<string, number>;
  ownedChips: Record<string, number>;
  equipped: { chassis: string; parts: string[]; chips: string[] };
  stats: { totalRuns: number; wins: number; bestScore: number; totalDriftScore: number };
  settings: { masterVol: number; sfxVol: number; musicVol: number; haptics: boolean; graphics: 'low' | 'high' };
  runSeed?: number;
  runProgress?: { chapter: number; missionIndex: number; carState: any };
}