import { BaseStats } from '@/data/tables';
import { Vec2 } from '@/utils/Math';

export class DriftController {
  private car: PlayerCarRef;
  private state: 'grip' | 'drift_init' | 'drift_hold' | 'drift_exit' = 'grip';
  private driftAngle = 0;
  private driftScore = 0;
  private boostGain = 0;
  private driftTime = 0;
  private lastDriftAngle = 0;
  private angleVelocity = 0;

  constructor(car: PlayerCarRef) {
    this.car = car;
  }

  update(dt: number, input: InputStateRef): void {
    const { stats, body } = this.car;
    const speed = Math.hypot(body.velocity.x, body.velocity.y);
    const gripLimit = stats.grip * 200;

    if (this.state === 'grip') {
      if (input.handbrake && speed > 80) {
        this.enterDrift(input.steer);
      }
    } else {
      this.maintainDrift(dt, input, speed, gripLimit);
    }
  }

  private enterDrift(steerDir: number): void {
    this.state = 'drift_init';
    this.driftAngle = steerDir * 0.3;
    this.driftScore = 0;
    this.boostGain = 0;
    this.driftTime = 0;
    this.angleVelocity = 0;
    this.car.onDriftStart?.();
  }

  private maintainDrift(dt: number, input: InputStateRef, speed: number, gripLimit: number): void {
    this.driftTime += dt;

    // 目标侧偏角 = 反向转向 * 速度因子
    const targetAngle = -input.steer * 0.5 * Math.min(1, speed / 300);
    this.angleVelocity += (targetAngle - this.driftAngle) * 8 * dt;
    this.angleVelocity *= 0.85;
    this.driftAngle += this.angleVelocity * dt;
    this.driftAngle = Math.max(-0.8, Math.min(0.8, this.driftAngle));

    // 评分：侧偏角 × 速度 × 时间
    const scoreRate = Math.abs(this.driftAngle) * speed * 0.01;
    this.driftScore += scoreRate * dt;
    this.boostGain = Math.min(this.driftScore * 0.05, this.car.stats.boostCap * 0.4);

    // 退出判定
    if (!input.handbrake || speed < 50 || Math.abs(this.driftAngle) < 0.05) {
      this.exitDrift();
    } else {
      this.state = 'drift_hold';
    }
  }

  applyPhysics(dt: number): void {
    if (this.state === 'grip') return;

    const { body, stats } = this.car;
    const speed = Math.hypot(body.velocity.x, body.velocity.y);
    if (speed < 10) return;

    // 侧向力 = 漂移力 × 侧偏角 × 速度
    const lateralForce = stats.driftForce * this.driftAngle * speed * 0.8;
    const forwardForce = stats.accel * (1 - Math.abs(this.driftAngle) * 0.4);

    const angle = body.rotation;
    body.velocity.x += Math.cos(angle) * forwardForce * dt;
    body.velocity.y += Math.sin(angle) * forwardForce * dt;
    body.velocity.x += Math.cos(angle + Math.PI / 2) * lateralForce * dt;
    body.velocity.y += Math.sin(angle + Math.PI / 2) * lateralForce * dt;

    // 角速度跟随侧偏角
    body.angularVelocity = this.driftAngle * speed * 0.006;
  }

  private exitDrift(): void {
    this.state = 'drift_exit';
    this.car.stats.boostCurrent = Math.min(
      this.car.stats.boostCurrent + this.boostGain,
      this.car.stats.boostCap
    );
    this.car.onDriftEnd?.(this.driftScore, this.boostGain);
    this.driftAngle *= 0.5;
    setTimeout(() => { this.state = 'grip'; this.driftAngle = 0; }, 200);
  }

  getState(): string { return this.state; }
  getDriftAngle(): number { return this.driftAngle; }
  getDriftScore(): number { return this.driftScore; }
  getBoostGain(): number { return this.boostGain; }
  isDrifting(): boolean { return this.state !== 'grip'; }
}

export interface PlayerCarRef {
  stats: BaseStats & { boostCurrent: number; boostCap: number };
  body: { velocity: Vec2; rotation: number; angularVelocity: number };
  onDriftStart?: () => void;
  onDriftEnd?: (score: number, boost: number) => void;
}

export interface InputStateRef {
  steer: number;
  throttle: number;
  brake: number;
  handbrake: boolean;
  boost: boolean;
  weapon: boolean;
}