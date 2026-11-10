import Phaser from 'phaser';
import type { Level, State, Trace, Point, Car } from '../core/model';
import { exits } from '../core/validation';
import { carSVG, homeSVG, svgURL } from './art';
import { boardPoints, boundsOverlap, nodeBounds } from './layout';
export class BoardScene extends Phaser.Scene {
  private pendingTextures = new Set<string>();
  private level?: Level;
  private cssWidth = 1;
  private cssHeight = 1;
  private density = 1;
  private redrawQueued = false;
  setDisplay(width: number, height: number, density: number) {
    this.cssWidth = width;
    this.cssHeight = height;
    this.density = density;
    this.queueRedraw();
  }
  private queueRedraw() {
    if (this.redrawQueued) return;
    this.redrawQueued = true;
    requestAnimationFrame(() => {
      this.redrawQueued = false;
      this.redraw();
    });
  }
  private label(
    x: number,
    y: number,
    text: string,
    style: Phaser.Types.GameObjects.Text.TextStyle,
  ) {
    return this.add.text(x, y, text, { ...style, resolution: this.density });
  }
  diagnostics() {
    const pointer = this.input.activePointer;
    const world = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
    return {
      css: [this.cssWidth, this.cssHeight],
      density: this.density,
      camera: {
        zoom: this.cameras.main.zoom,
        width: this.cameras.main.width,
        height: this.cameras.main.height,
      },
      pointer: { x: world.x, y: world.y },
      texts: [...this.signs.values()].map((t) => ({
        resolution: t.style.resolution,
        size: t.style.fontSize,
      })),
      textures: this.textures
        .getTextureKeys()
        .filter((k) => k.startsWith('house-') || k.startsWith('car-'))
        .map((k) => ({
          key: k,
          width: this.textures.get(k).getSourceImage().width,
          height: this.textures.get(k).getSourceImage().height,
        })),
    };
  }
  private mismatch?: { actual: string; wanted: string };
  private state?: State;
  private points = new Map<string, Point>();
  private decor?: Phaser.GameObjects.Container;
  private roads?: Phaser.GameObjects.Graphics;
  private objects?: Phaser.GameObjects.Container;
  private overlay?: Phaser.GameObjects.Graphics;
  private moving?: Phaser.GameObjects.Container;
  private signs = new Map<string, Phaser.GameObjects.Text>();
  private signArrows = new Map<string, Phaser.GameObjects.Graphics>();
  private shown: Record<string, string> = {};
  private activeTrace?: Trace[];
  private progress = 0;
  private cursor = 0;
  private lastSign = -1;
  private car?: Car;
  private complete?: () => void;
  private frozen = false;
  private speed = 1;
  private onSign?: () => void;
  private path?: Trace[];
  constructor() {
    super('town');
  }
  create() {
    this.scale.on('resize', this.queueRedraw, this);
    this.game.canvas.setAttribute(
      'aria-label',
      'Town map. Roads connect entry docks, memory signs and matching homes.',
    );
    this.game.canvas.setAttribute('role', 'img');
    this.events.once('shutdown', () => this.scale.off('resize', this.queueRedraw, this));
  }
  setBoard(level: Level, state: State, mismatch?: { actual: string; wanted: string }) {
    this.mismatch = mismatch;
    this.level = level;
    this.state = state;
    this.shown = { ...state.switchStates };
    this.path = undefined;
    this.activeTrace = undefined;
    this.complete = undefined;
    this.moving?.destroy(true);
    this.moving = undefined;
    this.redraw();
  }
  setPreview(trace?: Trace[]) {
    this.path = trace;
    this.drawPreview();
  }
  private point(id: string): Point {
    return this.points.get(id) ?? { x: 0, y: 0 };
  }
  private size() {
    return this.cssWidth < 600
      ? Math.max(30, Math.min(36, this.cssWidth * 0.095))
      : Math.max(30, Math.min(40, this.cssHeight * 0.22));
  }
  redraw() {
    if (!this.sys.isActive() || !this.level) return;
    const w = this.cssWidth,
      h = this.cssHeight;
    const physicalW = this.scale.width,
      physicalH = this.scale.height;
    // Camera matrix maps logical CSS coordinates to backing pixels. Compensation
    // keeps worldView at (0,0), including native Phaser pointer unprojection.
    this.cameras.main
      .setViewport(0, 0, physicalW, physicalH)
      .setZoom(this.density)
      .setScroll(
        (w - physicalW) / 2 + (Math.round(physicalW / 2) - physicalW / 2) / this.density,
        (h - physicalH) / 2 + (Math.round(physicalH / 2) - physicalH / 2) / this.density,
      );
    this.game.canvas.dataset.renderDensity = String(this.density);
    this.game.canvas.dataset.logicalWidth = String(w);
    this.game.canvas.dataset.logicalHeight = String(h);
    const s = this.size();
    this.points = boardPoints(this.level, w, h, s);
    this.decor?.destroy(true);
    this.roads?.destroy();
    this.objects?.destroy(true);
    this.overlay?.destroy();
    this.signs.clear();
    this.signArrows.clear();
    this.decor = this.add.container(0, 0);
    this.roads = this.add.graphics();
    this.objects = this.add.container(0, 0);
    this.overlay = this.add.graphics();
    const g = this.add.graphics();
    this.decor.add(g);
    const rng = new Phaser.Math.RandomDataGenerator([this.level.id]);
    for (let i = 0; i < (w < 600 ? 12 : 24); i++) {
      const x = rng.between(15, w - 15),
        y = rng.between(22, h - 30);
      if ([...this.points.values()].some((p) => Math.hypot(p.x - x, p.y - y) < 65)) continue;
      const col = i % 3 === 0 ? 0xb4b891 : 0x9eb498;
      g.fillStyle(0x527953, 0.1).fillEllipse(x + 3, y + 13, 24, 9);
      g.fillStyle(0x9b8566).fillRoundedRect(x - 2, y, 4, 14, 2);
      g.fillStyle(col)
        .fillCircle(x, y - 5, 10)
        .fillCircle(x - 6, y, 7)
        .fillCircle(x + 7, y + 1, 7);
    }
    for (const n of this.level.nodes)
      for (const to of exits(n)) {
        const a = this.point(n.id),
          b = this.point(to);
        this.roads.lineStyle(s * 0.57 + 8, 0xfaf7ec, 1).lineBetween(a.x, a.y + 2, b.x, b.y + 2);
        this.roads.lineStyle(s * 0.57 + 3, 0x536858, 1).lineBetween(a.x, a.y, b.x, b.y);
        this.roads.lineStyle(s * 0.57, 0x7b897a, 1).lineBetween(a.x, a.y, b.x, b.y);
        const len = Math.hypot(b.x - a.x, b.y - a.y);
        for (let d = s * 0.7; d < len - s; d += 22) {
          const t = d / len,
            t2 = Math.min((d + 7) / len, 1);
          this.roads
            .lineStyle(2, 0xfff8e4, 0.92)
            .lineBetween(
              a.x + (b.x - a.x) * t,
              a.y + (b.y - a.y) * t,
              a.x + (b.x - a.x) * t2,
              a.y + (b.y - a.y) * t2,
            );
        }
      }
    const portBounds: ReturnType<typeof nodeBounds>[] = [];
    for (const n of this.level.nodes) {
      const p = this.point(n.id);
      if (n.kind === 'home') {
        if (this.mismatch && (n.id === this.mismatch.actual || n.id === this.mismatch.wanted)) {
          const actual = n.id === this.mismatch.actual;
          this.objects.add(
            this.add
              .graphics()
              .lineStyle(3, actual ? 0xc47761 : 0x6e9474)
              .strokeCircle(p.x, p.y, s * 0.92),
          );
          this.objects.add(
            this.label(p.x + s * 0.7, p.y - s * 0.85, actual ? '×' : '◎', {
              fontFamily: 'Arial',
              fontSize: Math.max(20, s * 0.65) + 'px',
              fontStyle: 'bold',
              color: actual ? '#b56d57' : '#6e9474',
            }).setOrigin(0.5),
          );
        }

        const key = `house-${n.color}-${n.symbol}@${this.density}`;
        this.texture(key, homeSVG(n.color, n.symbol));
        if (this.textures.exists(key)) {
          const house = this.add.image(p.x, p.y - s * 0.18, key).setDisplaySize(s * 1.6, s * 1.68);
          this.objects.add(house);
        }
        const badgeX = p.x + s * 0.23,
          badgeY = p.y + s * 0.3;
        this.objects.add(
          this.add
            .graphics()
            .fillStyle(0xfffae9)
            .fillCircle(badgeX, badgeY, Math.max(13, s * 0.31)),
        );
        this.objects.add(
          this.label(badgeX, badgeY, n.symbol, {
            fontFamily: 'Arial',
            fontStyle: 'bold',
            fontSize: Math.max(18, s * 0.46) + 'px',
            color: '#304e40',
          }).setOrigin(0.5),
        );
        const delivered =
          this.state?.deliveredCarIds.filter(
            (id) => this.level!.cars.find((c) => c.id === id)?.destinationId === n.id,
          ).length ?? 0;
        if (delivered)
          this.objects.add(
            this.label(p.x + s * 0.5, p.y - s * 0.8, '✓', {
              fontSize: String(Math.max(16, s * 0.5)) + 'px',
              fontFamily: 'Arial',
              color: '#284e43',
              backgroundColor: '#fff8df',
              padding: { x: 3, y: 1 },
            }).setOrigin(0.5),
          );
      } else if (n.kind === 'entry') {
        const bg = this.add
          .graphics()
          .fillStyle(0xfaf6e8)
          .fillRoundedRect(p.x - s * 0.55, p.y - s * 0.4, s * 1.1, s * 0.8, 6)
          .lineStyle(2, 0xadb6a0)
          .strokeRoundedRect(p.x - s * 0.55, p.y - s * 0.4, s * 1.1, s * 0.8, 6);
        this.objects.add(bg);
        const label = this.label(
          p.x,
          p.y,
          this.level.nodes.filter((v) => v.kind === 'entry').length > 1
            ? n.id.replace('E', '')
            : this.entryArrow(p, this.point(n.next)),
          {
            fontFamily: 'Arial',
            fontSize: String(Math.max(16, s * 0.5)) + 'px',
            fontStyle: 'bold',
            color: '#526a56',
          },
        ).setOrigin(0.5);
        this.objects.add(label);
      } else {
        const bg = this.add
          .graphics()
          .fillStyle(0x314f43, 0.12)
          .fillRoundedRect(p.x - s * 0.7 + 2, p.y - s * 0.53 + 5, s * 1.4, s * 1.06, 10)
          .fillStyle(0xfffbee)
          .fillRoundedRect(p.x - s * 0.7, p.y - s * 0.53, s * 1.4, s * 1.06, 10)
          .lineStyle(2, 0x83947c)
          .strokeRoundedRect(p.x - s * 0.7, p.y - s * 0.53, s * 1.4, s * 1.06, 10);
        this.objects.add(bg);
        const label = this.label(p.x + this.size() * 0.33, p.y, this.shown[n.id], {
          fontFamily: 'Arial',
          fontSize: String(Math.max(20, s * 0.61)) + 'px',
          fontStyle: 'bold',
          color: '#203f32',
        }).setOrigin(0.5);
        this.signs.set(n.id, label);
        this.objects.add(label);
        const arrow = this.add.graphics();
        this.signArrows.set(n.id, arrow);
        this.objects.add(arrow);
        this.updateSign(n.id, this.shown[n.id]);
        for (const direction of ['L', 'R'] as const) {
          const b = this.point(n[direction]),
            dx = b.x - p.x,
            dy = b.y - p.y,
            len = Math.hypot(dx, dy),
            dist = Math.min(len * 0.5, s * 1.4);
          const port = [dist / len, 0.5, 0.4, 0.6, 0.3, 0.7]
            .map((t) => ({ x: p.x + dx * t, y: p.y + dy * t }))
            .find((candidate) => {
              const box = {
                left: candidate.x - 10,
                right: candidate.x + 10,
                top: candidate.y - 10,
                bottom: candidate.y + 10,
              };
              return (
                !this.level!.nodes.some((node) =>
                  boundsOverlap(box, nodeBounds(node, this.point(node.id), s), 2),
                ) && !portBounds.some((other) => boundsOverlap(box, other, 2))
              );
            });
          // The large sign already identifies its active exit. Omit a duplicate
          // small L/R marker when a short road has no clear space for it.
          if (!port) continue;
          const { x, y } = port;
          portBounds.push({ left: x - 10, right: x + 10, top: y - 10, bottom: y + 10 });
          const dot = this.add.graphics().fillStyle(0xfbf7e8).fillCircle(x, y, 10);
          const text = this.label(x, y, direction, {
            fontFamily: 'Arial',
            fontStyle: 'bold',
            fontSize: String(Math.max(14, s * 0.35)) + 'px',
            color: '#46594a',
          }).setOrigin(0.5);
          this.objects.add([dot, text]);
        }
      }
    }
    if (this.activeTrace && this.car) this.makeMoving(this.car);
    this.drawPreview();
    this.positionMoving();
  }
  private texture(key: string, svg: string) {
    if (!this.textures.exists(key) && !this.pendingTextures.has(key)) {
      this.pendingTextures.add(key);
      const image = new Image();
      image.onload = () => {
        this.pendingTextures.delete(key);
        if (!this.textures.exists(key)) this.textures.addImage(key, image);
        if (this.sys.isActive()) this.queueRedraw();
      };
      // Size the SVG raster for the largest displayed sprite at this density.
      const width = Number(svg.match(/width="(\d+)"/)?.[1] ?? 200);
      const height = Number(svg.match(/height="(\d+)"/)?.[1] ?? 200);
      const factor = Math.max(1, Math.ceil((96 * this.density) / width));
      image.src = svgURL(
        svg
          .replace(`width="${width}"`, `width="${width * factor}"`)
          .replace(`height="${height}"`, `height="${height * factor}"`),
      );
    }
  }
  private entryArrow(start: Point, end: Point) {
    return Math.abs(end.x - start.x) > Math.abs(end.y - start.y)
      ? end.x > start.x
        ? '→'
        : '←'
      : end.y > start.y
        ? '↓'
        : '↑';
  }
  private updateSign(id: string, value: string, highlight = false) {
    const node = this.level?.nodes.find((n) => n.id === id);
    if (node?.kind !== 'switch') return;
    const p = this.point(id),
      end = this.point(value === 'L' ? node.L : node.R);
    const angle = Math.atan2(end.y - p.y, end.x - p.x),
      cos = Math.cos(angle),
      sin = Math.sin(angle);
    const center = { x: p.x - this.size() * 0.32, y: p.y },
      half = 10;
    const tip = { x: center.x + cos * half, y: center.y + sin * half };
    const back = { x: tip.x - cos * 8, y: tip.y - sin * 8 };
    const g = this.signArrows.get(id);
    g?.clear();
    g?.lineStyle(3, highlight ? 0x865d1b : 0x203f32, 1)
      .lineBetween(center.x - cos * half, center.y - sin * half, tip.x, tip.y)
      .lineBetween(back.x - sin * 6, back.y + cos * 6, tip.x, tip.y)
      .lineBetween(back.x + sin * 6, back.y - cos * 6, tip.x, tip.y);
    this.signs
      .get(id)
      ?.setText(value)
      .setColor(highlight ? '#865d1b' : '#203f32');
  }
  private drawPreview() {
    this.overlay?.clear();
    if (!this.path) return;
    this.overlay?.lineStyle(7, 0xe2b958, 0.8);
    for (let i = 1; i < this.path.length; i++) {
      const a = this.point(this.path[i - 1].nodeId),
        b = this.point(this.path[i].nodeId);
      this.overlay?.lineBetween(a.x, a.y, b.x, b.y);
    }
  }
  animate(car: Car, trace: Trace[], fast: boolean, onSign: () => void, complete: () => void) {
    this.car = car;
    this.activeTrace = trace;
    this.path = undefined;
    this.drawPreview();
    this.cursor = 0;
    this.progress = 0;
    this.lastSign = -1;
    this.speed = fast ? 4 : 1;
    this.onSign = onSign;
    this.complete = complete;
    this.makeMoving(car);
  }
  private makeMoving(car: Car) {
    this.moving?.destroy(true);
    const home = this.level!.nodes.find((n) => n.id === car.destinationId);
    const color = home?.kind === 'home' ? home.color : '#ed806d';
    const symbol = home?.kind === 'home' ? home.symbol : '●';
    const key = `car-${color}-${car.imprint}-${symbol}@${this.density}`;
    this.texture(key, carSVG(color, car.imprint, symbol));
    const s = this.size();
    const image = this.textures.exists(key)
      ? this.add.image(0, 0, key).setDisplaySize(s * 1.9, s * 1.235)
      : this.add
          .graphics()
          .fillStyle(Phaser.Display.Color.HexStringToColor(color).color)
          .fillRoundedRect(-s * 0.7, -s * 0.3, s * 1.4, s * 0.6, 8);
    this.moving = this.add.container(0, 0, [image]);
    this.moving.setDepth(100);
    this.positionMoving();
  }
  private positionMoving() {
    if (!this.activeTrace || !this.moving) return;
    const a = this.point(this.activeTrace[this.cursor].nodeId),
      b = this.point(
        this.activeTrace[Math.min(this.cursor + 1, this.activeTrace.length - 1)].nodeId,
      );
    const t = Math.min(1, this.progress / 0.65);
    const ease = t * t * (3 - 2 * t);
    this.moving.setPosition(a.x + (b.x - a.x) * ease, a.y + (b.y - a.y) * ease);
    const angle = Math.atan2(b.y - a.y, b.x - a.x);
    this.moving.setRotation(Math.cos(angle) < 0 ? angle + Math.PI : angle);
  }
  freeze(value: boolean) {
    this.frozen = value;
  }
  update(_time: number, delta: number) {
    if (this.frozen || !this.activeTrace) return;
    const trace = this.activeTrace;
    this.progress += (Math.min(delta, 100) / 1000) * this.speed;
    this.positionMoving();
    if (this.progress >= 0.65) {
      const next = trace[this.cursor + 1];
      if (next?.previousSign && this.lastSign !== this.cursor) {
        this.lastSign = this.cursor;
        this.onSign?.();
        this.updateSign(next.nodeId, next.previousSign, true);
      }
      if (this.progress >= 0.95 && next?.newSign) {
        this.shown[next.nodeId] = next.newSign;
        this.updateSign(next.nodeId, next.newSign);
      }
      if (this.progress >= 1.16) {
        this.progress = 0;
        this.cursor++;
        if (this.cursor >= trace.length - 1) {
          const done = this.complete;
          this.activeTrace = undefined;
          this.complete = undefined;
          this.moving?.destroy(true);
          this.moving = undefined;
          done?.();
        }
      }
    }
  }
}
