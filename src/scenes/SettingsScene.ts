import { Scene } from 'phaser';
import { Game } from '@/game/Game';

export class SettingsScene extends Scene {
  private gameInstance!: Game;
  private saveData: any;

  constructor() {
    super('SettingsScene');
  }

  create(): void {
    this.gameInstance = (this.game as any).game;
    this.saveData = this.gameInstance.getSave();
    this.createBackground();
    this.createUI();
  }

  private createBackground(): void {
    const g = this.add.graphics();
    g.fillGradientStyle(0x0a0a1a, 0x1a0a2e, 0x0a0a1a, 0x1a0a2e, 1);
    g.fillRect(0, 0, 720, 1280);
    g.setDepth(-10);

    // 标题
    this.add.text(360, 80, '设置', {
      font: 'bold 48px Orbitron',
      color: '#00ffff',
      stroke: '#000033',
      strokeThickness: 4,
    }).setOrigin(0.5);

    // 返回按钮
    const backBtn = this.add.rectangle(80, 80, 120, 50, 0x333366)
      .setStrokeStyle(2, 0x00ffff)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.scene.start('GarageScene'))
      .on('pointerover', () => backBtn.setFillStyle(0x444488))
      .on('pointerout', () => backBtn.setFillStyle(0x333366));
    this.add.text(80, 80, '返回', { font: 'bold 20px Orbitron', color: '#00ffff' }).setOrigin(0.5);
  }

  private createUI(): void {
    const settings = this.saveData.settings;
    let y = 200;

    // 音量控制
    y = this.createVolumeSlider('主音量', 'masterVol', settings.masterVol, y);
    y = this.createVolumeSlider('音乐音量', 'musicVol', settings.musicVol, y);
    y = this.createVolumeSlider('音效音量', 'sfxVol', settings.sfxVol, y);

    // 图形质量
    y = this.createToggle('高画质', 'graphics', settings.graphics === 'high', y, 
      (val: boolean) => { this.updateSetting('graphics', val ? 'high' : 'low'); });

    // 触觉反馈
    y = this.createToggle('触觉反馈', 'haptics', settings.haptics, y,
      (val: boolean) => { this.updateSetting('haptics', val); });

    // 存档管理
    y += 40;
    this.add.text(360, y, '存档管理', { font: 'bold 24px Orbitron', color: '#00ffff' }).setOrigin(0.5);
    y += 50;

    const exportBtn = this.add.rectangle(180, y, 280, 60, 0x00aa00)
      .setStrokeStyle(2, 0x00ff00)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.exportSave())
      .on('pointerover', () => exportBtn.setFillStyle(0x00cc00))
      .on('pointerout', () => exportBtn.setFillStyle(0x00aa00));
    this.add.text(180, y, '导出存档码', { font: 'bold 20px Orbitron', color: '#ffffff' }).setOrigin(0.5);

    const importBtn = this.add.rectangle(540, y, 280, 60, 0xaa8800)
      .setStrokeStyle(2, 0xffcc00)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.importSave())
      .on('pointerover', () => importBtn.setFillStyle(0xccaa00))
      .on('pointerout', () => importBtn.setFillStyle(0xaa8800));
    this.add.text(540, y, '导入存档码', { font: 'bold 20px Orbitron', color: '#ffffff' }).setOrigin(0.5);

    y += 90;

    const resetBtn = this.add.rectangle(360, y, 400, 60, 0xaa0000)
      .setStrokeStyle(2, 0xff4444)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.confirmReset())
      .on('pointerover', () => resetBtn.setFillStyle(0xcc0000))
      .on('pointerout', () => resetBtn.setFillStyle(0xaa0000));
    this.add.text(360, y, '重置所有进度 (危险)', { font: 'bold 20px Orbitron', color: '#ffffff' }).setOrigin(0.5);

    // 版本信息
    this.add.text(360, 1200, 'Neon Drift v1.0.0', { font: '14px Orbitron', color: '#444466' }).setOrigin(0.5);
    this.add.text(360, 1230, 'Powered by Phaser 3', { font: '12px monospace', color: '#333355' }).setOrigin(0.5);
  }

  private createVolumeSlider(label: string, key: 'masterVol' | 'musicVol' | 'sfxVol', value: number, y: number): number {
    this.add.text(80, y - 10, label, { font: '20px Orbitron', color: '#00ffff' }).setOrigin(0, 0.5);

    // 滑轨
    const track = this.add.rectangle(160, y + 20, 400, 8, 0x003333).setStrokeStyle(1, 0x00ffff);
    const fill = this.add.rectangle(160 - 200 + 400 * value, y + 20, 400 * value, 8, 0x00ffff);

    // 拖动手柄
    const handle = this.add.circle(160 - 200 + 400 * value, y + 20, 16, 0x00ffff).setInteractive({ draggable: true });
    this.input.setDraggable(handle);
    handle.on('drag', (pointer: any, dragX: number) => {
      const clampedX = Phaser.Math.Clamp(dragX, 160 - 200, 160 + 200);
      handle.x = clampedX;
      fill.width = clampedX - (160 - 200);
      const newValue = (clampedX - (160 - 200)) / 400;
      this.updateSetting(key, Math.round(newValue * 100) / 100);
    });

    // 显示数值
    const valText = this.add.text(580, y + 20, Math.round(value * 100) + '%', { font: 'bold 18px Orbitron', color: '#00ffff' }).setOrigin(1, 0.5);

    // 更新时同步
    const originalUpdate = this.updateSetting.bind(this);
    this.updateSetting = (k: string, v: number) => {
      originalUpdate(k, v);
      if (k === key) {
        handle.x = 160 - 200 + 400 * v;
        fill.width = 400 * v;
        valText.setText(Math.round(v * 100) + '%');
      }
    };

    return y + 60;
  }

  private createToggle(label: string, key: string, value: boolean, y: number, onChange: (val: boolean) => void): number {
    this.add.text(80, y, label, { font: '20px Orbitron', color: '#00ffff' }).setOrigin(0, 0.5);

    const btn = this.add.rectangle(580, y, 100, 50, value ? 0x00aa00 : 0x333333)
      .setStrokeStyle(2, value ? 0x00ff00 : 0x666666)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => {
        const newVal = !value;
        btn.setFillStyle(newVal ? 0x00aa00 : 0x333333);
        btn.setStrokeStyle(2, newVal ? 0x00ff00 : 0x666666);
        onChange(newVal);
      });

    this.add.text(580, y, value ? '开' : '关', { font: 'bold 20px Orbitron', color: '#ffffff' }).setOrigin(0.5);

    return y + 70;
  }

  private updateSetting(key: string, value: any): void {
    const save = this.gameInstance.getSave();
    (save.settings as any)[key] = value;
    this.gameInstance.save.save(save);
    
    // 实时应用音频设置
    if (key === 'masterVol') this.gameInstance.audio.setMasterVolume(value);
    else if (key === 'musicVol') this.gameInstance.audio.setMusicVolume(value);
    else if (key === 'sfxVol') this.gameInstance.audio.setSfxVolume(value);
  }

  private exportSave(): void {
    const code = this.gameInstance.save.export();
    navigator.clipboard.writeText(code).then(() => {
      this.showToast('存档码已复制到剪贴板!');
    }).catch(() => {
      this.showToast('复制失败，请手动复制: ' + code.substring(0, 50) + '...');
    });
  }

  private importSave(): void {
    const code = prompt('请粘贴存档码:');
    if (code) {
      const success = this.gameInstance.save.import(code);
      this.showToast(success ? '导入成功!' : '导入失败: 存档码无效');
      if (success) this.scene.restart();
    }
  }

  private confirmReset(): void {
    if (confirm('确定要重置所有进度吗？此操作不可撤销！')) {
      this.gameInstance.save.clear();
      this.showToast('已重置，重新加载中...');
      setTimeout(() => window.location.reload(), 1000);
    }
  }

  private showToast(message: string): void {
    const toast = this.add.rectangle(360, 1100, 400, 60, 0x00aa00, 0.9)
      .setStrokeStyle(2, 0x00ff00)
      .setDepth(200);
    const text = this.add.text(360, 1100, message, { font: '18px Orbitron', color: '#ffffff' })
      .setOrigin(0.5).setDepth(201);
    
    this.tweens.add({
      targets: [toast, text],
      alpha: 0,
      y: 1000,
      duration: 2000,
      ease: 'Power2',
      onComplete: () => { toast.destroy(); text.destroy(); }
    });
  }
}