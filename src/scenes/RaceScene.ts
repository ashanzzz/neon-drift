import { Scene } from 'phaser';
import { Game } from '@/game/Game';
import { DriftController } from '@/systems/DriftController';
import { MissionData } from '@/systems/MissionGenerator';
import { TrackData } from '@/data/tables';
import { CHASSIS_SPECS, PART_SPECS, CHIP_SPECS } from '@/data/tables';
import { AudioEngine } from '@/systems/AudioEngine';
import { SeededRNG } from '@/utils/Math';

export class RaceScene extends Scene {
  private gameInstance!: Game;
  private audio!: AudioEngine;
  private missionData!: MissionData;
  private rng!: SeededRNG;
  private trackGraphics!: Phaser.GameObjects.Graphics;
  private trackTexture!: Phaser.GameObjects.RenderTexture;

  // 玩家
  private player!: Phaser.GameObjects.Container;
  private playerGraphics!: Phaser.GameObjects.Graphics;
  private playerBody!: Phaser.Physics.Arcade.Body;
  private driftController!: DriftController;
  private driftParticles!: Phaser.GameObjects.Particles.ParticleEmitter;
  private boostParticles!: Phaser.GameObjects.Particles.ParticleEmitter;
  private isBoosting = false;

  // 敌人
  private enemies: EnemyCar[] = [];

  // 拾取物
  private pickups: PickupItem[] = [];

  // 检查点
  private checkpoints: Phaser.GameObjects.Graphics[] = [];
  private currentCheckpoint = 0;

  // 计时器
  private missionTimer = 0;
  private timeRemaining = 90000;
  private raceEnded = false;
  private raceResult = 'lose';

  // HUD
  private hudElements: Map<string, Phaser.GameObjects.Text> = new Map();
  private pauseOverlay!: Phaser.GameObjects.Container;

  // 漂移分数显示
  private driftScoreDisplay = 0;

  constructor() {
    super('RaceScene');
  }

  init(data: { missionData: MissionData }): void {
    this.missionData = data.missionData;
    this.rng = new SeededRNG(this.missionData.seed);
  }

  create(): void {
    this.gameInstance = (this.game as any).game;
    this.audio = (this.game as any).game.audio;

    // 设置物理世界边界
    const bounds = this.missionData.track.bounds;
    this.physics.world.setBounds(bounds.min.x, bounds.min.y, bounds.max.x - bounds.min.x, bounds.max.y - bounds.min.y);

    // 烘焙赛道纹理
    this.bakeTrack();

    // 创建玩家
    const save = this.gameInstance.getSave();
    const chassis = CHASSIS_SPECS.find(c => c.id === save.equipped.chassis) || CHASSIS_SPECS[0];
    this.createPlayer(chassis);

    // 创建敌人
    this.createEnemies();

    // 创建拾取物
    this.createPickups();

    // 创建检查点
    this.createCheckpoints();

    // 创建粒子系统
    this.createParticles();

    // 创建 HUD
    this.createHUD();

    // 创建暂停覆盖层
    this.createPauseOverlay();

    // 启动音乐
    this.audio.startMusic(this.missionData.spec.type === 'boss' ? 'music_boss' : 'music_main');

    // 设置相机跟随
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
    this.cameras.main.setZoom(1.2);
    this.cameras.main.setBackgroundColor('#0a0a1a');

    // 输入
    this.input.keyboard?.on('keydown-ESC', () => this.togglePause());
    this.input.keyboard?.on('keydown-P', () => this.togglePause());
  }

  private bakeTrack(): void {
    const bounds = this.missionData.track.bounds;
    const width = bounds.max.x - bounds.min.x;
    const height = bounds.max.y - bounds.min.y;

    this.trackTexture = this.add.renderTexture(bounds.min.x, bounds.min.y, width, height);
    this.trackTexture.setDepth(-5);

    const g = this.add.graphics();

    // 赛道沥青底色
    g.fillStyle(0x1a1a2e, 1);
    this.drawTrackPolygon(g, this.missionData.track, this.missionData.track.width, { x: 0, y: 0 });

    // 赛道边线
    g.lineStyle(4, 0x00ffff, 0.8);
    this.drawCenterLine(g, this.missionData.track, { x: 0, y: 0 });

    // 红白路肩
    g.lineStyle(2, 0xff0000, 0.6);
    this.drawCurbs(g, this.missionData.track, { x: 0, y: 0 });

    // 装饰物
    for (const dec of this.missionData.track.decorations) {
      const x = dec.position.x - bounds.min.x;
      const y = dec.position.y - bounds.min.y;
      g.fillStyle(dec.color, 0.6);
      if (dec.type === 'building') {
        g.fillRect(x - 30 * dec.scale, y - 60 * dec.scale, 60 * dec.scale, 120 * dec.scale);
      } else if (dec.type === 'neon') {
        g.lineStyle(3, dec.color, 1);
        g.strokeCircle(x, y, 15 * dec.scale);
      } else if (dec.type === 'lamp') {
        g.fillCircle(x, y, 8 * dec.scale);
      }
    }

    this.trackTexture.draw(g);
    g.destroy();
  }

  private drawTrackPolygon(g: Phaser.GameObjects.Graphics, track: TrackData, trackWidth: number, offset: { x: number; y: number }): void {
    const points: { x: number; y: number }[] = [];
    let pos = { x: 0, y: 0 };
    let angle = 0;

    for (const seg of track.segments) {
      const steps = Math.ceil(seg.length / 20);
      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const dist = seg.length * t;
        const segAngle = angle + seg.curvature * dist;
        const x = pos.x + Math.cos(segAngle) * dist;
        const y = pos.y + Math.sin(segAngle) * dist;

        const nx = -Math.sin(segAngle);
        const ny = Math.cos(segAngle);
        points.push({ x: x + nx * trackWidth / 2 - offset.x, y: y + ny * trackWidth / 2 - offset.y });
      }

      angle += seg.curvature * seg.length;
      pos.x += Math.cos(angle) * seg.length;
      pos.y += Math.sin(angle) * seg.length;
    }

    // 右边界反向
    const rightPoints: { x: number; y: number }[] = [];
    pos = { x: 0, y: 0 };
    angle = 0;
    for (const seg of track.segments) {
      const steps = Math.ceil(seg.length / 20);
      const segPoints: { x: number; y: number }[] = [];
      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const dist = seg.length * t;
        const segAngle = angle + seg.curvature * dist;
        const x = pos.x + Math.cos(segAngle) * dist;
        const y = pos.y + Math.sin(segAngle) * dist;

        const nx = -Math.sin(segAngle);
        const ny = Math.cos(segAngle);
        segPoints.push({ x: x - nx * trackWidth / 2 - offset.x, y: y - ny * trackWidth / 2 - offset.y });
      }
      rightPoints.push(...segPoints);
      angle += seg.curvature * seg.length;
      pos.x += Math.cos(angle) * seg.length;
      pos.y += Math.sin(angle) * seg.length;
    }
    rightPoints.reverse();
    points.push(...rightPoints);

    if (points.length > 2 && points[0]) {
      g.beginPath();
      g.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i++) {
        const p = points[i];
        if (p) g.lineTo(p.x, p.y);
      }
      g.closePath();
      g.fillPath();
    }
  }

  private drawCenterLine(g: Phaser.GameObjects.Graphics, track: any, offset: { x: number; y: number }): void {
    let pos = { x: 0, y: 0 };
    let angle = 0;
    let first = true;

    for (const seg of track.segments) {
      const steps = Math.ceil(seg.length / 30);
      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const dist = seg.length * t;
        const segAngle = angle + seg.curvature * dist;
        const x = pos.x + Math.cos(segAngle) * dist - offset.x;
        const y = pos.y + Math.sin(segAngle) * dist - offset.y;

        if (first) { g.moveTo(x, y); first = false; }
        else { g.lineTo(x, y); }
      }
      angle += seg.curvature * seg.length;
      pos.x += Math.cos(angle) * seg.length;
      pos.y += Math.sin(angle) * seg.length;
    }
    g.strokePath();
  }

  private drawCurbs(g: Phaser.GameObjects.Graphics, track: any, offset: { x: number; y: number }): void {
    const width = track.width;
    let pos = { x: 0, y: 0 };
    let angle = 0;
    let firstL = true, firstR = true;

    for (const seg of track.segments) {
      const steps = Math.ceil(seg.length / 30);
      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const dist = seg.length * t;
        const segAngle = angle + seg.curvature * dist;
        const x = pos.x + Math.cos(segAngle) * dist;
        const y = pos.y + Math.sin(segAngle) * dist;

        const nx = -Math.sin(segAngle);
        const ny = Math.cos(segAngle);

        const lx = x + nx * width / 2 - offset.x;
        const ly = y + ny * width / 2 - offset.y;
        const rx = x - nx * width / 2 - offset.x;
        const ry = y - ny * width / 2 - offset.y;

        if (firstL) { g.moveTo(lx, ly); firstL = false; }
        else { g.lineTo(lx, ly); }
        if (firstR) { g.moveTo(rx, ry); firstR = false; }
        else { g.lineTo(rx, ry); }
      }
      angle += seg.curvature * seg.length;
      pos.x += Math.cos(angle) * seg.length;
      pos.y += Math.sin(angle) * seg.length;
    }
    g.strokePath();
  }

  private createPlayer(chassis: any): void {
    this.player = this.add.container(0, 0);
    this.playerGraphics = this.add.graphics();
    this.player.add(this.playerGraphics);

    // 启用物理
    this.physics.add.existing(this.player);
    this.playerBody = this.player.body as Phaser.Physics.Arcade.Body;
    this.playerBody.setCollideWorldBounds(true);
    this.playerBody.setBounce(0.3);
    this.playerBody.setDrag(100);
    this.playerBody.setMaxVelocity(chassis.baseStats.topSpeed);

    // 漂移控制器
    this.driftController = new DriftController({
      stats: { ...chassis.baseStats, boostCap: 100, boostRegen: 8, boostCurrent: 50 },
      body: this.playerBody,
      onDriftStart: () => {
        this.audio.play('drift_start');
        this.driftParticles.startFollow(this.player);
        this.driftParticles.emitting = true;
      },
      onDriftEnd: (score: number, boost: number) => {
        this.audio.play('drift_end');
        this.driftParticles.emitting = false;
        this.driftScoreDisplay = score;
      },
    } as any);

    // 绘制车辆
    this.drawCar(chassis.visual);
  }

  private drawCar(visual: any): void {
    const g = this.playerGraphics;
    g.clear();
    const { width, height, color, accent, shape } = visual;

    // 车身
    g.fillStyle(color, 1);
    if (shape === 'wedge') {
      g.fillTriangle(-width/2, -height/2, width/2, 0, -width/2, height/2);
    } else if (shape === 'arrow') {
      g.fillTriangle(-width/2, -height/2, width/2, 0, -width/2, height/2);
      g.fillTriangle(-width/2, -height/3, 0, 0, -width/2, height/3);
    } else if (shape === 'round') {
      g.fillRoundedRect(-width/2, -height/2, width, height, 8);
    } else {
      g.fillRect(-width/2, -height/2, width, height);
    }

    // 装饰线
    g.lineStyle(2, accent, 0.8);
    g.strokeTriangle(-width/2, -height/2, width/2, 0, -width/2, height/2);

    // 窗户
    g.fillStyle(0x001133, 0.8);
    g.fillRoundedRect(-width/2 + 6, -height/2 + 4, width - 12, height - 8, 4);
  }

  private createEnemies(): void {
    for (let i = 0; i < this.missionData.enemyCount; i++) {
      const cpIndex = Math.floor(i * this.missionData.track.checkpoints.length / this.missionData.enemyCount);
      const cp = this.missionData.track.checkpoints[cpIndex];
      if (!cp) continue;

      const enemy = this.add.container(cp.x, cp.y);
      const g = this.add.graphics();
      g.fillStyle(0xff0044, 1);
      g.fillRoundedRect(-20, -12, 40, 24, 4);
      g.lineStyle(2, 0xff88aa, 1);
      g.strokeRoundedRect(-20, -12, 40, 24, 4);
      enemy.add(g);

      this.physics.add.existing(enemy);
      const body = enemy.body as Phaser.Physics.Arcade.Body;
      body.setCollideWorldBounds(true);
      body.setDrag(50);
      body.setMaxVelocity(200);

      this.enemies.push({ container: enemy, body, targetCheckpoint: 1, state: 'chase', stuckTimer: 0 });
    }
  }

  private createPickups(): void {
    for (const p of this.missionData.pickups) {
      const cp = this.missionData.track.checkpoints[1];
      if (!cp) continue;

      const item = this.add.container(cp.x + (this.rng.nextFloat() - 0.5) * 100, cp.y + (this.rng.nextFloat() - 0.5) * 100);
      const g = this.add.graphics();
      const colors: Record<string, number> = { credit: 0xffff00, boost: 0x00ffff, repair: 0x00ff88, shield: 0x8888ff, weapon: 0xff4444, magnet: 0xff8800 };
      const color = colors[p.type] || 0xffffff;
      g.fillStyle(color, 1);
      g.fillCircle(0, 0, 12);
      g.lineStyle(2, 0xffffff, 1);
      g.strokeCircle(0, 0, 12);
      item.add(g);

      this.physics.add.existing(item);
      (item.body as Phaser.Physics.Arcade.Body).setImmovable(true);
      (item.body as Phaser.Physics.Arcade.Body).setSize(24, 24);

      this.pickups.push({ container: item, type: p.type, value: p.value, lifetime: p.lifetime, created: this.time.now });
    }
  }

  private createCheckpoints(): void {
    for (let i = 1; i < this.missionData.track.checkpoints.length; i++) {
      const cp = this.missionData.track.checkpoints[i];
      if (!cp) continue;
      const g = this.add.graphics();
      g.fillStyle(i === 1 ? 0xffff0033 : 0x00ffff22, 1);
      g.lineStyle(2, i === 1 ? 0xffff00 : 0x00ffff, 0.8);
      g.fillCircle(cp.x, cp.y, 60);
      g.strokeCircle(cp.x, cp.y, 60);
      g.setDepth(-2);
      this.checkpoints.push(g);
    }
  }

  private createParticles(): void {
    // 漂移烟雾
    this.driftParticles = this.add.particles(0, 0, 'particle_smoke', {
      lifespan: 800,
      speed: { min: 20, max: 80 },
      angle: { min: 0, max: 360 },
      scale: { start: 0.5, end: 0 },
      alpha: { start: 0.6, end: 0 },
      blendMode: 'ADD',
      emitting: false,
    });
    this.driftParticles.setDepth(-1);

    // 氮气火焰
    this.boostParticles = this.add.particles(0, 0, 'particle_spark', {
      lifespan: 300,
      speed: { min: 100, max: 200 },
      angle: { min: 160, max: 200 },
      scale: { start: 1, end: 0 },
      tint: [0xff6600, 0xffaa00, 0xffff00],
      blendMode: 'ADD',
      emitting: false,
    });
    this.boostParticles.setDepth(-1);
  }

  private createHUD(): void {
    const style = { font: 'bold 18px Orbitron', color: '#00ffff', stroke: '#000033', strokeThickness: 3 };

    // 速度表
    this.hudElements.set('speed', this.add.text(30, 30, '0 km/h', style).setScrollFactor(0).setDepth(10));

    // Boost 条
    this.hudElements.set('boostBar', this.add.text(30, 65, '██████████', { ...style, font: '16px monospace' }).setScrollFactor(0).setDepth(10));

    // 漂移分数
    this.hudElements.set('drift', this.add.text(30, 100, '漂移: 0', { ...style, font: '16px Orbitron' }).setScrollFactor(0).setDepth(10));

    // 时间
    this.hudElements.set('time', this.add.text(360, 30, '01:30', { ...style, font: 'bold 28px Orbitron' }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(10));

    // 检查点
    this.hudElements.set('checkpoint', this.add.text(690, 30, '检查点 0/0', { ...style, font: '14px Orbitron' }).setOrigin(1, 0).setScrollFactor(0).setDepth(10));
  }

  private createPauseOverlay(): void {
    this.pauseOverlay = this.add.container(360, 640).setScrollFactor(0).setDepth(100).setVisible(false);

    const bg = this.add.rectangle(0, 0, 400, 350, 0x0a0a2a, 0.95).setStrokeStyle(3, 0x00ffff);
    const title = this.add.text(0, -120, '暂停', { font: 'bold 36px Orbitron', color: '#00ffff' }).setOrigin(0.5);

    const resumeBtn = this.add.rectangle(0, -30, 300, 60, 0x00aa00).setStrokeStyle(2, 0x00ff00).setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.togglePause())
      .on('pointerover', () => resumeBtn.setFillStyle(0x00cc00))
      .on('pointerout', () => resumeBtn.setFillStyle(0x00aa00));
    const resumeText = this.add.text(0, -30, '继续', { font: 'bold 24px Orbitron', color: '#ffffff' }).setOrigin(0.5);

    const restartBtn = this.add.rectangle(0, 40, 300, 60, 0xaa8800).setStrokeStyle(2, 0xffcc00).setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.scene.restart({ missionData: this.missionData }))
      .on('pointerover', () => restartBtn.setFillStyle(0xccaa00))
      .on('pointerout', () => restartBtn.setFillStyle(0xaa8800));
    const restartText = this.add.text(0, 40, '重新开始', { font: 'bold 24px Orbitron', color: '#ffffff' }).setOrigin(0.5);

    const quitBtn = this.add.rectangle(0, 110, 300, 60, 0xaa0000).setStrokeStyle(2, 0xff4444).setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.quitRace())
      .on('pointerover', () => quitBtn.setFillStyle(0xcc0000))
      .on('pointerout', () => quitBtn.setFillStyle(0xaa0000));
    const quitText = this.add.text(0, 110, '退出到车库', { font: 'bold 24px Orbitron', color: '#ffffff' }).setOrigin(0.5);

    this.pauseOverlay.add([bg, title, resumeBtn, resumeText, restartBtn, restartText, quitBtn, quitText]);
  }

  update(time: number, delta: number): void {
    if (this.raceEnded || this.gameInstance.state.isPaused) return;

    const dt = delta / 1000;
    const input = this.gameInstance.getInputState();

    // 更新漂移控制器
    this.driftController.update(dt, input);
    this.driftController.applyPhysics(dt);

    // 更新玩家物理
    this.updatePlayer(dt, input);

    // 更新敌人
    this.updateEnemies(dt);

    // 更新拾取物
    this.updatePickups(dt);

    // 检查检查点
    this.checkCheckpoints();

    // 碰撞检测
    this.checkCollisions();

    // 更新计时器
    this.missionTimer += delta;
    this.timeRemaining = Math.max(0, this.missionData.spec.baseDuration - this.missionTimer);
    if (this.timeRemaining <= 0 && !this.raceEnded) {
      this.endRace('timeout');
    }

    // 更新 HUD
    this.updateHUD();
  }

  private updatePlayer(dt: number, input: any): void {
    const save = this.gameInstance.getSave();
    const chassis = CHASSIS_SPECS.find(c => c.id === save.equipped.chassis);
    const fallbackChassis = CHASSIS_SPECS[0]!;
    const stats = (chassis ?? fallbackChassis).baseStats;
    const speed = Math.hypot(this.playerBody.velocity.x, this.playerBody.velocity.y);

    // 转向
    if (input.steer !== 0 && speed > 10) {
      const turnRate = stats.grip * 3 * (1 - Math.min(1, speed / stats.topSpeed));
      this.playerBody.angularVelocity = input.steer * turnRate;
    }

    // 油门
    if (input.throttle > 0) {
      const force = stats.accel * input.throttle * 500;
      this.playerBody.velocity.x += Math.cos(this.playerBody.rotation) * force * dt;
      this.playerBody.velocity.y += Math.sin(this.playerBody.rotation) * force * dt;
    }

    // 刹车
    if (input.brake > 0) {
      const brakeForce = stats.accel * 800 * input.brake;
      const vel = this.playerBody.velocity;
      const spd = Math.hypot(vel.x, vel.y);
      if (spd > 1) {
        vel.x -= (vel.x / spd) * brakeForce * dt;
        vel.y -= (vel.y / spd) * brakeForce * dt;
      }
    }

    // 氮气
    if (input.boost && !this.isBoosting) {
      this.activateBoost();
    } else if (!input.boost && this.isBoosting) {
      this.deactivateBoost();
    }

    if (this.isBoosting) {
      const boostForce = stats.topSpeed * 2;
      this.playerBody.velocity.x += Math.cos(this.playerBody.rotation) * boostForce * dt;
      this.playerBody.velocity.y += Math.sin(this.playerBody.rotation) * boostForce * dt;
      this.boostParticles.startFollow(this.player, this.playerBody.rotation + Math.PI, 20);
      this.boostParticles.emitting = true;
    } else {
      this.boostParticles.emitting = false;
    }

    // 速度限制
    const maxSpeed = stats.topSpeed * (this.isBoosting ? 1.5 : 1);
    const currentSpeed = Math.hypot(this.playerBody.velocity.x, this.playerBody.velocity.y);
    if (currentSpeed > maxSpeed) {
      const scale = maxSpeed / currentSpeed;
      this.playerBody.velocity.x *= scale;
      this.playerBody.velocity.y *= scale;
    }
  }

  private activateBoost(): void {
    this.isBoosting = true;
    this.audio.play('boost_activate');
  }

  private deactivateBoost(): void {
    this.isBoosting = false;
  }

  private updateEnemies(dt: number): void {
    for (const enemy of this.enemies) {
      if (enemy.targetCheckpoint >= this.missionData.track.checkpoints.length) {
        enemy.targetCheckpoint = 1;
      }
      const target = this.missionData.track.checkpoints[enemy.targetCheckpoint];
      if (!target) continue;

      const dx = target.x - enemy.container.x;
      const dy = target.y - enemy.container.y;
      const dist = Math.hypot(dx, dy);
      const angle = Math.atan2(dy, dx);

      const turnSpeed = 4;
      const currentAngle = enemy.body.rotation;
      let diff = angle - currentAngle;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      enemy.body.angularVelocity = diff * turnSpeed;

      const speed = 150 * 0.9;
      enemy.body.velocity.x = Math.cos(enemy.body.rotation) * speed;
      enemy.body.velocity.y = Math.sin(enemy.body.rotation) * speed;

      if (dist < 80) {
        enemy.targetCheckpoint++;
      }
    }
  }

  private updatePickups(dt: number): void {
    const now = this.time.now;
    this.pickups = this.pickups.filter(p => {
      if (now - p.created > p.lifetime) {
        p.container.destroy();
        return false;
      }
      return true;
    });
  }

  private checkCheckpoints(): void {
    const nextCpIndex = this.currentCheckpoint + 1;
    if (nextCpIndex >= this.missionData.track.checkpoints.length) return;

    const cp = this.missionData.track.checkpoints[nextCpIndex];
    if (!cp) return;
    const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, cp.x, cp.y);

    if (dist < 80) {
      this.currentCheckpoint = nextCpIndex;
      this.missionTimer = Math.max(0, this.missionTimer - 15000); // 过检查点减15秒（即加时间）
      this.timeRemaining = this.missionData.spec.baseDuration - this.missionTimer;

      // 视觉反馈
      this.checkpoints[nextCpIndex - 1]?.lineStyle(3, 0x00ff00, 1);
      this.checkpoints[nextCpIndex - 1]?.fillStyle(0x00ff00, 0.5);

      if (nextCpIndex < this.checkpoints.length) {
        this.checkpoints[nextCpIndex]?.lineStyle(3, 0xffff00, 1);
      }

      this.audio.play('pickup_credit');

      if (this.currentCheckpoint >= this.missionData.track.checkpoints.length - 1) {
        this.endRace('win');
      }
    }
  }

  private checkCollisions(): void {
    // 玩家 vs 敌人
    for (const enemy of this.enemies) {
      const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, enemy.container.x, enemy.container.y);
      if (dist < 50) {
        const angle = Math.atan2(this.player.y - enemy.container.y, this.player.x - enemy.container.x);
        const knockback = 300;
        this.playerBody.velocity.x += Math.cos(angle) * knockback;
        this.playerBody.velocity.y += Math.sin(angle) * knockback;
        enemy.body.velocity.x -= Math.cos(angle) * knockback * 0.5;
        enemy.body.velocity.y -= Math.sin(angle) * knockback * 0.5;
        this.audio.play('impact_light');
      }
    }

    // 玩家 vs 拾取物
    for (let i = this.pickups.length - 1; i >= 0; i--) {
      const p = this.pickups[i];
      if (!p) continue;
      const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, p.container.x, p.container.y);
      if (dist < 40) {
        this.collectPickup(p);
        this.pickups.splice(i, 1);
      }
    }
  }

  private collectPickup(p: PickupItem): void {
    const save = this.gameInstance.getSave();

    switch (p.type) {
      case 'credit':
        save.credits += p.value;
        this.audio.play('pickup_credit');
        break;
      case 'boost':
        this.playerBody.velocity.x *= 1.3;
        this.playerBody.velocity.y *= 1.3;
        this.audio.play('pickup_boost');
        break;
      case 'repair':
        this.audio.play('pickup_repair');
        break;
    }
    p.container.destroy();
    this.gameInstance.save.save(save);
  }

  private updateHUD(): void {
    const speed = Math.round(Math.hypot(this.playerBody.velocity.x, this.playerBody.velocity.y) * 3.6);
    this.hudElements.get('speed')?.setText(`${speed} km/h`);

    this.hudElements.get('drift')?.setText(`漂移: ${Math.round(this.driftScoreDisplay)}`);

    const mins = Math.floor(this.timeRemaining / 60000);
    const secs = Math.floor((this.timeRemaining % 60000) / 1000);
    this.hudElements.get('time')?.setText(`${mins.toString().padStart(2,'0')}:${secs.toString().padStart(2,'0')}`);

    this.hudElements.get('checkpoint')?.setText(`检查点 ${this.currentCheckpoint}/${this.missionData.track.checkpoints.length - 1}`);
  }

  private togglePause(): void {
    if (this.gameInstance.state.isPaused) {
      this.gameInstance.resume();
      this.pauseOverlay.setVisible(false);
      this.audio.startMusic(this.missionData.spec.type === 'boss' ? 'music_boss' : 'music_main');
    } else {
      this.gameInstance.pause();
      this.pauseOverlay.setVisible(true);
      this.audio.stopMusic();
    }
  }

  private restartRace(): void {
    this.scene.restart({ missionData: this.missionData });
  }

  private quitRace(): void {
    this.audio.stopMusic();
    this.scene.start('GarageScene');
  }

  private endRace(result: 'win' | 'lose' | 'timeout'): void {
    if (this.raceEnded) return;
    this.raceEnded = true;
    this.raceResult = result;

    this.audio.stopMusic();

    // 计算奖励
    const baseCredits = 100;
    const bonusCredits = result === 'win' ? 500 : result === 'timeout' ? 100 : 50;
    const driftBonus = Math.round(this.driftScoreDisplay * 0.1);
    const totalCredits = baseCredits + bonusCredits + driftBonus;

    const save = this.gameInstance.getSave();
    save.credits += totalCredits;
    save.stats.totalRuns++;
    if (result === 'win') save.stats.wins++;
    save.stats.bestScore = Math.max(save.stats.bestScore, this.driftScoreDisplay);
    save.stats.totalDriftScore += this.driftScoreDisplay;

    // 解锁新底盘
    if (result === 'win' && !save.unlockedChassis.includes('chassis_drift')) {
      save.unlockedChassis.push('chassis_drift');
    }

    this.gameInstance.save.save(save);
    this.gameInstance.endRun(result === 'win');

    // 显示结果
    this.time.delayedCall(1000, () => {
      this.scene.start('ResultScene', {
        result,
        credits: totalCredits,
        driftScore: this.driftScoreDisplay,
        chapter: this.gameInstance.state.chapter,
        missionIndex: this.gameInstance.state.missionIndex,
      });
    });
  }
}

interface EnemyCar {
  container: Phaser.GameObjects.Container;
  body: Phaser.Physics.Arcade.Body;
  targetCheckpoint: number;
  state: string;
  stuckTimer: number;
}

interface PickupItem {
  container: Phaser.GameObjects.Container;
  type: string;
  value: number;
  lifetime: number;
  created: number;
}