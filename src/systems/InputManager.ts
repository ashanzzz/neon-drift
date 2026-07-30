export interface InputState {
  steer: number;
  throttle: number;
  brake: number;
  handbrake: boolean;
  boost: boolean;
  weapon: boolean;
  pause: boolean;
}

export class InputManager {
  private state: InputState = this.emptyState();
  private virtualJoystick: { active: boolean; start: { x: number; y: number }; current: { x: number; y: number } } = { active: false, start: { x: 0, y: 0 }, current: { x: 0, y: 0 } };
  private canvas: HTMLCanvasElement;
  private touchIdentifier: number | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.setupTouch();
    this.setupKeyboard();
    this.setupGamepad();
    this.createMobileUI();
  }

  private emptyState(): InputState {
    return { steer: 0, throttle: 0, brake: 0, handbrake: false, boost: false, weapon: false, pause: false };
  }

  private setupTouch(): void {
    this.canvas.addEventListener('touchstart', (e) => this.onTouchStart(e), { passive: false });
    this.canvas.addEventListener('touchmove', (e) => this.onTouchMove(e), { passive: false });
    this.canvas.addEventListener('touchend', (e) => this.onTouchEnd(e), { passive: false });
    this.canvas.addEventListener('touchcancel', (e) => this.onTouchEnd(e), { passive: false });
  }

  private onTouchStart(e: TouchEvent): void {
    e.preventDefault();
    const touch = e.changedTouches[0];
    if (!touch) return;
    const rect = this.canvas.getBoundingClientRect();
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;
    const w = rect.width, h = rect.height;

    // 左半屏 = 虚拟摇杆
    if (x < w * 0.5) {
      this.virtualJoystick = { active: true, start: { x, y }, current: { x, y } };
      this.touchIdentifier = touch.identifier;
    } else {
      // 右半屏分区：上=手刹/漂移，中=氮气，下=武器
      if (y < h * 0.33) this.state.handbrake = true;
      else if (y < h * 0.66) this.state.boost = true;
      else this.state.weapon = true;
    }
  }

  private onTouchMove(e: TouchEvent): void {
    e.preventDefault();
    if (!this.virtualJoystick.active) return;
    
    const touch = Array.from(e.changedTouches).find(t => t.identifier === this.touchIdentifier);
    if (!touch) return;

    const rect = this.canvas.getBoundingClientRect();
    this.virtualJoystick.current = { x: touch.clientX - rect.left, y: touch.clientY - rect.top };
    
    const dx = this.virtualJoystick.current.x - this.virtualJoystick.start.x;
    const dy = this.virtualJoystick.current.y - this.virtualJoystick.start.y;
    const maxR = Math.min(rect.width, rect.height) * 0.25;
    const dist = Math.min(Math.hypot(dx, dy), maxR);
    const angle = Math.atan2(dy, dx);
    
    this.state.steer = Math.cos(angle) * (dist / maxR);
    this.state.throttle = Math.max(0, -Math.sin(angle)) * (dist / maxR);
    this.state.brake = Math.max(0, Math.sin(angle)) * (dist / maxR);
  }

  private onTouchEnd(e: TouchEvent): void {
    e.preventDefault();
    const hasOurTouch = Array.from(e.changedTouches).some(t => t.identifier === this.touchIdentifier);
    if (hasOurTouch || this.virtualJoystick.active) {
      this.virtualJoystick.active = false;
      this.touchIdentifier = null;
      this.state.steer = 0;
      this.state.throttle = 0;
      this.state.brake = 0;
    }
    // 右半屏按钮释放
    this.state.handbrake = false;
    this.state.boost = false;
    this.state.weapon = false;
  }

  private setupKeyboard(): void {
    window.addEventListener('keydown', (e) => this.onKey(e, true));
    window.addEventListener('keyup', (e) => this.onKey(e, false));
  }

  private onKey(e: KeyboardEvent, down: boolean): void {
    if (e.repeat) return;
    switch (e.code) {
      case 'ArrowLeft': this.state.steer = down ? -1 : 0; break;
      case 'ArrowRight': this.state.steer = down ? 1 : 0; break;
      case 'ArrowUp': this.state.throttle = down ? 1 : 0; break;
      case 'ArrowDown': this.state.brake = down ? 1 : 0; break;
      case 'Space': this.state.handbrake = down; break;
      case 'ShiftLeft': case 'ShiftRight': this.state.boost = down; break;
      case 'ControlLeft': case 'ControlRight': this.state.weapon = down; break;
      case 'Escape': this.state.pause = down; break;
      case 'KeyW': this.state.throttle = down ? 1 : 0; break;
      case 'KeyS': this.state.brake = down ? 1 : 0; break;
      case 'KeyA': this.state.steer = down ? -1 : 0; break;
      case 'KeyD': this.state.steer = down ? 1 : 0; break;
    }
  }

  private setupGamepad(): void {
    window.addEventListener('gamepadconnected', () => {});
    window.addEventListener('gamepaddisconnected', () => {});
  }

  private createMobileUI(): void {
    if (window.innerWidth > 768) return; // 桌面端不显示
    
    const style = document.createElement('style');
    style.textContent = `
      .mobile-btn { position: fixed; width: 60px; height: 60px; border-radius: 50%; background: rgba(0,255,255,0.2); border: 2px solid #00ffff; color: #00ffff; font-size: 20px; display: flex; align-items: center; justify-content: center; user-select: none; touch-action: none; z-index: 100; backdrop-filter: blur(8px); box-shadow: 0 0 15px rgba(0,255,255,0.3); transition: transform 0.05s, background 0.1s; }
      .mobile-btn:active { background: rgba(0,255,255,0.5); transform: scale(0.95); }
      .mobile-btn.boost { background: rgba(255,0,255,0.2); border-color: #ff00ff; color: #ff00ff; box-shadow: 0 0 15px rgba(255,0,255,0.3); }
      .mobile-btn.weapon { background: rgba(255,255,0,0.2); border-color: #ffff00; color: #ffff00; box-shadow: 0 0 15px rgba(255,255,0,0.3); }
      .joystick-hint { position: fixed; left: 20px; bottom: 20px; color: rgba(0,255,255,0.5); font-family: monospace; font-size: 12px; pointer-events: none; z-index: 50; }
    `;
    document.head.appendChild(style);

    const hint = document.createElement('div');
    hint.className = 'joystick-hint';
    hint.textContent = '← 左侧滑动控制转向/油门/刹车';
    document.body.appendChild(hint);

    const btnHandbrake = document.createElement('button');
    btnHandbrake.className = 'mobile-btn';
    btnHandbrake.style.right = '20px'; btnHandbrake.style.top = '20px';
    btnHandbrake.textContent = '↻';
    btnHandbrake.title = '手刹/漂移';
    this.bindTouchButton(btnHandbrake, 'handbrake');
    document.body.appendChild(btnHandbrake);

    const btnBoost = document.createElement('button');
    btnBoost.className = 'mobile-btn boost';
    btnBoost.style.right = '20px'; btnBoost.style.top = '90px';
    btnBoost.textContent = '⚡';
    btnBoost.title = '氮气加速';
    this.bindTouchButton(btnBoost, 'boost');
    document.body.appendChild(btnBoost);

    const btnWeapon = document.createElement('button');
    btnWeapon.className = 'mobile-btn weapon';
    btnWeapon.style.right = '20px'; btnWeapon.style.top = '160px';
    btnWeapon.textContent = '💥';
    btnWeapon.title = '武器/技能';
    this.bindTouchButton(btnWeapon, 'weapon');
    document.body.appendChild(btnWeapon);
  }

  private bindTouchButton(btn: HTMLButtonElement, action: 'handbrake' | 'boost' | 'weapon'): void {
    const start = (e: TouchEvent | MouseEvent) => { e.preventDefault(); (this.state as any)[action] = true; };
    const end = (e: TouchEvent | MouseEvent) => { e.preventDefault(); (this.state as any)[action] = false; };
    btn.addEventListener('touchstart', start, { passive: false });
    btn.addEventListener('touchend', end, { passive: false });
    btn.addEventListener('touchcancel', end, { passive: false });
    btn.addEventListener('mousedown', start);
    btn.addEventListener('mouseup', end);
    btn.addEventListener('mouseleave', end);
  }

  update(): void {
    // 游戏手柄轮询
    const gp = navigator.getGamepads()[0];
    if (gp) {
      this.state.steer = gp.axes[0] || 0;
      this.state.throttle = Math.max(0, (gp.axes[5] || 0) * 0.5 + 0.5); // RT
      this.state.brake = Math.max(0, (gp.axes[2] || 0) * 0.5 + 0.5); // LT
      this.state.handbrake = gp.buttons[1]?.pressed || false; // B
      this.state.boost = gp.buttons[7]?.pressed || false; // RB
      this.state.weapon = gp.buttons[2]?.pressed || false; // X
      this.state.pause = gp.buttons[9]?.pressed || false; // Start
    }
  }

  getState(): Readonly<InputState> {
    return this.state;
  }

  getVirtualJoystick(): { active: boolean; x: number; y: number } {
    if (!this.virtualJoystick.active) return { active: false, x: 0, y: 0 };
    const dx = this.virtualJoystick.current.x - this.virtualJoystick.start.x;
    const dy = this.virtualJoystick.current.y - this.virtualJoystick.start.y;
    const maxR = Math.min(this.canvas.width, this.canvas.height) * 0.25;
    const dist = Math.min(Math.hypot(dx, dy), maxR);
    return { active: true, x: dx / maxR, y: dy / maxR };
  }
}