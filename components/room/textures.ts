import { CanvasTexture, SRGBColorSpace, type Texture } from 'three';
import type { BookStyle } from '@/lib/subject-style';

// Procedural canvas textures: no image files to download, crisp at any DPR the
// scene allows. Text drawn here is short Latin codes only (OS, OODS…), set large.

function canvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');
  if (!ctx) throw new Error('2d context unavailable');
  return [c, ctx];
}

function finish(c: HTMLCanvasElement, anisotropy = 4): Texture {
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  t.anisotropy = anisotropy;
  return t;
}

function motif(ctx: CanvasRenderingContext2D, kind: BookStyle['motif'], w: number, h: number) {
  ctx.save();
  ctx.strokeStyle = 'rgba(255,255,255,0.55)';
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.lineWidth = 5;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  const ox = w * 0.5;
  const oy = h * 0.6;
  switch (kind) {
    case 'circuit': {
      // A chip with traces running out of it.
      ctx.strokeRect(ox - 70, oy - 70, 140, 140);
      ctx.strokeRect(ox - 34, oy - 34, 68, 68);
      for (let i = -2; i <= 2; i++) {
        const d = i * 26;
        ctx.beginPath();
        ctx.moveTo(ox + d, oy - 70);
        ctx.lineTo(ox + d, oy - 120 - Math.abs(i) * 18);
        ctx.lineTo(ox + d + 40 * Math.sign(i || 1), oy - 150 - Math.abs(i) * 18);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(ox + d, oy + 70);
        ctx.lineTo(ox + d, oy + 130);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(ox + d, oy + 138, 7, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }
    case 'tree': {
      // A small binary tree.
      const nodes: [number, number][] = [
        [0, -120], [-90, -30], [90, -30], [-135, 60], [-45, 60], [45, 60], [135, 60],
      ];
      const edges = [[0, 1], [0, 2], [1, 3], [1, 4], [2, 5], [2, 6]] as const;
      for (const [a, b] of edges) {
        const na = nodes[a]!;
        const nb = nodes[b]!;
        ctx.beginPath();
        ctx.moveTo(ox + na[0], oy + na[1]);
        ctx.lineTo(ox + nb[0], oy + nb[1]);
        ctx.stroke();
      }
      for (const [x, y] of nodes) {
        ctx.beginPath();
        ctx.arc(ox + x, oy + y, 18, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }
    case 'network': {
      const pts: [number, number][] = [
        [-130, -90], [20, -140], [140, -60], [-60, 10], [90, 60], [-140, 110], [10, 140],
      ];
      const links = [[0, 1], [1, 2], [0, 3], [1, 3], [2, 4], [3, 4], [3, 5], [4, 6], [5, 6]] as const;
      for (const [a, b] of links) {
        const pa = pts[a]!;
        const pb = pts[b]!;
        ctx.beginPath();
        ctx.moveTo(ox + pa[0], oy + pa[1]);
        ctx.lineTo(ox + pb[0], oy + pb[1]);
        ctx.stroke();
      }
      for (const [x, y] of pts) {
        ctx.beginPath();
        ctx.arc(ox + x, oy + y, 14, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }
    case 'brackets': {
      ctx.lineWidth = 14;
      ctx.beginPath();
      ctx.moveTo(ox - 60, oy - 90);
      ctx.lineTo(ox - 140, oy);
      ctx.lineTo(ox - 60, oy + 90);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(ox + 60, oy - 90);
      ctx.lineTo(ox + 140, oy);
      ctx.lineTo(ox + 60, oy + 90);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(ox + 30, oy - 110);
      ctx.lineTo(ox - 30, oy + 110);
      ctx.stroke();
      break;
    }
    case 'chart': {
      const bars = [70, 130, 95, 175, 140];
      bars.forEach((bh, i) => {
        const x = ox - 150 + i * 62;
        ctx.beginPath();
        ctx.roundRect(x, oy + 110 - bh, 40, bh, 8);
        ctx.fill();
      });
      ctx.beginPath();
      ctx.moveTo(ox - 150, oy - 60);
      ctx.lineTo(ox - 60, oy - 100);
      ctx.lineTo(ox + 20, oy - 70);
      ctx.lineTo(ox + 150, oy - 150);
      ctx.stroke();
      break;
    }
  }
  ctx.restore();
}

/** Book cover: the subject's gradient, a soft sheen, its motif and its course code. */
export function coverTexture(style: BookStyle, code: string, short: string): Texture {
  const W = 512;
  const H = 700;
  const [c, ctx] = canvas(W, H);
  const g = ctx.createLinearGradient(0, 0, W, H);
  g.addColorStop(0, style.from);
  g.addColorStop(1, style.to);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  const sheen = ctx.createRadialGradient(W * 0.2, H * 0.1, 10, W * 0.2, H * 0.1, W * 0.9);
  sheen.addColorStop(0, 'rgba(255,255,255,0.45)');
  sheen.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = sheen;
  ctx.fillRect(0, 0, W, H);

  motif(ctx, style.motif, W, H);

  // Spine band on the left edge.
  ctx.fillStyle = 'rgba(41,38,74,0.10)';
  ctx.fillRect(0, 0, 34, H);

  ctx.fillStyle = '#29264a';
  ctx.font = '700 104px ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif';
  ctx.textBaseline = 'top';
  ctx.fillText(code, 64, 52);
  ctx.font = '600 34px ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif';
  ctx.fillStyle = 'rgba(41,38,74,0.78)';
  const words = short.split(' ');
  let line = '';
  let y = 172;
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (ctx.measureText(next).width > W - 120 && line) {
      ctx.fillText(line, 64, y);
      line = word;
      y += 44;
    } else {
      line = next;
    }
  }
  ctx.fillText(line, 64, y);
  return finish(c, 8);
}

/** Window view: sky gradient, a soft sun and two clouds. */
export function skyTexture(): Texture {
  const [c, ctx] = canvas(256, 320);
  const g = ctx.createLinearGradient(0, 0, 0, 320);
  g.addColorStop(0, '#83d5ff');
  g.addColorStop(0.75, '#d9f1ff');
  g.addColorStop(1, '#fff3df');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 256, 320);
  const sun = ctx.createRadialGradient(180, 80, 4, 180, 80, 70);
  sun.addColorStop(0, 'rgba(255,248,214,1)');
  sun.addColorStop(0.35, 'rgba(255,229,143,0.9)');
  sun.addColorStop(1, 'rgba(255,229,143,0)');
  ctx.fillStyle = sun;
  ctx.fillRect(0, 0, 256, 320);
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  for (const [x, y, s] of [
    [60, 150, 1],
    [150, 220, 0.8],
  ] as const) {
    ctx.beginPath();
    ctx.ellipse(x, y, 34 * s, 14 * s, 0, 0, Math.PI * 2);
    ctx.ellipse(x + 22 * s, y - 10 * s, 24 * s, 16 * s, 0, 0, Math.PI * 2);
    ctx.ellipse(x - 20 * s, y - 4 * s, 18 * s, 12 * s, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  return finish(c);
}

/** Light wood planks for the floor. */
export function floorTexture(): Texture {
  const [c, ctx] = canvas(512, 512);
  ctx.fillStyle = '#f4dcc0';
  ctx.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 8; i++) {
    ctx.fillStyle = i % 2 ? 'rgba(214,170,128,0.16)' : 'rgba(255,255,255,0.14)';
    ctx.fillRect(0, i * 64, 512, 64);
    ctx.fillStyle = 'rgba(176,128,86,0.28)';
    ctx.fillRect(0, i * 64, 512, 2);
    const off = (i * 197) % 512;
    ctx.fillRect(off, i * 64, 2, 64);
  }
  return finish(c);
}

/** Warm light patch the window throws on the floor. */
export function sunPatchTexture(): Texture {
  const [c, ctx] = canvas(256, 256);
  const g = ctx.createRadialGradient(128, 128, 10, 128, 128, 128);
  g.addColorStop(0, 'rgba(255,236,170,0.75)');
  g.addColorStop(1, 'rgba(255,236,170,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 256, 256);
  return finish(c);
}
