import { Scene } from 'phaser';
import { Game } from '@/game/Game';
import { CHASSIS_SPECS, PART_SPECS, CHIP_SPECS, SaveData } from '@/data/tables';

export class GarageScene extends Scene {
  private gameInstance!: Game;
  private saveData!: SaveData;
  private selectedChassisIndex = 0;
  private selectedPartIndices: number[] = [];
  private selectedChipIndices: number[] = [];
  private tab: 'chassis' | 'parts' | 'chips' = 'chassis';

  constructor() {
    super('GarageScene');
  }

  create(): void {
    this.gameInstance = (this.game as any).game;
    this.saveData = this.gameInstance.getSave();
    this.selectedChassisIndex = this.saveData.unlockedChassis.findIndex(
      id => id === this.saveData.equipped.chassis
    );
    if (this.selectedChassisIndex < 0) this.selectedChassisIndex = 0;

    this.createBackground();
    this.createUI();
    this.updateDisplay();
  }

  private createBackground(): void {
    // 网格背景
    const g = this.add.graphics();
    g.lineStyle(1, 0x00ffff, 0.1);
    for (let x = 0; x <= 720; x += 40) {
      g.moveTo(x, 0);
      g.lineTo(x, 1280);
    }
    for (let y = 0; y <= 1280; y += 40) {
      g.moveTo(0, y);
      g.lineTo(720, y);
    }
    g.strokePath();
    g.setScrollFactor(0);
    g.setDepth(-10);

    // 标题
    this.add.text(360, 60, '车库', {
      font: 'bold 48px Orbitron',
      color: '#00ffff',
      stroke: '#000033',
      strokeThickness: 4,
    }).setOrigin(0.5).setScrollFactor(0);

    // 信用点显示
    this.add.text(360, 120, `信用点: ${this.saveData.credits.toLocaleString()}`, {
      font: '24px Orbitron',
      color: '#ffff00',
    }).setOrigin(0.5).setScrollFactor(0);
  }

  private createUI(): void {
    // 标签页按钮
    const tabs = [
      { key: 'chassis', label: '底盘', x: 150 },
      { key: 'parts', label: '配件', x: 360 },
      { key: 'chips', label: '芯片', x: 570 },
    ];

    tabs.forEach(tab => {
      const btn = this.add.rectangle(tab.x, 180, 180, 50, this.tab === tab.key ? 0x00ffff33 : 0x003333)
        .setStrokeStyle(2, this.tab === tab.key ? 0x00ffff : 0x006666)
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', () => this.switchTab(tab.key as 'chassis' | 'parts' | 'chips'));
      this.add.text(tab.x, 180, tab.label, {
        font: 'bold 20px Orbitron',
        color: this.tab === tab.key ? '#00ffff' : '#008888',
      }).setOrigin(0.5);
    });

    // 车辆预览区域
    this.createPreviewArea();

    // 列表容器
    this.createListContainer();

    // 底部按钮
    this.createBottomButtons();
  }

  private createPreviewArea(): void {
    // 预览背景
    this.add.rectangle(360, 420, 600, 300, 0x0a0a2a)
      .setStrokeStyle(2, 0x00ffff33)
      .setScrollFactor(0);

    this.add.text(360, 290, '预览', {
      font: '18px Orbitron',
      color: '#00ffff',
    }).setOrigin(0.5).setScrollFactor(0);

    // 车辆渲染容器
    this.previewContainer = this.add.container(360, 420).setScrollFactor(0);
    this.statsText = this.add.text(360, 560, '', {
      font: '16px monospace',
      color: '#88ff88',
      align: 'center',
      lineSpacing: 8,
    }).setOrigin(0.5).setScrollFactor(0);
  }

  private createListContainer(): void {
    this.listContainer = this.add.container(360, 750).setScrollFactor(0);
    this.listBg = this.add.rectangle(0, 0, 640, 400, 0x0a0a2a)
      .setStrokeStyle(1, 0x00ffff22)
      .setScrollFactor(0);
    this.listContainer.add(this.listBg);
  }

  private createBottomButtons(): void {
    // 开始任务按钮
    const startBtn = this.add.rectangle(180, 1180, 280, 70, 0x00aa00)
      .setStrokeStyle(3, 0x00ff00)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.startMission())
      .on('pointerover', () => startBtn.setFillStyle(0x00cc00))
      .on('pointerout', () => startBtn.setFillStyle(0x00aa00));
    this.add.text(180, 1180, '开始任务', {
      font: 'bold 24px Orbitron',
      color: '#ffffff',
    }).setOrigin(0.5);

    // 设置按钮
    const settingsBtn = this.add.rectangle(540, 1180, 280, 70, 0x333366)
      .setStrokeStyle(2, 0x00ffff)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.scene.start('SettingsScene'))
      .on('pointerover', () => settingsBtn.setFillStyle(0x444488))
      .on('pointerout', () => settingsBtn.setFillStyle(0x333366));
    this.add.text(540, 1180, '设置', {
      font: 'bold 24px Orbitron',
      color: '#00ffff',
    }).setOrigin(0.5);
  }

  private switchTab(tab: 'chassis' | 'parts' | 'chips'): void {
    this.tab = tab;
    this.createUI(); // 重建UI（简单粗暴但有效）
    this.updateDisplay();
  }

  private updateDisplay(): void {
    // 清空预览和列表
    this.previewContainer?.removeAll(true);
    this.listContainer?.removeAll(true);
    this.listContainer?.add(this.listBg);

    if (this.tab === 'chassis') {
      this.showChassisList();
    } else if (this.tab === 'parts') {
      this.showPartsList();
    } else {
      this.showChipsList();
    }
  }

  private showChassisList(): void {
    const chassisList = CHASSIS_SPECS.filter(c => 
      this.saveData.unlockedChassis.includes(c.id) || c.unlockCost === 0
    );

    chassisList.forEach((chassis, index) => {
      const y = (index - (chassisList.length - 1) / 2) * 90;
      const isSelected = index === this.selectedChassisIndex;
      const isUnlocked = this.saveData.unlockedChassis.includes(chassis.id);

      const item = this.add.container(0, y);
      
      const bg = this.add.rectangle(0, 0, 580, 80, isSelected ? 0x00ffff22 : 0x111133)
        .setStrokeStyle(2, isSelected ? 0x00ffff : isUnlocked ? 0x006666 : 0x333333);
      
      const nameText = this.add.text(-260, -15, chassis.name, {
        font: 'bold 20px Orbitron',
        color: isUnlocked ? '#00ffff' : '#666666',
      }).setOrigin(0, 0.5);
      
      const typeText = this.add.text(-260, 15, `${chassis.name} | ${chassis.slots.parts}P/${chassis.slots.chips}C`, {
        font: '14px monospace',
        color: '#8888aa',
      }).setOrigin(0, 0.5);

      const statsText = this.add.text(100, 0, 
        `速度:${chassis.baseStats.topSpeed} 加速:${chassis.baseStats.accel.toFixed(1)} 漂移:${chassis.baseStats.driftForce.toFixed(1)} 抓地:${chassis.baseStats.grip.toFixed(1)} 耐久:${chassis.baseStats.durability}`,
        { font: '12px monospace', color: '#88ff88' }).setOrigin(0, 0.5);

      if (!isUnlocked) {
        const lockText = this.add.text(260, 0, `解锁: ${chassis.unlockCost.toLocaleString()}¢`, {
          font: '16px Orbitron', color: '#ffaa00'
        }).setOrigin(1, 0.5);
        item.add(lockText);
      } else if (isSelected) {
        const equipText = this.add.text(260, 0, '已装备', {
          font: 'bold 16px Orbitron', color: '#00ff00'
        }).setOrigin(1, 0.5);
        item.add(equipText);
      }

      item.add([bg, nameText, typeText, statsText]);
      item.setInteractive(new Phaser.Geom.Rectangle(-290, -40, 580, 80), Phaser.Geom.Rectangle.Contains)
        .on('pointerdown', () => this.selectChassis(index, chassis.id))
        .on('pointerover', () => bg.setFillStyle(isSelected ? 0x00ffff33 : 0x112244))
        .on('pointerout', () => bg.setFillStyle(isSelected ? 0x00ffff22 : 0x111133));

      this.listContainer.add(item);
    });
  }

  private showPartsList(): void {
    const ownedParts = Object.entries(this.saveData.ownedParts);
    if (ownedParts.length === 0) {
      this.add.text(0, 0, '暂无配件\n完成任务获取', { font: '20px Orbitron', color: '#666', align: 'center' })
        .setOrigin(0.5);
      this.listContainer.add(this.add.container(0, 0).add(this.add.text(0, 0, '暂无配件\n完成任务获取', { font: '20px Orbitron', color: '#666', align: 'center' }).setOrigin(0.5)));
      return;
    }

    ownedParts.forEach(([partId, count], index) => {
      const part = PART_SPECS.find(p => p.id === partId);
      if (!part) return;
      const y = (index - (ownedParts.length - 1) / 2) * 80;
      const isEquipped = this.saveData.equipped.parts.includes(partId);

      const item = this.add.container(0, y);
      const bg = this.add.rectangle(0, 0, 580, 70, isEquipped ? 0x00aa0022 : 0x111133)
        .setStrokeStyle(2, isEquipped ? 0x00ff00 : 0x006666);
      
      const rarityColor = ['#888', '#00aaff', '#aa00ff', '#ffaa00'][['common','rare','epic','legendary'].indexOf(part.rarity)];
      const nameText = this.add.text(-260, -12, `${part.name} x${count}`, {
        font: 'bold 18px Orbitron', color: rarityColor
      }).setOrigin(0, 0.5);
      
      const descText = this.add.text(-260, 12, part.description, {
        font: '13px monospace', color: '#88ff88'
      }).setOrigin(0, 0.5);

      const equipText = this.add.text(260, 0, isEquipped ? '已装备' : '点击装备', {
        font: '16px Orbitron', color: isEquipped ? '#00ff00' : '#00ffff'
      }).setOrigin(1, 0.5);

      item.add([bg, nameText, descText, equipText]);
      item.setInteractive(new Phaser.Geom.Rectangle(-290, -35, 580, 70), Phaser.Geom.Rectangle.Contains)
        .on('pointerdown', () => this.togglePart(partId))
        .on('pointerover', () => bg.setFillStyle(isEquipped ? 0x00aa0033 : 0x112244))
        .on('pointerout', () => bg.setFillStyle(isEquipped ? 0x00aa0022 : 0x111133));

      this.listContainer.add(item);
    });
  }

  private showChipsList(): void {
    const ownedChips = Object.entries(this.saveData.ownedChips);
    if (ownedChips.length === 0) {
      this.listContainer.add(this.add.text(0, 0, '暂无芯片\n完成任务获取', { font: '20px Orbitron', color: '#666', align: 'center' }).setOrigin(0.5));
      return;
    }

    ownedChips.forEach(([chipId, count], index) => {
      const chip = CHIP_SPECS.find(c => c.id === chipId);
      if (!chip) return;
      const y = (index - (ownedChips.length - 1) / 2) * 80;
      const isEquipped = this.saveData.equipped.chips.includes(chipId);

      const item = this.add.container(0, y);
      const bg = this.add.rectangle(0, 0, 580, 70, isEquipped ? 0xaa00ff22 : 0x111133)
        .setStrokeStyle(2, isEquipped ? 0xaa00ff : 0x006666);
      
      const rarityColor = ['#888', '#00aaff', '#aa00ff', '#ffaa00'][['common','rare','epic','legendary'].indexOf(chip.rarity)];
      const triggerNames: Record<string, string> = { manual: '手动', on_hit: '受击', on_kill: '击杀', on_drift: '漂移', on_pickup: '拾取' };
      const nameText = this.add.text(-260, -12, `${chip.name} [${triggerNames[chip.trigger]}]`, {
        font: 'bold 18px Orbitron', color: rarityColor
      }).setOrigin(0, 0.5);
      
      const descText = this.add.text(-260, 12, `${chip.description} (CD: ${chip.cooldown/1000}s)`, {
        font: '13px monospace', color: '#ff88ff'
      }).setOrigin(0, 0.5);

      const equipText = this.add.text(260, 0, isEquipped ? '已装备' : '点击装备', {
        font: '16px Orbitron', color: isEquipped ? '#00ff00' : '#ff00ff'
      }).setOrigin(1, 0.5);

      item.add([bg, nameText, descText, equipText]);
      item.setInteractive(new Phaser.Geom.Rectangle(-290, -35, 580, 70), Phaser.Geom.Rectangle.Contains)
        .on('pointerdown', () => this.toggleChip(chipId))
        .on('pointerover', () => bg.setFillStyle(isEquipped ? 0xaa00ff33 : 0x112244))
        .on('pointerout', () => bg.setFillStyle(isEquipped ? 0xaa00ff22 : 0x111133));

      this.listContainer.add(item);
    });
  }

  private selectChassis(index: number, chassisId: string): void {
    this.selectedChassisIndex = index;
    this.saveData.equipped.chassis = chassisId;
    this.gameInstance.save.save(this.saveData);
    this.updatePreview();
    this.updateDisplay();
    this.gameInstance.audio.play('ui_confirm');
  }

  private togglePart(partId: string): void {
    const idx = this.saveData.equipped.parts.indexOf(partId);
    const chassis = CHASSIS_SPECS.find(c => c.id === this.saveData.equipped.chassis);
    if (!chassis) return;

    if (idx >= 0) {
      this.saveData.equipped.parts.splice(idx, 1);
    } else if (this.saveData.equipped.parts.length < chassis.slots.parts) {
      this.saveData.equipped.parts.push(partId);
    } else {
      this.gameInstance.audio.play('impact_light');
      return;
    }
    this.gameInstance.save.save(this.saveData);
    this.updatePreview();
    this.updateDisplay();
    this.gameInstance.audio.play(idx >= 0 ? 'ui_select' : 'ui_confirm');
  }

  private toggleChip(chipId: string): void {
    const idx = this.saveData.equipped.chips.indexOf(chipId);
    const chassis = CHASSIS_SPECS.find(c => c.id === this.saveData.equipped.chassis);
    if (!chassis) return;

    if (idx >= 0) {
      this.saveData.equipped.chips.splice(idx, 1);
    } else if (this.saveData.equipped.chips.length < chassis.slots.chips) {
      this.saveData.equipped.chips.push(chipId);
    } else {
      this.gameInstance.audio.play('impact_light');
      return;
    }
    this.gameInstance.save.save(this.saveData);
    this.updatePreview();
    this.updateDisplay();
    this.gameInstance.audio.play(idx >= 0 ? 'ui_select' : 'ui_confirm');
  }

  private updatePreview(): void {
    this.previewContainer?.removeAll(true);
    const chassis = CHASSIS_SPECS.find(c => c.id === this.saveData.equipped.chassis);
    if (!chassis) return;

    // 绘制车辆
    const g = this.add.graphics();
    const { width, height, color, accent, shape } = chassis.visual;
    g.fillStyle(color, 1);
    
    if (shape === 'wedge') {
      g.fillTriangle(-width/2, -height/2, width/2, 0, -width/2, height/2);
    } else if (shape === 'arrow') {
      g.fillTriangle(-width/2, -height/2, width/2, 0, -width/2, height/2);
      g.fillTriangle(width/2, 0, width/2 - 8, -6, width/2 - 8, 6);
    } else if (shape === 'box') {
      g.fillRoundedRect(-width/2, -height/2, width, height, 6);
    } else if (shape === 'round') {
      g.fillEllipse(0, 0, width, height);
    }

    // 强调色装饰
    g.fillStyle(accent, 0.8);
    g.fillRect(-width/2 + 4, -height/2 + 4, 8, height - 8);

    g.generateTexture(`preview_${chassis.id}`, width + 20, height + 20);
    this.previewContainer.add(this.add.image(0, 0, `preview_${chassis.id}`));
    g.destroy();

    // 显示属性
    const parts = this.saveData.equipped.parts.map(id => PART_SPECS.find(p => p.id === id)).filter(Boolean);
    const stats = this.computeCombinedStats(chassis, parts as any);
    
    this.statsText?.setText([
      `最高速度: ${stats.topSpeed}`,
      `加速: ${stats.accel.toFixed(1)}`,
      `漂移力: ${stats.driftForce.toFixed(1)}`,
      `抓地: ${stats.grip.toFixed(1)}`,
      `耐久: ${stats.durability}`,
      `Boost容量: ${stats.boostCap}`,
      `Boost回复: ${stats.boostRegen}/s`,
      `配件槽: ${chassis.slots.parts} | 芯片槽: ${chassis.slots.chips}`,
    ].join('   |   '));
  }

  private computeCombinedStats(chassis: any, parts: any[]): any {
    const stats = { ...chassis.baseStats };
    for (const part of parts) {
      if (part?.stats) {
        for (const [k, v] of Object.entries(part.stats)) {
          (stats as any)[k] = ((stats as any)[k] || 0) + v;
        }
      }
    }
    return stats;
  }

  private startMission(): void {
    this.gameInstance.newRun(this.gameInstance.getSave().stats.wins > 0 ? 1 : 1);
    this.scene.start('RaceScene');
    this.gameInstance.audio.play('ui_confirm');
  }

  private previewContainer!: Phaser.GameObjects.Container;
  private listContainer!: Phaser.GameObjects.Container;
  private listBg!: Phaser.GameObjects.Rectangle;
  private statsText!: Phaser.GameObjects.Text;
}