import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Group,
  LineBasicMaterial,
  LineSegments,
  PerspectiveCamera,
  Points,
  PointsMaterial,
  Scene,
  Sprite,
  SpriteMaterial,
  WebGLRenderer,
} from 'three';
import { getHaloTexture, type ThemeColors } from './theme';

const COUNT = 170;
const LINK_DISTANCE = 1.15;
const RADIUS = 2.7;

/**
 * Hero background: a slowly turning particle network that leans toward the cursor.
 * Has its own small renderer because it sits behind the hero text rather than on top
 * of the page like the case-study scenes.
 */
export function startHero(slot: HTMLElement, colors: ThemeColors) {
  const renderer = new WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
  renderer.setClearColor(0x000000, 0);
  renderer.domElement.style.width = '100%';
  renderer.domElement.style.height = '100%';
  slot.appendChild(renderer.domElement);

  const scene = new Scene();
  const camera = new PerspectiveCamera(40, 1, 0.1, 50);
  camera.position.z = 8;
  const group = new Group();
  scene.add(group);

  // Particles: a base position plus a per-particle drift phase.
  const base = new Float32Array(COUNT * 3);
  const phase = new Float32Array(COUNT * 3);
  const positions = new Float32Array(COUNT * 3);
  for (let i = 0; i < COUNT; i++) {
    // Uniform-ish distribution in a sphere, slightly flattened.
    const u = Math.random();
    const v = Math.random();
    const theta = 2 * Math.PI * u;
    const phi = Math.acos(2 * v - 1);
    const r = RADIUS * Math.cbrt(Math.random());
    base[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    base[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta) * 0.85;
    base[i * 3 + 2] = r * Math.cos(phi) * 0.7;
    phase[i * 3] = Math.random() * Math.PI * 2;
    phase[i * 3 + 1] = Math.random() * Math.PI * 2;
    phase[i * 3 + 2] = Math.random() * Math.PI * 2;
  }
  const pointGeo = new BufferGeometry();
  pointGeo.setAttribute('position', new BufferAttribute(positions, 3));
  const points = new Points(
    pointGeo,
    new PointsMaterial({ color: colors.glow, size: 0.055, transparent: true, opacity: 0.9, depthWrite: false, sizeAttenuation: true }),
  );
  group.add(points);

  // Links between neighbours, decided once from the base positions.
  const pairs: number[] = [];
  for (let i = 0; i < COUNT; i++)
    for (let j = i + 1; j < COUNT; j++) {
      const dx = base[i * 3]! - base[j * 3]!;
      const dy = base[i * 3 + 1]! - base[j * 3 + 1]!;
      const dz = base[i * 3 + 2]! - base[j * 3 + 2]!;
      if (dx * dx + dy * dy + dz * dz < LINK_DISTANCE * LINK_DISTANCE) pairs.push(i, j);
    }
  const linePositions = new Float32Array(pairs.length * 3);
  const lineGeo = new BufferGeometry();
  lineGeo.setAttribute('position', new BufferAttribute(linePositions, 3));
  const lines = new LineSegments(lineGeo, new LineBasicMaterial({ color: colors.link, transparent: true, opacity: 0.28, depthWrite: false }));
  group.add(lines);

  // A few bright "hub" glows for depth.
  const haloTex = getHaloTexture();
  for (let i = 0; i < 6; i++) {
    const s = new Sprite(new SpriteMaterial({ map: haloTex, color: i % 2 ? colors.link : colors.glow, transparent: true, opacity: 0.35, blending: AdditiveBlending, depthWrite: false }));
    const k = Math.floor(Math.random() * COUNT) * 3;
    s.position.set(base[k]!, base[k + 1]!, base[k + 2]!);
    s.scale.setScalar(0.9 + Math.random() * 0.6);
    s.userData.index = k;
    group.add(s);
  }

  let targetX = 0;
  let targetY = 0;
  let width = 1;
  let height = 1;
  let running = false;
  let raf = 0;
  let last = performance.now();
  let time = 0;

  const resize = () => {
    const rect = slot.getBoundingClientRect();
    width = Math.max(1, Math.round(rect.width));
    height = Math.max(1, Math.round(rect.height));
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    // Sit the network to the right of the headline on wide screens, centred and faint on narrow ones.
    const wide = width > 820;
    group.position.x = wide ? 2.4 : 0;
    group.position.y = wide ? 0.2 : 1.2;
    group.scale.setScalar(wide ? 1 : 0.75);
    (points.material as PointsMaterial).opacity = wide ? 0.9 : 0.5;
    (lines.material as LineBasicMaterial).opacity = wide ? 0.28 : 0.16;
  };

  const onPointer = (e: PointerEvent) => {
    targetX = (e.clientX / window.innerWidth) * 2 - 1;
    targetY = (e.clientY / window.innerHeight) * 2 - 1;
  };
  const fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  if (fine) window.addEventListener('pointermove', onPointer, { passive: true });

  const frame = (now: number) => {
    if (!running) return;
    raf = requestAnimationFrame(frame);
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    time += dt;

    for (let i = 0; i < COUNT; i++) {
      positions[i * 3] = base[i * 3]! + Math.sin(time * 0.5 + phase[i * 3]!) * 0.08;
      positions[i * 3 + 1] = base[i * 3 + 1]! + Math.sin(time * 0.45 + phase[i * 3 + 1]!) * 0.08;
      positions[i * 3 + 2] = base[i * 3 + 2]! + Math.sin(time * 0.4 + phase[i * 3 + 2]!) * 0.08;
    }
    (pointGeo.getAttribute('position') as BufferAttribute).needsUpdate = true;
    for (let p = 0; p < pairs.length; p += 2) {
      const i = pairs[p]! * 3;
      const j = pairs[p + 1]! * 3;
      const o = p * 3;
      linePositions[o] = positions[i]!;
      linePositions[o + 1] = positions[i + 1]!;
      linePositions[o + 2] = positions[i + 2]!;
      linePositions[o + 3] = positions[j]!;
      linePositions[o + 4] = positions[j + 1]!;
      linePositions[o + 5] = positions[j + 2]!;
    }
    (lineGeo.getAttribute('position') as BufferAttribute).needsUpdate = true;
    for (const child of group.children) {
      if (child instanceof Sprite) {
        const k = child.userData.index as number;
        child.position.set(positions[k]!, positions[k + 1]!, positions[k + 2]!);
      }
    }

    group.rotation.y += dt * 0.06;
    group.rotation.y += (targetX * 0.25 - (group.rotation.y % (Math.PI * 2)) * 0) * 0.0;
    group.rotation.x += (targetY * 0.18 - group.rotation.x) * 0.04;
    group.rotation.z += (targetX * -0.08 - group.rotation.z) * 0.04;

    renderer.render(scene, camera);
  };

  const start = () => {
    if (running) return;
    running = true;
    last = performance.now();
    resize();
    raf = requestAnimationFrame(frame);
  };
  const stop = () => {
    running = false;
    cancelAnimationFrame(raf);
  };

  const io = new IntersectionObserver((entries) => (entries[0]?.isIntersecting ? start() : stop()), { threshold: 0.05 });
  io.observe(slot);
  window.addEventListener('resize', resize);
  document.addEventListener('visibilitychange', () => (document.hidden ? stop() : start()));
  slot.classList.add('is-3d');
}
