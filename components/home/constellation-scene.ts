import {
  BufferAttribute,
  BufferGeometry,
  Color,
  Group,
  LineBasicMaterial,
  LineSegments,
  NormalBlending,
  PerspectiveCamera,
  Points,
  Scene,
  ShaderMaterial,
  WebGLRenderer,
} from 'three';
import type { MapLayout } from '@/lib/constellation';

// Loaded with import() from KnowledgeMap only, so three.js never lands in the
// main bundle. Renders on demand: frames run while the canvas is on screen, the
// tab is visible and something is moving (a slow drift that settles after
// IDLE_MS, pointer parallax, the pulse on the current lesson). Otherwise the
// last frame simply stays on the canvas.

const MAX_DPR = 1.75;
const IDLE_MS = 14_000;

const vertex = /* glsl */ `
  attribute float aSize;
  attribute float aLit;
  attribute float aPulse;
  attribute vec3 aColor;
  uniform float uTime;
  uniform float uDpr;
  varying vec3 vColor;
  varying float vLit;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    float pulse = 1.0 + aPulse * 0.35 * (0.5 + 0.5 * sin(uTime * 2.4));
    gl_PointSize = aSize * pulse * uDpr * (9.0 / -mv.z);
    gl_Position = projectionMatrix * mv;
    vColor = aColor;
    vLit = aLit;
  }
`;

const fragment = /* glsl */ `
  varying vec3 vColor;
  varying float vLit;
  void main() {
    float d = length(gl_PointCoord - 0.5) * 2.0;
    float core = 1.0 - smoothstep(0.34, 0.44, d);
    float halo = (1.0 - smoothstep(0.4, 1.0, d)) * 0.28 * vLit;
    vec3 unlit = mix(vec3(0.80, 0.78, 0.74), vColor, 0.4);
    vec3 col = mix(unlit, vColor, vLit);
    float a = max(core * mix(0.6, 1.0, vLit), halo);
    if (a < 0.01) discard;
    gl_FragColor = vec4(col, a);
  }
`;

export interface SceneHandle {
  update(layout: MapLayout): void;
  dispose(): void;
}

function cssColor(el: Element, name: string): Color {
  const v = getComputedStyle(el).getPropertyValue(name).trim();
  return new Color(v || '#6c7cf7');
}

export function createScene(canvas: HTMLCanvasElement, layout: MapLayout): SceneHandle {
  const renderer = new WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'low-power' });
  renderer.setClearColor(0x000000, 0);
  const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
  renderer.setPixelRatio(dpr);

  const scene = new Scene();
  const camera = new PerspectiveCamera(38, 1, 0.1, 100);
  const group = new Group();
  scene.add(group);

  const lineColor = cssColor(document.documentElement, '--line-strong');
  const accents = new Map<string, Color>();
  const accent = (key: string) => {
    let c = accents.get(key);
    if (!c) {
      c = cssColor(document.documentElement, `--acc-${key}`);
      accents.set(key, c);
    }
    return c;
  };

  const uniforms = { uTime: { value: 0 }, uDpr: { value: dpr } };
  const starMat = new ShaderMaterial({
    vertexShader: vertex,
    fragmentShader: fragment,
    uniforms,
    transparent: true,
    depthWrite: false,
    blending: NormalBlending,
  });
  const lineMat = new LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.55, depthWrite: false });

  let starGeo = new BufferGeometry();
  let lineGeo = new BufferGeometry();
  const stars = new Points(starGeo, starMat);
  const lines = new LineSegments(lineGeo, lineMat);
  group.add(lines, stars);

  function build(l: MapLayout) {
    const n = l.stars.length;
    const pos = new Float32Array(n * 3);
    const col = new Float32Array(n * 3);
    const size = new Float32Array(n);
    const lit = new Float32Array(n);
    const pulse = new Float32Array(n);
    l.stars.forEach((s, i) => {
      pos.set([s.x, s.y, s.z], i * 3);
      const c = accent(s.accent);
      col.set([c.r, c.g, c.b], i * 3);
      size[i] = s.current ? 40 : s.read ? 28 : 18;
      lit[i] = s.read || s.current ? 1 : 0;
      pulse[i] = s.current ? 1 : 0;
    });
    const nextStar = new BufferGeometry();
    nextStar.setAttribute('position', new BufferAttribute(pos, 3));
    nextStar.setAttribute('aColor', new BufferAttribute(col, 3));
    nextStar.setAttribute('aSize', new BufferAttribute(size, 1));
    nextStar.setAttribute('aLit', new BufferAttribute(lit, 1));
    nextStar.setAttribute('aPulse', new BufferAttribute(pulse, 1));

    const lp = new Float32Array(l.links.length * 6);
    const lc = new Float32Array(l.links.length * 6);
    l.links.forEach(([a, b], i) => {
      const sa = l.stars[a];
      const sb = l.stars[b];
      if (!sa || !sb) return;
      lp.set([sa.x, sa.y, sa.z, sb.x, sb.y, sb.z], i * 6);
      // A link lights up once both lessons on it are read.
      const c = sa.read && sb.read ? accent(sa.accent) : lineColor;
      lc.set([c.r, c.g, c.b, c.r, c.g, c.b], i * 6);
    });
    const nextLine = new BufferGeometry();
    nextLine.setAttribute('position', new BufferAttribute(lp, 3));
    nextLine.setAttribute('color', new BufferAttribute(lc, 3));

    starGeo.dispose();
    lineGeo.dispose();
    starGeo = nextStar;
    lineGeo = nextLine;
    stars.geometry = starGeo;
    lines.geometry = lineGeo;
  }
  build(layout);

  // Pointer parallax, eased toward the target each frame.
  const target = { x: 0, y: 0 };
  const tilt = { x: 0, y: 0 };
  const onPointer = (e: PointerEvent) => {
    const r = canvas.getBoundingClientRect();
    target.x = ((e.clientX - r.left) / r.width - 0.5) * 2;
    target.y = ((e.clientY - r.top) / r.height - 0.5) * 2;
    activeUntil = performance.now() + IDLE_MS;
    wake();
  };
  const onLeave = () => {
    target.x = 0;
    target.y = 0;
  };
  canvas.addEventListener('pointermove', onPointer);
  canvas.addEventListener('pointerleave', onLeave);

  function resize() {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (w === 0 || h === 0) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    // Keep the whole map in frame on narrow (portrait) screens.
    camera.position.set(0, 0, Math.max(9.4, 15.5 / camera.aspect));
    camera.updateProjectionMatrix();
    renderer.render(scene, camera);
  }

  // Animation time only advances while frames run, so resuming never jumps.
  let t = 0;
  let last = 0;
  let activeUntil = performance.now() + IDLE_MS;
  function render(now: number) {
    if (last) t += Math.min(now - last, 50) / 1000;
    last = now;
    uniforms.uTime.value = t;
    tilt.x += (target.x - tilt.x) * 0.06;
    tilt.y += (target.y - tilt.y) * 0.06;
    group.rotation.y = Math.sin(t * 0.12) * 0.22 + tilt.x * 0.28;
    group.rotation.x = -0.12 + tilt.y * 0.16;
    renderer.render(scene, camera);
  }

  let raf = 0;
  let onScreen = true;
  const running = () => onScreen && document.visibilityState === 'visible';
  const moving = (now: number) =>
    now < activeUntil || Math.abs(target.x - tilt.x) + Math.abs(target.y - tilt.y) > 0.002;
  function loop(now: number) {
    render(now);
    if (running() && moving(now)) {
      raf = requestAnimationFrame(loop);
    } else {
      raf = 0;
      last = 0;
    }
  }
  function wake() {
    if (!raf && running()) raf = requestAnimationFrame(loop);
  }

  const ro = new ResizeObserver(resize);
  ro.observe(canvas);
  const io = new IntersectionObserver((entries) => {
    onScreen = entries.some((e) => e.isIntersecting);
    wake();
  });
  io.observe(canvas);
  const onVisibility = () => wake();
  document.addEventListener('visibilitychange', onVisibility);
  resize();
  wake();

  return {
    update(next) {
      build(next);
      renderer.render(scene, camera);
      wake();
    },
    dispose() {
      cancelAnimationFrame(raf);
      raf = 0;
      ro.disconnect();
      io.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
      canvas.removeEventListener('pointermove', onPointer);
      canvas.removeEventListener('pointerleave', onLeave);
      starGeo.dispose();
      lineGeo.dispose();
      starMat.dispose();
      lineMat.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
    },
  };
}
