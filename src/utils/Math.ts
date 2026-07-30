export interface Vec2 { x: number; y: number }

export const Vec2 = {
  zero: (): Vec2 => ({ x: 0, y: 0 }),
  set: (x: number, y: number): Vec2 => ({ x, y }),
  copy: (v: Vec2): Vec2 => ({ x: v.x, y: v.y }),
  add: (a: Vec2, b: Vec2): Vec2 => ({ x: a.x + b.x, y: a.y + b.y }),
  sub: (a: Vec2, b: Vec2): Vec2 => ({ x: a.x - b.x, y: a.y - b.y }),
  scale: (v: Vec2, s: number): Vec2 => ({ x: v.x * s, y: v.y * s }),
  length: (v: Vec2): number => Math.hypot(v.x, v.y),
  lengthSq: (v: Vec2): number => v.x * v.x + v.y * v.y,
  normalize: (v: Vec2): Vec2 => { const l = Math.hypot(v.x, v.y); return l > 0 ? { x: v.x / l, y: v.y / l } : { x: 0, y: 0 }; },
  dot: (a: Vec2, b: Vec2): number => a.x * b.x + a.y * b.y,
  angle: (v: Vec2): number => Math.atan2(v.y, v.x),
  fromAngle: (a: number): Vec2 => ({ x: Math.cos(a), y: Math.sin(a) }),
  rotate: (v: Vec2, a: number): Vec2 => {
    const c = Math.cos(a), s = Math.sin(a);
    return { x: v.x * c - v.y * s, y: v.x * s + v.y * c };
  },
  lerp: (a: Vec2, b: Vec2, t: number): Vec2 => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t }),
  dist: (a: Vec2, b: Vec2): number => Math.hypot(a.x - b.x, a.y - b.y),
  clamp: (v: Vec2, max: number): Vec2 => { const l = Math.hypot(v.x, v.y); return l > max ? Vec2.scale(Vec2.normalize(v), max) : v; },
};

export class SeededRNG {
  private seed: number;
  constructor(seed: number = Date.now()) { this.seed = seed >>> 0; }
  next(): number { this.seed = (this.seed * 1664525 + 1013904223) >>> 0; return (this.seed >>> 0) / 0x100000000; }
  nextInt(max: number): number { return Math.floor(this.next() * max); }
  nextFloat(min = 0, max = 1): number { return min + this.next() * (max - min); }
  nextBool(p = 0.5): boolean { return this.next() < p; }
  choice<T>(arr: readonly T[]): T { 
    const index = this.nextInt(arr.length);
    return arr[index]!; 
  }
  weightedChoice<T>(items: readonly { weight: number; value: T }[]): T {
    const total = items.reduce((s, i) => s + i.weight, 0);
    let r = this.next() * total;
    for (const item of items) { if ((r -= item.weight) <= 0) return item.value; }
    return items[0]!.value;
  }
  shuffle<T>(arr: readonly T[]): T[] { 
    const a = [...arr]; 
    for (let i = a.length - 1; i > 0; i--) { 
      const j = this.nextInt(i + 1); 
      [a[i], a[j]] = [a[j]!, a[i]!]; 
    } 
    return a; 
  }
  getSeed(): number { return this.seed; }
  setSeed(seed: number) { this.seed = seed >>> 0; }
}