import { ChassisType, PartType, Rarity, MissionType, ChipTrigger, PickupType } from '@/game/constants';
import { Vec2 } from '@/utils/Math';

export interface BaseStats {
  topSpeed: number;
  accel: number;
  driftForce: number;
  grip: number;
  durability: number;
  boostCap: number;
  boostRegen: number;
}

export interface StatMod {
  source: string;
  flat: Partial<BaseStats>;
  pct: Partial<BaseStats>;
}

export interface RuntimeStats extends BaseStats {
  mods: StatMod[];
  recalculate: () => void;
}

export interface ChassisSpec {
  id: string;
  name: string;
  type: ChassisType;
  baseStats: BaseStats;
  slots: { parts: number; chips: number };
  unlockCost: number;
  visual: VisualConfig;
}

export interface VisualConfig {
  width: number;
  height: number;
  color: number;
  accent: number;
  shape: 'wedge' | 'box' | 'round' | 'arrow';
}

export interface PartSpec {
  id: string;
  name: string;
  type: PartType;
  rarity: Rarity;
  stats: Partial<BaseStats>;
  special?: SpecialEffect;
  cost: number;
  description: string;
}

export interface SpecialEffect {
  type: string;
  params: Record<string, number>;
}

export interface ChipSpec {
  id: string;
  name: string;
  trigger: ChipTrigger;
  effect: ChipEffect;
  cooldown: number;
  description: string;
  rarity: Rarity;
}

export interface ChipEffect {
  type: string;
  params: Record<string, number>;
}

export interface MissionSpec {
  id: string;
  type: MissionType;
  name: string;
  description: string;
  baseDuration: number;
  difficulty: number;
  rewardWeights: { credits: number; reputation: number; blueprints: number };
  specialRules?: string[];
}

export interface DifficultyTier {
  enemyCount: number;
  enemyTier: number;
  trackComplexity: number;
  hazardDensity: number;
  rewardMult: number;
}

export interface TrackSegment {
  type: 'straight' | 'curve' | 'chicane' | 'hairpin' | 'jump';
  length: number;
  curvature: number;
  banking: number;
  hazards: Hazard[];
}

export interface Hazard {
  type: 'oil' | 'debris' | 'barrier' | 'ramp' | 'mine';
  position: number;
  severity: number;
}

export interface TrackData {
  segments: TrackSegment[];
  width: number;
  checkpoints: Vec2[];
  decorations: Decoration[];
  bounds: { min: Vec2; max: Vec2 };
}

export interface Decoration {
  type: 'building' | 'neon' | 'billboard' | 'lamp' | 'fence';
  position: Vec2;
  rotation: number;
  scale: number;
  color: number;
}

export interface PickupData {
  type: PickupType;
  value: number;
  lifetime: number;
}

export interface RewardOption {
  type: 'part' | 'chip' | 'credits' | 'blueprint';
  itemId?: string;
  amount?: number;
  rarity?: Rarity;
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

// ============================================
// 底盘规格表
// ============================================
export const CHASSIS_SPECS: ChassisSpec[] = [
  {
    id: 'chassis_street',
    name: '街道之王',
    type: 'street',
    baseStats: { topSpeed: 280, accel: 1.0, driftForce: 1.0, grip: 1.0, durability: 100, boostCap: 100, boostRegen: 8 },
    slots: { parts: 3, chips: 2 },
    unlockCost: 0,
    visual: { width: 48, height: 28, color: 0x00ffff, accent: 0xff00ff, shape: 'wedge' },
  },
  {
    id: 'chassis_drift',
    name: '漂移幽灵',
    type: 'drift',
    baseStats: { topSpeed: 260, accel: 0.9, driftForce: 1.4, grip: 0.7, durability: 80, boostCap: 120, boostRegen: 10 },
    slots: { parts: 2, chips: 3 },
    unlockCost: 5000,
    visual: { width: 44, height: 26, color: 0xff00aa, accent: 0x00ffff, shape: 'arrow' },
  },
  {
    id: 'chassis_heavy',
    name: '钢铁巨兽',
    type: 'heavy',
    baseStats: { topSpeed: 220, accel: 0.7, driftForce: 0.6, grip: 1.5, durability: 200, boostCap: 80, boostRegen: 5 },
    slots: { parts: 4, chips: 1 },
    unlockCost: 12000,
    visual: { width: 56, height: 32, color: 0x888888, accent: 0xff8800, shape: 'box' },
  },
  {
    id: 'chassis_proto',
    name: '原型机-X',
    type: 'prototype',
    baseStats: { topSpeed: 320, accel: 1.2, driftForce: 1.2, grip: 1.2, durability: 120, boostCap: 150, boostRegen: 12 },
    slots: { parts: 3, chips: 3 },
    unlockCost: 50000,
    visual: { width: 50, height: 30, color: 0x00ff88, accent: 0xffff00, shape: 'round' },
  },
];

// ============================================
// 配件规格表
// ============================================
export const PART_SPECS: PartSpec[] = [
  // Engine
  { id: 'part_turbo', name: '涡轮增压', type: 'engine', rarity: 'common', stats: { topSpeed: 42, accel: 0.1 }, cost: 800, description: '+15% 最高速, +10% 加速' },
  { id: 'part_nitro', name: '硝基喷射', type: 'engine', rarity: 'rare', stats: { boostCap: 36, boostRegen: 4 }, special: { type: 'nitro_boost', params: { mult: 1.5 } }, cost: 3000, description: '+30% Boost容量, +50% Boost回复' },
  { id: 'part_supercharger', name: '机械增压', type: 'engine', rarity: 'epic', stats: { topSpeed: 64, accel: 0.15, driftForce: 0.1 }, cost: 15000, description: '+20% 全属性' },
  
  // Tire
  { id: 'part_slick', name: '热熔胎', type: 'tire', rarity: 'common', stats: { driftForce: 0.2, grip: -0.1 }, cost: 600, description: '+20% 漂移力, -10% 抓地' },
  { id: 'part_grip', name: '竞赛胎', type: 'tire', rarity: 'rare', stats: { grip: 0.25, durability: 10 }, cost: 2500, description: '+25% 抓地, +10 耐久' },
  { id: 'part_drag', name: '直线轮胎', type: 'tire', rarity: 'epic', stats: { topSpeed: 40, accel: 0.12, driftForce: -0.3 }, cost: 8000, description: '极致直线性能, 漂移大幅削弱' },
  
  // Body
  { id: 'part_armor', name: '碳纤维车身', type: 'body', rarity: 'epic', stats: { durability: 100, topSpeed: -14 }, cost: 8000, description: '+50% 耐久, -5% 最高速' },
  { id: 'part_aero', name: '主动空气套件', type: 'body', rarity: 'rare', stats: { grip: 0.15, driftForce: 0.1 }, cost: 4000, description: '+15% 抓地, +10% 漂移力' },
  { id: 'part_lightweight', name: '轻量化套件', type: 'body', rarity: 'rare', stats: { accel: 0.15, topSpeed: 20, durability: -20 }, cost: 5000, description: '+15% 加速, +7% 最高速, -10% 耐久' },
  
  // Brake
  { id: 'part_brake', name: '碳陶刹车', type: 'brake', rarity: 'common', stats: { driftForce: 0.2, accel: 0.05 }, cost: 1000, description: '+20% 漂移力, +5% 加速' },
  { id: 'part_ebrake', name: '电控手刹', type: 'brake', rarity: 'rare', stats: { driftForce: 0.35 }, special: { type: 'instant_drift', params: { angle: 0.5 } }, cost: 3500, description: '漂移启动更快, +35% 漂移力' },
  
  // ECU
  { id: 'part_ecu', name: '赛用ECU', type: 'ecu', rarity: 'epic', stats: { topSpeed: 28, accel: 0.1, driftForce: 0.1, grip: 0.1, boostRegen: 2 }, cost: 15000, description: '+10% 所有基础属性' },
  { id: 'part_ai', name: 'AI协处理器', type: 'ecu', rarity: 'legendary', stats: { topSpeed: 40, accel: 0.2, driftForce: 0.2, grip: 0.2, boostCap: 30, boostRegen: 5 }, cost: 50000, description: '+15% 所有属性, 解锁自动驾驶辅助' },
];

// ============================================
// 芯片规格表
// ============================================
export const CHIP_SPECS: ChipSpec[] = [
  {
    id: 'chip_overdrive',
    name: '过载协议',
    trigger: 'manual',
    effect: { type: 'stat_boost', params: { duration: 5, mult: 1.5, crashAfter: 3 } },
    cooldown: 30000,
    description: '5秒内所有属性+50%，结束后熄火3秒',
    rarity: 'epic',
  },
  {
    id: 'chip_shield',
    name: '能量护盾',
    trigger: 'on_hit',
    effect: { type: 'shield', params: { duration: 1, absorb: 1 } },
    cooldown: 20000,
    description: '受击时吸收一次伤害，获得1秒无敌',
    rarity: 'rare',
  },
  {
    id: 'chip_vampire',
    name: '吸血鬼',
    trigger: 'on_kill',
    effect: { type: 'heal_boost', params: { healPct: 0.2, boostPct: 0.1 } },
    cooldown: 15000,
    description: '击毁敌人回复20%耐久，+10% Boost',
    rarity: 'rare',
  },
  {
    id: 'chip_phantom',
    name: '幽灵协议',
    trigger: 'on_drift',
    effect: { type: 'stealth', params: { duration: 4, phasing: 1 } },
    cooldown: 25000,
    description: '漂移>3秒触发：隐身4秒，穿透碰撞',
    rarity: 'epic',
  },
  {
    id: 'chip_magnet',
    name: '磁力场',
    trigger: 'on_pickup',
    effect: { type: 'magnet', params: { radius: 300, duration: 3 } },
    cooldown: 10000,
    description: '拾取道具时吸附范围内所有拾取物',
    rarity: 'common',
  },
  {
    id: 'chip_jammer',
    name: '干扰器',
    trigger: 'manual',
    effect: { type: 'emp', params: { radius: 400, duration: 3 } },
    cooldown: 40000,
    description: '附近AI车辆失控3秒',
    rarity: 'legendary',
  },
];

// ============================================
// 任务规格表
// ============================================
export const MISSION_SPECS: MissionSpec[] = [
  {
    id: 'courier',
    type: 'courier',
    name: '极速快递',
    description: '限时送达，途经检查点可延长时间',
    baseDuration: 90000,
    difficulty: 1,
    rewardWeights: { credits: 1.0, reputation: 0.5, blueprints: 0.3 },
    specialRules: ['checkpoint_extends_time'],
  },
  {
    id: 'chase',
    type: 'chase',
    name: '追缉通缉犯',
    description: '击毁目标车辆，造成伤害越多奖励越高',
    baseDuration: 120000,
    difficulty: 2,
    rewardWeights: { credits: 0.8, reputation: 1.5, blueprints: 0.5 },
    specialRules: ['target_must_be_destroyed', 'damage_bonus'],
  },
  {
    id: 'escape',
    type: 'escape',
    name: '逃离封锁',
    description: '存活到达终点，沿途有路障和追兵',
    baseDuration: 100000,
    difficulty: 2,
    rewardWeights: { credits: 0.7, reputation: 0.8, blueprints: 1.2 },
    specialRules: ['survive_to_finish', 'roadblocks'],
  },
  {
    id: 'drift_trial',
    type: 'drift_trial',
    name: '漂移挑战',
    description: '在规定时间内累计漂移分数达标',
    baseDuration: 60000,
    difficulty: 1,
    rewardWeights: { credits: 0.5, reputation: 2.0, blueprints: 0.5 },
    specialRules: ['drift_score_target', 'no_enemies'],
  },
  {
    id: 'boss',
    type: 'boss',
    name: '区域BOSS',
    description: '多阶段BOSS战，击败解锁新区域',
    baseDuration: 180000,
    difficulty: 5,
    rewardWeights: { credits: 2.0, reputation: 2.0, blueprints: 2.0 },
    specialRules: ['multi_phase', 'unique_mechanics', 'unlocks_chapter'],
  },
];

// ============================================
// 难度曲线
// ============================================
export const DIFFICULTY_CURVE: DifficultyTier[] = [
  { enemyCount: 2, enemyTier: 0, trackComplexity: 0.3, hazardDensity: 0.1, rewardMult: 1.0 },
  { enemyCount: 3, enemyTier: 0, trackComplexity: 0.4, hazardDensity: 0.15, rewardMult: 1.2 },
  { enemyCount: 4, enemyTier: 1, trackComplexity: 0.5, hazardDensity: 0.2, rewardMult: 1.5 },
  { enemyCount: 5, enemyTier: 1, trackComplexity: 0.6, hazardDensity: 0.25, rewardMult: 1.8 },
  { enemyCount: 6, enemyTier: 2, trackComplexity: 0.7, hazardDensity: 0.3, rewardMult: 2.2 },
  { enemyCount: 4, enemyTier: 3, trackComplexity: 0.8, hazardDensity: 0.35, rewardMult: 3.0 },
];

// ============================================
// 默认存档
// ============================================
export const DEFAULT_SAVE: SaveData = {
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

// ============================================
// 辅助函数
// ============================================
export function getChassis(id: string): ChassisSpec | undefined {
  return CHASSIS_SPECS.find(c => c.id === id);
}

export function getPart(id: string): PartSpec | undefined {
  return PART_SPECS.find(p => p.id === id);
}

export function getChip(id: string): ChipSpec | undefined {
  return CHIP_SPECS.find(c => c.id === id);
}

export function getMission(type: MissionType): MissionSpec | undefined {
  return MISSION_SPECS.find(m => m.type === type);
}

export function getDifficulty(chapter: number): DifficultyTier {
  const idx = Math.min(chapter - 1, DIFFICULTY_CURVE.length - 1);
  const tier = DIFFICULTY_CURVE[Math.max(0, idx)];
  if (!tier) throw new Error('Difficulty tier not found');
  return tier;
}

export function mergeStats(base: BaseStats, mods: StatMod[]): BaseStats {
  const result = { ...base };
  for (const mod of mods) {
    for (const [k, v] of Object.entries(mod.flat)) {
      (result as any)[k] = ((result as any)[k] || 0) + v;
    }
    for (const [k, v] of Object.entries(mod.pct)) {
      (result as any)[k] = ((result as any)[k] || 0) * (1 + v);
    }
  }
  return result;
}