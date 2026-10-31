import { Vector3, WebGLRenderer } from 'three';
import type { Flow, FlowNode } from '../data/flows';
import { FlowScene } from './flow';
import type { ThemeColors } from './theme';

type Entry = {
  slot: HTMLElement;
  scene: FlowScene;
  labels: Map<string, HTMLElement>;
  overlay: HTMLElement;
  visible: boolean;
};

const tmp = new Vector3();

/**
 * One renderer for every case-study scene. The canvas covers the viewport, sits above
 * the page with pointer events off, and each visible scene is drawn into its slot's
 * rectangle with scissor. Labels are HTML in a fixed overlay so they stay crisp.
 */
export class Stage {
  private renderer: WebGLRenderer;
  private overlayRoot: HTMLElement;
  private entries: Entry[] = [];
  private raf = 0;
  private running = false;
  private last = 0;
  private io: IntersectionObserver;

  constructor(private readonly colors: ThemeColors) {
    this.renderer = new WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.autoClear = false;
    const canvas = this.renderer.domElement;
    canvas.className = 'stage-canvas';
    canvas.setAttribute('aria-hidden', 'true');
    document.body.appendChild(canvas);

    this.overlayRoot = document.createElement('div');
    this.overlayRoot.className = 'stage-overlay';
    this.overlayRoot.setAttribute('aria-hidden', 'true');
    document.body.appendChild(this.overlayRoot);

    this.io = new IntersectionObserver(
      (records) => {
        for (const r of records) {
          const entry = this.entries.find((e) => e.slot === r.target);
          if (entry) {
            entry.visible = r.isIntersecting;
            entry.overlay.style.display = r.isIntersecting ? '' : 'none';
          }
        }
        this.syncRunning();
      },
      { rootMargin: '80px 0px' },
    );

    this.resize();
    window.addEventListener('resize', () => this.resize(), { passive: true });
    document.addEventListener('visibilitychange', () => this.syncRunning());
  }

  private resize() {
    this.renderer.setSize(window.innerWidth, window.innerHeight, false);
  }

  add(
    slot: HTMLElement,
    flow: Flow,
    hooks: { onStep: (i: number, n: FlowNode, wait?: string) => void; onHover: (n: FlowNode | null) => void },
  ) {
    const scene = new FlowScene(flow, this.colors, hooks);
    const overlay = document.createElement('div');
    overlay.className = 'stage-labels';
    this.overlayRoot.appendChild(overlay);
    const labels = new Map<string, HTMLElement>();
    for (const node of flow.nodes) {
      const el = document.createElement('span');
      el.className = `stage-label stage-label-${node.kind}`;
      el.textContent = node.label;
      overlay.appendChild(el);
      labels.set(node.id, el);
    }
    const entry: Entry = { slot, scene, labels, overlay, visible: false };
    this.entries.push(entry);
    this.wirePointer(entry);
    this.io.observe(slot);
    slot.classList.add('is-3d');
    return scene;
  }

  private wirePointer(entry: Entry) {
    const { slot, scene } = entry;
    let down = false;
    let moved = false;
    let lastX = 0;
    let lastY = 0;
    const ndc = (e: PointerEvent) => {
      const r = slot.getBoundingClientRect();
      return { x: ((e.clientX - r.left) / r.width) * 2 - 1, y: -(((e.clientY - r.top) / r.height) * 2 - 1) };
    };
    slot.addEventListener('pointermove', (e) => {
      const p = ndc(e);
      scene.setPointer(p.x, p.y, true);
      if (down) {
        const dx = e.clientX - lastX;
        const dy = e.clientY - lastY;
        if (Math.abs(dx) + Math.abs(dy) > 2) moved = true;
        scene.drag(dx, dy);
        lastX = e.clientX;
        lastY = e.clientY;
      }
    });
    slot.addEventListener('pointerleave', () => {
      scene.setPointer(0, 0, false);
    });
    slot.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return;
      down = true;
      moved = false;
      lastX = e.clientX;
      lastY = e.clientY;
      slot.setPointerCapture(e.pointerId);
      scene.beginDrag();
      slot.classList.add('is-dragging');
    });
    const release = (e: PointerEvent) => {
      if (!down) return;
      down = false;
      scene.endDrag();
      slot.classList.remove('is-dragging');
      if (slot.hasPointerCapture(e.pointerId)) slot.releasePointerCapture(e.pointerId);
      if (!moved) {
        // A click pins (or unpins) the hovered node so its description stays up.
        const id = scene.hoveredId;
        scene.pin(id && scene.pinnedId !== id ? id : null);
        slot.dispatchEvent(new CustomEvent('flow:pin', { detail: scene.pinnedId }));
      }
    };
    slot.addEventListener('pointerup', release);
    slot.addEventListener('pointercancel', release);
  }

  private syncRunning() {
    const shouldRun = !document.hidden && this.entries.some((e) => e.visible);
    if (shouldRun && !this.running) {
      this.running = true;
      this.last = performance.now();
      this.raf = requestAnimationFrame(this.frame);
    } else if (!shouldRun && this.running) {
      this.running = false;
      cancelAnimationFrame(this.raf);
      this.renderer.setScissorTest(false);
      this.renderer.clear();
    }
  }

  private frame = (now: number) => {
    if (!this.running) return;
    this.raf = requestAnimationFrame(this.frame);
    const dt = Math.min((now - this.last) / 1000, 0.05);
    this.last = now;

    const vh = window.innerHeight;
    const vw = window.innerWidth;
    this.renderer.setScissorTest(false);
    this.renderer.clear();

    for (const entry of this.entries) {
      if (!entry.visible) continue;
      const rect = entry.slot.getBoundingClientRect();
      if (rect.bottom < 0 || rect.top > vh || rect.right < 0 || rect.left > vw) {
        entry.overlay.style.display = 'none';
        continue;
      }
      entry.overlay.style.display = '';
      const w = Math.round(rect.width);
      const h = Math.round(rect.height);
      entry.scene.resize(w, h);
      entry.scene.update(dt);

      this.renderer.setViewport(rect.left, vh - rect.bottom, w, h);
      this.renderer.setScissor(rect.left, vh - rect.bottom, w, h);
      this.renderer.setScissorTest(true);
      entry.scene.render(this.renderer);

      const active = entry.scene.hoveredId ?? entry.scene.pinnedId;
      for (const [id, el] of entry.labels) {
        const p = entry.scene.project(id, tmp);
        if (!p) continue;
        const isActive = id === active;
        // Keep the label inside the figure horizontally so edge nodes stay readable.
        const half = el.offsetWidth / 2 + 6;
        const x = rect.left + Math.min(Math.max(p.x * w, half), w - half);
        const y = rect.top + p.y * h;
        const inside = p.y > 0.03 && p.y < 0.97;
        // Orbiting nodes only show their label when hovered or pinned, to avoid a pile-up.
        const visible = inside && (!p.orbit || isActive);
        el.style.opacity = visible ? '' : '0';
        el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) translate(-50%, ${p.below ? '0%' : '-100%'})`;
        el.classList.toggle('is-active', isActive);
      }
    }
  };
}
