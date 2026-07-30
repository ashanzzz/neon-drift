import { BaseStats, StatMod, ChassisSpec, PartSpec, ChipSpec } from '@/data/tables';
import { Vec2 } from '@/utils/Math';

export interface Entity {
  id: string;
  pos: Vec2;
  vel: Vec2;
  angle: number;
  angularVelocity: number;
  active: boolean;
  update(dt: number): void;
  destroy(): void;
}

export class PlayerCarRef {
  id: string;
  spec: ChassisSpec;
  baseStats: BaseStats;
  stats: RuntimeStats;
  body: PhysicsBody;
  input: InputStateRef;
  drift: DriftControllerRef;
  boost: BoostSystemRef;
  chips: ChipInstance[];
  health: number;
  maxHealth: number;
  boostCurrent: number;
  invincibleTimer: number;
  driftScore: number;
  totalScore: number;
  onDriftStart?: () => void;
  onDriftEnd?: (score: number, boost: number) => void;
  onHit?: (damage: number) => void;
  onPickup?: (type: string, value: number) => void;
  audio: AudioEngineRef;

  constructor(spec: ChassisSpec, parts: PartInstance[], chips: ChipInstance[]) {
    this.id = 'player';
    this.spec = spec;
    this.baseStats = { ...spec.baseStats };
    this.stats = this.computeStats(parts);
    this.body = { velocity: { x: 0, y: 0 }, rotation: 0, angularVelocity: 0 };
    this.input = { steer: 0, throttle: 0, brake: 0, handbrake: false, boost: false, weapon: false };
    this.chips = chips.map(c => ({ ...c, cooldown: 0 }));
    this.health = this.stats.durability;
    this.maxHealth = this.stats.durability;
    this.boostCurrent = this.stats.boostCap * 0.5;
    this.invincibleTimer = 0;
    this.driftScore = 0;
    this.totalScore = 0;
    this.audio = { play: () => {} };
    this.drift = { update: () => {}, applyPhysics: () => {}, getState: () => 'grip', getDriftAngle: () => 0, getDriftScore: () => 0, getBoostGain: () => 0, isDrifting: () => false };
    this.boost = { update: () => {}, activate: () => false, deactivate: () => {}, isActive: () => false, getLevel: () => 0 };
  }

  private computeStats(parts: PartInstance[]): RuntimeStats {
    const mods: StatMod[] = [];
    for (const part of parts) {
      const spec = part.spec;
      if (spec.stats) {
        mods.push({ source: spec.id, flat: { ...spec.stats }, pct: {} });
      }
    }
    return mergeStats(this.baseStats, mods);
  }

  takeDamage(amount: number): void {
    if (this.invincibleTimer > 0) return;
    this.health = Math.max(0, this.health - amount);
    this.invincibleTimer = 500;
    this.onHit?.(amount);
    if (this.health <= 0) {
      this.onDestroyed?.();
    }
  }

  heal(amount: number): void {
    this.health = Math.min(this.maxHealth, this.health + amount);
  }

  addBoost(amount: number): void {
    this.boostCurrent = Math.min(this.stats.boostCap, this.boostCurrent + amount);
  }

  useBoost(amount: number): boolean {
    if (this.boostCurrent >= amount) {
      this.boostCurrent -= amount;
      return true;
    }
    return false;
  }

  addDriftScore(score: number): void {
    this.driftScore += score;
    this.totalScore += score;
  }

  onDestroyed?: () => void;
}

export interface RuntimeStats extends BaseStats {
  mods: StatMod[];
  boostCap: number;
  boostRegen: number;
  boostCurrent: number;
  accel: number;
  driftForce: number;
}

export interface PhysicsBody {
  velocity: Vec2;
  rotation: number;
  angularVelocity: number;
}

export interface InputStateRef {
  steer: number;
  throttle: number;
  brake: number;
  handbrake: boolean;
  boost: boolean;
  weapon: boolean;
}

export interface DriftControllerRef {
  update(dt: number, input: InputStateRef): void;
  applyPhysics(dt: number): void;
  getState(): string;
  getDriftAngle(): number;
  getDriftScore(): number;
  getBoostGain(): number;
  isDrifting(): boolean;
}

export interface BoostSystemRef {
  update(dt: number): void;
  activate(): boolean;
  deactivate(): void;
  isActive(): boolean;
  getLevel(): number;
}

export interface PartInstance {
  id: string;
  spec: PartSpec;
  level: number;
}

export interface ChipInstance {
  id: string;
  spec: ChipSpec;
  cooldown: number;
}

export interface AudioEngineRef {
  play(name: string, options?: { volume?: number; pitch?: number }): void;
}

export function mergeStats(base: BaseStats, mods: StatMod[]): RuntimeStats {
  const result: any = { ...base };
  for (const mod of mods) {
    for (const [k, v] of Object.entries(mod.flat)) {
      result[k] = (result[k] || 0) + v;
    }
    for (const [k, v] of Object.entries(mod.pct)) {
      result[k] = (result[k] || 0) * (1 + v);
    }
  }
  return {
    ...result,
    mods,
    boostCap: result.boostCap,
    boostRegen: result.boostRegen,
    boostCurrent: result.boostCap * 0.5,
    accel: result.accel,
    driftForce: result.driftForce,
  };
}