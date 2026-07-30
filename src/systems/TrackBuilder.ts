import { SeededRNG, Vec2 } from '@/utils/Math';
import { TrackData, TrackSegment, Decoration, Hazard, DifficultyTier } from '@/data/tables';

type SegmentType = 'straight' | 'curve' | 'chicane' | 'hairpin' | 'jump';

interface SegmentTemplate {
  type: SegmentType;
  minLen: number;
  maxLen: number;
  curvature: number | (() => number);
}

export class TrackBuilder {
  static build(seed: number, difficulty: DifficultyTier): TrackData {
    const rng = new SeededRNG(seed);
    const segments: TrackSegment[] = [];
    let pos = { x: 0, y: 0 };
    let angle = 0;
    const totalLength = 3000 + difficulty.trackComplexity * 7000;
    let accumulated = 0;

    interface WeightedTemplate {
  weight: number;
  value: SegmentTemplate;
}

    const segmentTemplates: WeightedTemplate[] = [
      { weight: 30, value: { type: 'straight', minLen: 200, maxLen: 800, curvature: 0 } },
      { weight: 25, value: { type: 'curve', minLen: 150, maxLen: 500, curvature: () => rng.nextFloat() * 0.02 + 0.005 } },
      { weight: 15 * difficulty.trackComplexity, value: { type: 'chicane', minLen: 300, maxLen: 600, curvature: () => rng.nextFloat() * 0.03 + 0.01 } },
      { weight: 10 * difficulty.trackComplexity, value: { type: 'hairpin', minLen: 200, maxLen: 400, curvature: 0.045 } },
      { weight: 5 * difficulty.trackComplexity, value: { type: 'jump', minLen: 100, maxLen: 300, curvature: 0 } },
    ];

    while (accumulated < totalLength) {
      const choice = rng.weightedChoice(segmentTemplates) as SegmentTemplate;
      const tpl = choice;
      const len = rng.nextInt(tpl.maxLen - tpl.minLen) + tpl.minLen;
      const curvature = typeof tpl.curvature === 'function' ? tpl.curvature() : tpl.curvature || 0;
      const dir = rng.nextBool() ? 1 : -1;

      segments.push({
        type: tpl.type,
        length: len,
        curvature: curvature * dir,
        banking: curvature * dir * 0.5,
        hazards: this.generateHazards(tpl.type, difficulty.hazardDensity, rng),
      });

      angle += curvature * dir * len;
      pos.x += Math.cos(angle) * len;
      pos.y += Math.sin(angle) * len;
      accumulated += len;
    }

    // 闭合赛道
    const closingAngle = -angle;
    const closingDist = Math.hypot(pos.x, pos.y);
    if (closingDist > 200) {
      segments.push({
        type: 'curve',
        length: closingDist,
        curvature: closingAngle / closingDist,
        banking: 0,
        hazards: [],
      });
    }

    return this.finalizeTrack(segments, rng);
  }

  private static generateHazards(segmentType: string, density: number, rng: SeededRNG): Hazard[] {
    const hazards: Hazard[] = [];
    const count = Math.floor(density * 3 + rng.nextFloat() * 2);
    const types: Hazard['type'][] = ['oil', 'debris', 'barrier', 'ramp', 'mine'];
    
    for (let i = 0; i < count; i++) {
      hazards.push({
        type: rng.choice(types),
        position: rng.nextFloat(),
        severity: 0.3 + rng.nextFloat() * 0.7,
      });
    }
    return hazards;
  }

  private static finalizeTrack(segments: TrackSegment[], rng: SeededRNG): TrackData {
    const checkpoints: Vec2[] = [];
    const decorations: Decoration[] = [];
    let pos = { x: 0, y: 0 };
    let angle = 0;
    let totalDist = 0;
    const trackWidth = 120;

    const leftBoundary: Vec2[] = [];
    const rightBoundary: Vec2[] = [];

    for (const seg of segments) {
      const steps = Math.ceil(seg.length / 20);
      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const dist = seg.length * t;
        const segAngle = angle + seg.curvature * dist;
        const x = pos.x + Math.cos(segAngle) * dist;
        const y = pos.y + Math.sin(segAngle) * dist;
        
        const nx = -Math.sin(segAngle);
        const ny = Math.cos(segAngle);
        
        leftBoundary.push({ x: x + nx * trackWidth / 2, y: y + ny * trackWidth / 2 });
        rightBoundary.push({ x: x - nx * trackWidth / 2, y: y - ny * trackWidth / 2 });

        if (totalDist + dist > checkpoints.length * 800) {
          checkpoints.push({ x, y });
        }
      }

      // 装饰物
      if (rng.nextBool(0.3)) {
        const decCount = 2 + rng.nextInt(4);
        for (let i = 0; i < decCount; i++) {
          const side = rng.nextBool() ? 1 : -1;
          const offset = trackWidth / 2 + 50 + rng.nextFloat() * 200;
          const decAngle = angle + (rng.nextFloat() - 0.5) * 0.5;
          decorations.push({
            type: rng.choice(['building', 'neon', 'billboard', 'lamp', 'fence'] as Decoration['type'][]),
            position: { x: pos.x + Math.cos(decAngle) * offset, y: pos.y + Math.sin(decAngle) * offset },
            rotation: decAngle + Math.PI / 2 * side,
            scale: 0.8 + rng.nextFloat() * 0.6,
            color: rng.choice([0x00ffff, 0xff00ff, 0xffff00, 0xff8800, 0x00ff88, 0x8800ff]),
          });
        }
      }

      angle += seg.curvature * seg.length;
      pos.x += Math.cos(angle) * seg.length;
      pos.y += Math.sin(angle) * seg.length;
      totalDist += seg.length;
    }

    // 计算边界
    const allPoints = [...leftBoundary, ...rightBoundary.reverse()];
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const p of allPoints) {
      minX = Math.min(minX, p.x);
      minY = Math.min(minY, p.y);
      maxX = Math.max(maxX, p.x);
      maxY = Math.max(maxY, p.y);
    }

    // 确保起点也是终点
    if (checkpoints.length > 0) {
      checkpoints[0] = { x: 0, y: 0 };
    }

    return {
      segments,
      width: trackWidth,
      checkpoints,
      decorations,
      bounds: { min: { x: minX - 200, y: minY - 200 }, max: { x: maxX + 200, y: maxY + 200 } },
    };
  }

  static bakeCollisionMesh(scene: Phaser.Scene, track: TrackData): Phaser.GameObjects.RenderTexture {
    const { bounds } = track;
    const width = bounds.max.x - bounds.min.x;
    const height = bounds.max.y - bounds.min.y;
    
    const rt = scene.add.renderTexture(bounds.min.x, bounds.min.y, width, height);
    const g = scene.add.graphics();

    // 赛道沥青底色
    g.fillStyle(0x1a1a2e, 1);
    this.drawTrackPolygon(g, track, track.width, bounds.min);
    
    // 赛道边线
    g.lineStyle(4, 0x00ffff, 0.8);
    this.drawCenterLine(g, track, bounds.min);
    
    // 红白路肩
    g.lineStyle(2, 0xff0000, 0.6);
    this.drawCurbs(g, track, bounds.min);

    rt.draw(g);
    g.destroy();
    return rt;
  }

  private static drawTrackPolygon(g: Phaser.GameObjects.Graphics, track: TrackData, width: number, offset: Vec2): void {
    const points: Vec2[] = [];
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
        points.push({ x: x + nx * width / 2 - offset.x, y: y + ny * width / 2 - offset.y });
      }
      angle += seg.curvature * seg.length;
      pos.x += Math.cos(angle) * seg.length;
      pos.y += Math.sin(angle) * seg.length;
    }

    // 右边界反向
    const rightPoints: Vec2[] = [];
    pos = { x: 0, y: 0 };
    angle = 0;
    for (const seg of track.segments) {
      const steps = Math.ceil(seg.length / 20);
      const segPoints: Vec2[] = [];
      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const dist = seg.length * t;
        const segAngle = angle + seg.curvature * dist;
        const x = pos.x + Math.cos(segAngle) * dist;
        const y = pos.y + Math.sin(segAngle) * dist;
        
        const nx = -Math.sin(segAngle);
        const ny = Math.cos(segAngle);
        segPoints.push({ x: x - nx * width / 2 - offset.x, y: y - ny * width / 2 - offset.y });
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
      g.moveTo(points[0].x!, points[0].y!);
      for (let i = 1; i < points.length; i++) {
        const p = points[i];
        if (p) g.lineTo(p.x, p.y);
      }
      g.closePath();
      g.fillPath();
    }
  }

  private static drawCenterLine(g: Phaser.GameObjects.Graphics, track: TrackData, offset: Vec2): void {
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

  private static drawCurbs(g: Phaser.GameObjects.Graphics, track: TrackData, offset: Vec2): void {
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
}