import { SeededRNG, Vec2 } from '@/utils/Math';
import { MissionSpec, DifficultyTier, TrackData, PickupData } from '@/data/tables';
import { PickupType } from '@/game/constants';
import { TrackBuilder } from './TrackBuilder';

export interface MissionData {
  spec: MissionSpec;
  track: TrackData;
  enemyCount: number;
  enemyTier: number;
  pickups: PickupData[];
  seed: number;
}

export class MissionGenerator {
  private rng: SeededRNG;

  constructor(seed: number) {
    this.rng = new SeededRNG(seed);
  }

  generate(spec: MissionSpec, difficulty: DifficultyTier, chapter: number): MissionData {
    const track = TrackBuilder.build(this.rng.getSeed() + chapter * 1000, difficulty);
    
    const enemyCount = difficulty.enemyCount + this.rng.nextInt(2);
    const enemyTier = Math.min(difficulty.enemyTier + (chapter > 3 ? 1 : 0), 3);
    
    const pickups = this.generatePickups(track, spec.type);
    
    return {
      spec,
      track,
      enemyCount,
      enemyTier,
      pickups,
      seed: this.rng.getSeed(),
    };
  }

  private generatePickups(track: TrackData, missionType: string): PickupData[] {
    const pickups: PickupData[] = [];
    const checkpointCount = track.checkpoints.length;
    
    // 在检查点附近生成拾取物
    for (let i = 1; i < checkpointCount; i++) {
      const cp = track.checkpoints[i];
      const prevCp = track.checkpoints[i - 1];
      if (!cp || !prevCp) continue;
      const midX = (cp.x + prevCp.x) / 2;
      const midY = (cp.y + prevCp.y) / 2;
      
      if (this.rng.nextBool(0.4)) {
        pickups.push({
          type: this.rng.choice<PickupType>(['credit', 'boost', 'repair', 'shield', 'magnet']),
          value: 10 + this.rng.nextInt(40),
          lifetime: 30000,
        });
      }
    }

    // 任务类型特定拾取物
    if (missionType === 'drift_trial') {
      // 漂移挑战多给氮气
      for (let i = 0; i < 5; i++) {
        const cp = this.rng.choice(track.checkpoints.slice(1));
        if (cp) pickups.push({ type: 'boost', value: 20, lifetime: 60000 });
      }
    } else if (missionType === 'chase') {
      // 追缉任务多给护盾和武器
      for (let i = 0; i < 3; i++) {
        const cp = this.rng.choice(track.checkpoints.slice(1));
        if (cp) pickups.push({ type: this.rng.choice(['shield', 'weapon']), value: 1, lifetime: 45000 });
      }
    }

    return pickups;
  }

  generateChapterMissions(chapter: number, difficulty: DifficultyTier): MissionData[] {
    const missions: MissionData[] = [];
    const missionTypes: MissionSpec['type'][] = ['courier', 'chase', 'escape', 'drift_trial'];
    
    // 每章4个普通任务 + 1个BOSS
    for (let i = 0; i < 4; i++) {
      const type = missionTypes[i % missionTypes.length]!;
      const spec = this.getMissionSpec(type);
      if (spec) missions.push(this.generate(spec, difficulty, chapter * 4 + i));
    }
    
    // BOSS任务
    const bossSpec = this.getMissionSpec('boss');
    if (bossSpec) missions.push(this.generate(bossSpec, difficulty, chapter * 4 + 4));
    
    return missions;
  }

  private getMissionSpec(type: MissionSpec['type']): MissionSpec {
    const specs: Record<MissionSpec['type'], MissionSpec> = {
      courier: { id: 'courier', type: 'courier', name: '极速快递', description: '限时送达，途经检查点可延长时间', baseDuration: 90000, difficulty: 1, rewardWeights: { credits: 1.0, reputation: 0.5, blueprints: 0.3 } },
      chase: { id: 'chase', type: 'chase', name: '追缉通缉犯', description: '击毁目标车辆，造成伤害越多奖励越高', baseDuration: 120000, difficulty: 2, rewardWeights: { credits: 0.8, reputation: 1.5, blueprints: 0.5 } },
      escape: { id: 'escape', type: 'escape', name: '逃离封锁', description: '存活到达终点，沿途有路障和追兵', baseDuration: 100000, difficulty: 2, rewardWeights: { credits: 0.7, reputation: 0.8, blueprints: 1.2 } },
      drift_trial: { id: 'drift_trial', type: 'drift_trial', name: '漂移挑战', description: '规定时间内累计漂移分数达标', baseDuration: 60000, difficulty: 1, rewardWeights: { credits: 0.5, reputation: 2.0, blueprints: 0.5 } },
      boss: { id: 'boss', type: 'boss', name: '区域BOSS', description: '多阶段BOSS战，击败解锁新区域', baseDuration: 180000, difficulty: 5, rewardWeights: { credits: 2.0, reputation: 2.0, blueprints: 2.0 } },
    };
    const spec = specs[type];
    return spec ? spec : specs.courier;
  }
}