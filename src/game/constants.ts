export type ChassisType = 'street' | 'drift' | 'heavy' | 'prototype';
export type PartType = 'engine' | 'tire' | 'body' | 'brake' | 'ecu';
export type ChipTrigger = 'manual' | 'on_hit' | 'on_kill' | 'on_drift' | 'on_pickup';
export type MissionType = 'courier' | 'chase' | 'escape' | 'drift_trial' | 'boss';
export type Rarity = 'common' | 'rare' | 'epic' | 'legendary';
export type PickupType = 'credit' | 'boost' | 'repair' | 'shield' | 'weapon' | 'magnet';

export const CHASSIS_TYPES: Record<ChassisType, string> = {
  street: '街道', drift: '漂移', heavy: '重型', prototype: '原型',
};

export const PART_TYPES: Record<PartType, string> = {
  engine: '引擎', tire: '轮胎', body: '车身', brake: '刹车', ecu: 'ECU',
};

export const RARITY_COLORS: Record<Rarity, number> = {
  common: 0x888888, rare: 0x00aaff, epic: 0xaa00ff, legendary: 0xffaa00,
};

export const RARITY_NAMES: Record<Rarity, string> = {
  common: '普通', rare: '稀有', epic: '史诗', legendary: '传说',
};

export const PICKUP_COLORS: Record<PickupType, number> = {
  credit: 0xffff00, boost: 0x00ffff, repair: 0x00ff88,
  shield: 0x8888ff, weapon: 0xff4444, magnet: 0xff8800,
};

export const GAME_CONFIG = {
  // 渲染
  canvasWidth: 720,
  canvasHeight: 1280,
  worldScale: 1,
  
  // 物理
  physicsFps: 60,
  fixedTimestep: 1/60,
  maxSubSteps: 3,
  
  // 赛道
  trackWidth: 120,
  trackSegmentLength: { min: 100, max: 600 },
  
  // 玩家
  playerStartBoost: 50,
  playerInvincibleTime: 1000,
  
  // AI
  aiReactionTime: 0.15,
  aiMaxSpeedMult: 0.95,
  
  // 经济
  baseCreditReward: 100,
  creditMultPerChapter: 1.3,
  
  // 存档
  saveVersion: 1,
  saveKey: 'neon_drift_save_v1',
  
  // 音频
  masterVolume: 0.7,
  sfxVolume: 0.8,
  musicVolume: 0.5,
  
  // 触觉
  hapticsEnabled: true,
} as const;

export type GameConfig = typeof GAME_CONFIG;