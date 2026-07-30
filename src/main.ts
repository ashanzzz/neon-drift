import 'phaser';
import { Game } from '@/game/Game';
import { BootScene } from '@/scenes/BootScene';
import { GarageScene } from '@/scenes/GarageScene';
import { RaceScene } from '@/scenes/RaceScene';
import { ResultScene } from '@/scenes/ResultScene';
import { SettingsScene } from '@/scenes/SettingsScene';

const gameConfig: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: 720,
  height: 1280,
  parent: 'game',
  backgroundColor: '#0a0a1a',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: 720,
    height: 1280,
  },
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 0 },
      debug: false,
      fps: 60,
    },
  },
  render: {
    pixelArt: false,
    antialias: true,
    antialiasGL: true,
    desynchronized: false,
    roundPixels: false,
  },
  fps: {
    target: 60,
    forceSetTimeOut: false,
    smoothStep: true,
  },
  dom: {
    createContainer: true,
  },
  audio: {
    disableWebAudio: false,
    noAudio: false,
  },
  scene: [BootScene, GarageScene, RaceScene, ResultScene, SettingsScene],
  callbacks: {
    postBoot: () => {
      // 全局游戏实例
      (window as any).game = new Game();
    },
  },
};

const game = new Phaser.Game(gameConfig);

// 防止页面卸载时音频上下文挂起
window.addEventListener('beforeunload', () => {
  (window as any).game?.audio?.dispose?.();
});

// 处理可见性变化
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    (window as any).game?.pause?.();
  } else {
    (window as any).game?.resume?.();
    (window as any).game?.audio?.resume?.();
  }
});