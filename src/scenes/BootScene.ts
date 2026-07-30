import { Scene } from 'phaser';

export class BootScene extends Scene {
  constructor() {
    super('BootScene');
  }

  preload(): void {
    // 显示加载进度
    const progressBar = this.add.graphics();
    const progressBox = this.add.graphics();
    progressBox.fillStyle(0x222222, 0.8);
    progressBox.fillRect(160, 590, 400, 50);
    
    const loadingText = this.add.text(360, 520, '加载中...', {
      font: '24px Orbitron',
      color: '#00ffff',
    }).setOrigin(0.5);
    
    const percentText = this.add.text(360, 615, '0%', {
      font: '18px monospace',
      color: '#00ffff',
    }).setOrigin(0.5);

    this.load.on('progress', (value: number) => {
      progressBar.clear();
      progressBar.fillStyle(0x00ffff, 1);
      progressBar.fillRect(170, 600, 380 * value, 30);
      percentText.setText(`${Math.round(value * 100)}%`);
    });

    this.load.on('complete', () => {
      progressBar.destroy();
      progressBox.destroy();
      loadingText.destroy();
      percentText.destroy();
    });

    // 预加载音频解锁
    this.load.audio('silence', 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAA=');
    
    // 字体（本地回退，实际通过 CSS @font-face 加载）
    // 这里不需要加载字体文件，因为在 index.html 中已经通过 @font-face 引入了 Orbitron
  }

  create(): void {
    // 初始化音频上下文
    const game = (this.game as any).game;
    if (game?.audio) {
      game.audio.resume();
    }

    // 创建全局纹理（纯色、渐变等程序化生成）
    this.createProceduralTextures();

    this.scene.start('GarageScene');
  }

  private createProceduralTextures(): void {
    // 粒子纹理：小圆点
    const g = this.add.graphics({ x: 0, y: 0 });
    g.fillStyle(0xffffff, 1);
    g.fillCircle(4, 4, 4);
    g.generateTexture('particle_dot', 8, 8);
    g.destroy();

    // 粒子纹理：火花
    const g2 = this.add.graphics({ x: 0, y: 0 });
    g2.fillStyle(0xffff00, 1);
    g2.fillRect(0, 0, 4, 12);
    g2.generateTexture('particle_spark', 4, 12);
    g2.destroy();

    // 漂移烟雾纹理
    const g3 = this.add.graphics({ x: 0, y: 0 });
    g3.fillStyle(0xffffff, 1);
    g3.fillCircle(16, 16, 16);
    // 简单的径向渐变效果用多层绘制模拟
    g3.fillStyle(0x8888ff, 0.4);
    g3.fillCircle(16, 16, 12);
    g3.fillStyle(0x6666cc, 0.2);
    g3.fillCircle(16, 16, 8);
    g3.generateTexture('particle_smoke', 32, 32);
    g3.destroy();

    // 霓虹线纹理
    const g4 = this.add.graphics({ x: 0, y: 0 });
    g4.lineStyle(2, 0x00ffff, 1);
    g4.beginPath();
    g4.moveTo(0, 16);
    g4.lineTo(64, 16);
    g4.strokePath();
    g4.generateTexture('neon_line', 64, 32);
    g4.destroy();
  }
}