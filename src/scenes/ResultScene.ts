import { Scene } from 'phaser';
import { Game } from '@/game/Game';

export class ResultScene extends Scene {
  private gameInstance!: Game;
  private result!: 'win' | 'lose' | 'timeout';
  private credits = 0;
  private driftScore = 0;
  private chapter = 1;
  private missionIndex = 0;

  constructor() {
    super('ResultScene');
  }

  init(data: { result: 'win' | 'lose' | 'timeout'; credits: number; driftScore: number; chapter: number; missionIndex: number }): void {
    this.result = data.result;
    this.credits = data.credits;
    this.driftScore = data.driftScore;
    this.chapter = data.chapter;
    this.missionIndex = data.missionIndex;
  }

  create(): void {
    this.gameInstance = (this.game as any).game;
    this.createBackground();
    this.createResultUI();
  }

  private createBackground(): void {
    const g = this.add.graphics();
    g.fillGradientStyle(0x0a0a1a, 0x1a0a2e, 0x0a0a1a, 0x1a0a2e, 1);
    g.fillRect(0, 0, 720, 1280);
    g.setDepth(-10);

    // 粒子背景
    const particles = this.add.particles(0, 0, 'particle_dot', {
      lifespan: 3000,
      speed: { min: 10, max: 30 },
      angle: { min: 0, max: 360 },
      scale: { start: 0.2, end: 0 },
      alpha: { start: 0.3, end: 0 },
      blendMode: 'ADD',
      frequency: 100,
      emitting: true,
    });
    particles.setDepth(-5);
  }

  private createResultUI(): void {
    const isWin = this.result === 'win';
    const isTimeout = this.result === 'timeout';

    // 结果标题
    this.add.text(360, 180, isWin ? '任务完成!' : isTimeout ? '时间耗尽' : '任务失败', {
      font: 'bold 48px Orbitron',
      color: isWin ? '#00ff00' : '#ff4444',
      stroke: '#000033',
      strokeThickness: 4,
    }).setOrigin(0.5);

    // 奖励面板
    this.add.rectangle(360, 450, 500, 350, 0x0a0a2a, 0.9)
      .setStrokeStyle(3, isWin ? 0x00ff00 : 0xff4444);

    // 信用点奖励
    this.add.text(360, 320, `+${this.credits.toLocaleString()} 信用点`, {
      font: 'bold 36px Orbitron',
      color: '#ffff00',
      stroke: '#000033',
      strokeThickness: 3,
    }).setOrigin(0.5);

    // 详细分解
    const details = [
      { label: '基础奖励', value: 100 },
      { label: isWin ? '胜利奖励' : isTimeout ? '坚持奖励' : '参与奖', value: isWin ? 500 : isTimeout ? 100 : 50 },
      { label: '漂移奖励', value: Math.round(this.driftScore * 0.1) },
    ];

    let y = 380;
    for (const d of details) {
      this.add.text(200, y, d.label, { font: '18px Orbitron', color: '#88ff88' }).setOrigin(0, 0.5);
      this.add.text(520, y, `+${d.value.toLocaleString()}¢`, { font: 'bold 18px Orbitron', color: '#ffff00' }).setOrigin(1, 0.5);
      y += 40;
    }

    // 总计线
    this.add.line(360, y, -150, 0, 150, 0, 0x00ffff, 0.5).setOrigin(0.5);
    y += 20;
    this.add.text(360, y, `总计: ${this.credits.toLocaleString()}¢`, {
      font: 'bold 24px Orbitron', color: '#00ffff'
    }).setOrigin(0.5);

    // 漂移分数
    this.add.text(360, 620, `最高漂移分: ${Math.round(this.driftScore).toLocaleString()}`, {
      font: '20px Orbitron', color: '#ff00ff'
    }).setOrigin(0.5);

    // 按钮
    this.createButtons(isWin);

    // 进度显示
    if (isWin) {
      this.add.text(360, 800, `第 ${this.chapter} 章 - 任务 ${this.missionIndex + 1} 完成`, {
        font: '16px Orbitron', color: '#00ffff'
      }).setOrigin(0.5);
    }
  }

  private createButtons(isWin: boolean): void {
    const nextBtn = this.add.rectangle(180, 950, 280, 70, isWin ? 0x00aa00 : 0xaa8800)
      .setStrokeStyle(3, isWin ? 0x00ff00 : 0xffcc00)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.onNext(isWin))
      .on('pointerover', () => nextBtn.setFillStyle(isWin ? 0x00cc00 : 0xccaa00))
      .on('pointerout', () => nextBtn.setFillStyle(isWin ? 0x00aa00 : 0xaa8800));
    this.add.text(180, 950, isWin ? '下一任务' : '重试', {
      font: 'bold 24px Orbitron', color: '#ffffff'
    }).setOrigin(0.5);

    const garageBtn = this.add.rectangle(540, 950, 280, 70, 0x333366)
      .setStrokeStyle(2, 0x00ffff)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.scene.start('GarageScene'))
      .on('pointerover', () => garageBtn.setFillStyle(0x444488))
      .on('pointerout', () => garageBtn.setFillStyle(0x333366));
    this.add.text(540, 950, '回车库', {
      font: 'bold 24px Orbitron', color: '#00ffff'
    }).setOrigin(0.5);
  }

  private onNext(isWin: boolean): void {
    if (isWin) {
      const save = this.gameInstance.getSave();
      save.runProgress = { 
        chapter: this.chapter, 
        missionIndex: this.missionIndex + 1, 
        carState: null 
      };
      this.gameInstance.save.save(save);
      
      // 检查是否进入下一章
      if (this.missionIndex + 1 >= 5) {
        // 章节结束
        this.scene.start('GarageScene');
      } else {
        // 继续下一任务
        this.scene.start('RaceScene');
      }
    } else {
      this.scene.restart();
    }
  }
}