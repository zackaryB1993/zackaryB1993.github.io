import {
  AdditiveBlending,
  BoxGeometry,
  BufferAttribute,
  BufferGeometry,
  DodecahedronGeometry,
  DoubleSide,
  EdgesGeometry,
  Group,
  IcosahedronGeometry,
  Line,
  LineBasicMaterial,
  LineDashedMaterial,
  LineSegments,
  Mesh,
  MeshBasicMaterial,
  Object3D,
  PerspectiveCamera,
  Points,
  PointsMaterial,
  QuadraticBezierCurve3,
  Raycaster,
  RingGeometry,
  Scene,
  SphereGeometry,
  Sprite,
  SpriteMaterial,
  TorusGeometry,
  TubeGeometry,
  Vector2,
  Vector3,
  type Color,
  type WebGLRenderer,
} from 'three';
import type { Flow, FlowNode, NodeKind, RouteStep } from '../data/flows';
import { getHaloTexture, type ThemeColors } from './theme';

const LEG_SECONDS = 1.15;
const END_PAUSE = 0.9;
const ORBIT_RADIUS = 1.7;

type NodeView = {
  node: FlowNode;
  root: Group;
  shell: Object3D;
  core: Mesh;
  halo: Sprite;
  hit: Mesh;
  scale: number;
  orbitAngle: number;
  orbitLine?: Line;
};

type EdgeView = {
  curve: QuadraticBezierCurve3;
  object: Object3D;
  material: LineBasicMaterial | MeshBasicMaterial;
  baseOpacity: number;
  from: string;
  to: string;
};

type Packet = {
  route: RouteStep[];
  mesh: Mesh;
  halo: Sprite;
  leg: number;
  t: number;
  waiting: number;
  pause: number;
  primary: boolean;
};

type Pulse = { mesh: Mesh; age: number; life: number };

export type FlowEvents = {
  /** The primary packet reached a step (index into routes[0]). */
  onStep: (index: number, node: FlowNode, waitLabel?: string) => void;
  /** Hovered node changed. */
  onHover: (node: FlowNode | null) => void;
};

/**
 * One animated architecture diagram: nodes, edges, packets travelling the routes,
 * hover highlighting, and drag-to-rotate. The stage owns the renderer and the
 * HTML labels; this class only owns Three.js objects.
 */
export class FlowScene {
  readonly scene = new Scene();
  readonly camera = new PerspectiveCamera(36, 1, 0.1, 60);
  readonly group = new Group();
  readonly nodes = new Map<string, NodeView>();
  private edges = new Map<string, EdgeView>();
  private packets: Packet[] = [];
  private pulses: Pulse[] = [];
  private raycaster = new Raycaster();
  private pointer = new Vector2(0, 0);
  private pointerInside = false;
  private hovered: NodeView | null = null;
  private pinned: NodeView | null = null;
  private rotY = 0;
  private rotYTarget = 0;
  private rotX = 0;
  private rotXTarget = 0;
  private dragging = false;
  private time = 0;
  private width = 1;
  private height = 1;
  private lattice?: Points;
  private readonly hitMeshes: Mesh[] = [];
  private readonly ringGeometry = new RingGeometry(0.3, 0.36, 48);
  private readonly packetGeometry = new SphereGeometry(0.09, 16, 16);

  constructor(
    readonly flow: Flow,
    private readonly colors: ThemeColors,
    private readonly events: FlowEvents,
  ) {
    this.scene.add(this.group);
    this.camera.position.set(0, 0.5, 14);
    this.camera.lookAt(0, 0, 0);
    this.buildNodes();
    this.buildEdges();
    this.buildPackets();
    if (flow.lattice) this.buildLattice();
  }

  /* ---------- construction ---------- */

  private colorFor(kind: NodeKind): Color {
    const c = this.colors;
    switch (kind) {
      case 'source':
      case 'sink':
      case 'gate':
        return c.glow;
      case 'service':
        return c.link;
      case 'external':
      case 'store':
      default:
        return c.muted;
    }
  }

  private shellFor(kind: NodeKind, color: Color): Object3D {
    const mat = new LineBasicMaterial({ color, transparent: true, opacity: 0.75 });
    switch (kind) {
      case 'gate':
        return new Mesh(new TorusGeometry(0.32, 0.035, 10, 48), new MeshBasicMaterial({ color, transparent: true, opacity: 0.9 }));
      case 'store':
        return new LineSegments(new EdgesGeometry(new BoxGeometry(0.5, 0.5, 0.5)), mat);
      case 'external':
        return new LineSegments(new EdgesGeometry(new DodecahedronGeometry(0.33)), mat);
      case 'source':
      case 'sink':
        return new LineSegments(new EdgesGeometry(new IcosahedronGeometry(0.34, 0)), mat);
      case 'service':
      default:
        return new LineSegments(new EdgesGeometry(new IcosahedronGeometry(0.36, 1)), mat);
    }
  }

  private buildNodes() {
    const halo = getHaloTexture();
    const coreGeo = new SphereGeometry(0.13, 16, 16);
    const hitGeo = new SphereGeometry(0.55, 8, 8);
    const hitMat = new MeshBasicMaterial({ visible: false });
    let orbitIndex = 0;
    const orbitCount = this.flow.nodes.filter((n) => n.orbits).length;

    for (const node of this.flow.nodes) {
      const color = this.colorFor(node.kind);
      const root = new Group();
      root.position.set(...node.pos);

      const shell = this.shellFor(node.kind, color);
      const core = new Mesh(coreGeo, new MeshBasicMaterial({ color }));
      const haloSprite = new Sprite(
        new SpriteMaterial({ map: halo, color, transparent: true, opacity: 0.55, blending: AdditiveBlending, depthWrite: false }),
      );
      haloSprite.scale.setScalar(1.3);
      const hit = new Mesh(hitGeo, hitMat);
      hit.userData.nodeId = node.id;

      root.add(shell, core, haloSprite, hit);
      const view: NodeView = { node, root, shell, core, halo: haloSprite, hit, scale: 1, orbitAngle: 0 };

      if (node.orbits) {
        view.orbitAngle = (orbitIndex / Math.max(orbitCount, 1)) * Math.PI * 2;
        orbitIndex += 1;
        root.scale.setScalar(0.72);
        const geo = new BufferGeometry();
        geo.setAttribute('position', new BufferAttribute(new Float32Array(6), 3));
        const line = new Line(geo, new LineBasicMaterial({ color: this.colors.muted, transparent: true, opacity: 0.22 }));
        view.orbitLine = line;
        this.group.add(line);
      }

      this.group.add(root);
      this.nodes.set(node.id, view);
      this.hitMeshes.push(hit);
    }
  }

  private buildEdges() {
    for (const edge of this.flow.edges) {
      const a = this.nodes.get(edge.from);
      const b = this.nodes.get(edge.to);
      if (!a || !b) continue;
      const p0 = a.root.position.clone();
      const p2 = b.root.position.clone();
      const mid = p0.clone().add(p2).multiplyScalar(0.5);
      // Lift the midpoint toward the camera so parallel edges read as separate paths.
      mid.z += 0.45;
      const curve = new QuadraticBezierCurve3(p0, mid, p2);
      let object: Object3D;
      let material: LineBasicMaterial | MeshBasicMaterial;
      let baseOpacity: number;
      if (edge.dashed) {
        const geo = new BufferGeometry().setFromPoints(curve.getPoints(32));
        const mat = new LineDashedMaterial({ color: this.colors.muted, dashSize: 0.18, gapSize: 0.12, transparent: true, opacity: 0.35 });
        const line = new Line(geo, mat);
        line.computeLineDistances();
        object = line;
        material = mat;
        baseOpacity = 0.35;
      } else {
        const geo = new TubeGeometry(curve, 28, 0.022, 6, false);
        const mat = new MeshBasicMaterial({ color: this.colors.ink, transparent: true, opacity: 0.22 });
        object = new Mesh(geo, mat);
        material = mat;
        baseOpacity = 0.22;
      }
      this.group.add(object);
      this.edges.set(`${edge.from}>${edge.to}`, { curve, object, material, baseOpacity, from: edge.from, to: edge.to });
    }
  }

  private buildPackets() {
    const halo = getHaloTexture();
    this.flow.routes.forEach((route, i) => {
      const mesh = new Mesh(this.packetGeometry, new MeshBasicMaterial({ color: this.colors.glow }));
      const sprite = new Sprite(
        new SpriteMaterial({ map: halo, color: this.colors.glow, transparent: true, opacity: 0.9, blending: AdditiveBlending, depthWrite: false }),
      );
      sprite.scale.setScalar(0.9);
      mesh.add(sprite);
      mesh.visible = false;
      this.group.add(mesh);
      // Stagger secondary packets so routes don't start in lockstep.
      this.packets.push({ route, mesh, halo: sprite, leg: 0, t: 0, waiting: 0, pause: 0.01 + i * 1.4, primary: i === 0 });
    });
  }

  private buildLattice() {
    const n = 7;
    const spacing = 1.1;
    const positions = new Float32Array(n * n * 3 * 3);
    let k = 0;
    for (let x = 0; x < n; x++)
      for (let y = 0; y < n; y++)
        for (let z = 0; z < 3; z++) {
          positions[k++] = (x - (n - 1) / 2) * spacing * 1.6;
          positions[k++] = (y - (n - 1) / 2) * spacing * 0.9;
          positions[k++] = -2.6 - z * spacing;
        }
    const geo = new BufferGeometry();
    geo.setAttribute('position', new BufferAttribute(positions, 3));
    const mat = new PointsMaterial({ color: this.colors.link, size: 0.06, transparent: true, opacity: 0.35, depthWrite: false });
    this.lattice = new Points(geo, mat);
    this.scene.add(this.lattice);
  }

  /* ---------- layout ---------- */

  resize(width: number, height: number) {
    if (width === this.width && height === this.height) return;
    this.width = Math.max(width, 1);
    this.height = Math.max(height, 1);
    this.camera.aspect = this.width / this.height;
    const halfFov = (this.camera.fov * Math.PI) / 360;
    // Fit a stage about 13 units wide (room for edge labels) and 7 tall, whichever is tighter.
    const zForWidth = 6.6 / (Math.tan(halfFov) * this.camera.aspect);
    const zForHeight = 3.6 / Math.tan(halfFov);
    this.camera.position.z = Math.max(zForWidth, zForHeight);
    this.camera.updateProjectionMatrix();
  }

  /* ---------- interaction (called by the stage) ---------- */

  setPointer(ndcX: number, ndcY: number, inside: boolean) {
    this.pointer.set(ndcX, ndcY);
    this.pointerInside = inside;
    if (!inside) this.setHovered(null);
  }

  beginDrag() {
    this.dragging = true;
  }

  drag(dx: number, dy: number) {
    if (!this.dragging) return;
    this.rotYTarget = clamp(this.rotYTarget + dx * 0.006, -1.1, 1.1);
    this.rotXTarget = clamp(this.rotXTarget + dy * 0.004, -0.5, 0.5);
  }

  endDrag() {
    this.dragging = false;
  }

  /** Legend hover: highlight a node without the pointer being over it. */
  hover(id: string | null) {
    this.setHovered(id ? (this.nodes.get(id) ?? null) : null);
  }

  /** Pin a node so its description stays up; pass null to unpin. */
  pin(id: string | null) {
    this.pinned = id ? (this.nodes.get(id) ?? null) : null;
  }

  get pinnedId() {
    return this.pinned?.node.id ?? null;
  }

  get hoveredId() {
    return this.hovered?.node.id ?? null;
  }

  /** Jump the primary packet to a step of the first route. */
  goToStep(index: number) {
    const packet = this.packets[0];
    if (!packet) return;
    packet.leg = clamp(index, 0, packet.route.length - 1);
    packet.t = 0;
    packet.waiting = 0;
    packet.pause = 0;
    packet.mesh.visible = true;
    const step = packet.route[packet.leg]!;
    const node = this.nodes.get(step.id);
    if (node) {
      packet.mesh.position.copy(node.root.position);
      this.pulse(node);
      this.events.onStep(packet.leg, node.node, step.waitLabel);
    }
  }

  private setHovered(view: NodeView | null) {
    if (view === this.hovered) return;
    this.hovered = view;
    this.events.onHover(view?.node ?? null);
  }

  /* ---------- per-frame ---------- */

  private edgeFor(from: string, to: string): { edge: EdgeView; reverse: boolean } | null {
    const fwd = this.edges.get(`${from}>${to}`);
    if (fwd) return { edge: fwd, reverse: false };
    const back = this.edges.get(`${to}>${from}`);
    if (back) return { edge: back, reverse: true };
    return null;
  }

  private pulse(view: NodeView) {
    const color = this.colorFor(view.node.kind);
    const mesh = new Mesh(
      this.ringGeometry,
      new MeshBasicMaterial({ color, transparent: true, opacity: 0.8, side: DoubleSide, depthWrite: false }),
    );
    mesh.position.copy(view.root.position);
    this.group.add(mesh);
    this.pulses.push({ mesh, age: 0, life: 0.9 });
  }

  update(dt: number) {
    this.time += dt;
    const t = this.time;

    // Rotation: drag target with a slow drift back toward the default view, plus a gentle sway.
    if (!this.dragging) {
      this.rotYTarget *= 0.995;
      this.rotXTarget *= 0.99;
    }
    this.rotY += (this.rotYTarget - this.rotY) * 0.08;
    this.rotX += (this.rotXTarget - this.rotX) * 0.08;
    const parallaxY = this.pointerInside ? this.pointer.x * 0.08 : 0;
    const parallaxX = this.pointerInside ? -this.pointer.y * 0.05 : 0;
    this.group.rotation.y = this.rotY + parallaxY + Math.sin(t * 0.35) * 0.05;
    this.group.rotation.x = this.rotX + parallaxX + Math.sin(t * 0.5) * 0.03;
    if (this.lattice) this.lattice.rotation.z = Math.sin(t * 0.1) * 0.04;

    // Orbit nodes circle their centre on a tilted ring.
    for (const view of this.nodes.values()) {
      if (!view.node.orbits) continue;
      const centre = this.nodes.get(view.node.orbits);
      if (!centre) continue;
      view.orbitAngle += dt * 0.28;
      const a = view.orbitAngle;
      view.root.position.set(
        centre.root.position.x + Math.cos(a) * ORBIT_RADIUS,
        centre.root.position.y + Math.sin(a) * ORBIT_RADIUS * 0.4,
        centre.root.position.z + Math.sin(a) * ORBIT_RADIUS * 0.85,
      );
      if (view.orbitLine) {
        const arr = view.orbitLine.geometry.getAttribute('position') as BufferAttribute;
        arr.setXYZ(0, centre.root.position.x, centre.root.position.y, centre.root.position.z);
        arr.setXYZ(1, view.root.position.x, view.root.position.y, view.root.position.z);
        arr.needsUpdate = true;
      }
    }

    // Hover picking (needs world matrices from the previous frame; good enough at 60 fps).
    if (this.pointerInside && !this.dragging) {
      this.raycaster.setFromCamera(this.pointer, this.camera);
      const hits = this.raycaster.intersectObjects(this.hitMeshes, false);
      const id = hits[0]?.object.userData.nodeId as string | undefined;
      this.setHovered(id ? (this.nodes.get(id) ?? null) : null);
    }

    // Node idle motion and highlight scaling.
    const active = this.hovered ?? this.pinned;
    for (const view of this.nodes.values()) {
      const target = view === active ? 1.35 : 1;
      view.scale += (target - view.scale) * 0.15;
      const base = view.node.orbits ? 0.72 : 1;
      view.root.scale.setScalar(base * view.scale);
      if (view.node.kind !== 'gate') {
        view.shell.rotation.y += dt * 0.4;
        view.shell.rotation.x = Math.sin(t * 0.6 + view.root.position.x) * 0.3;
      }
      const pulse = 0.55 + Math.sin(t * 2 + view.root.position.x * 1.7) * 0.08;
      (view.halo.material as SpriteMaterial).opacity = view === active ? 1 : pulse;
    }

    // Edge highlight for the active node.
    for (const edge of this.edges.values()) {
      const lit = !!active && (edge.from === active.node.id || edge.to === active.node.id);
      const target = lit ? 0.95 : edge.baseOpacity;
      edge.material.opacity += (target - edge.material.opacity) * 0.15;
      const rest = edge.object instanceof Line ? this.colors.muted : this.colors.ink;
      edge.material.color.lerp(lit ? this.colors.glow : rest, 0.15);
    }

    for (const packet of this.packets) this.updatePacket(packet, dt);

    for (let i = this.pulses.length - 1; i >= 0; i--) {
      const p = this.pulses[i]!;
      p.age += dt;
      const k = p.age / p.life;
      if (k >= 1) {
        this.group.remove(p.mesh);
        (p.mesh.material as MeshBasicMaterial).dispose();
        this.pulses.splice(i, 1);
        continue;
      }
      p.mesh.scale.setScalar(1 + k * 2.2);
      (p.mesh.material as MeshBasicMaterial).opacity = 0.8 * (1 - k);
      p.mesh.quaternion.copy(this.camera.quaternion);
    }
  }

  private updatePacket(packet: Packet, dt: number) {
    const route = packet.route;
    if (packet.pause > 0) {
      packet.pause -= dt;
      if (packet.pause > 0) return;
      packet.mesh.visible = true;
      packet.leg = 0;
      packet.t = 0;
      const first = this.nodes.get(route[0]!.id);
      if (first) {
        packet.mesh.position.copy(first.root.position);
        this.pulse(first);
        if (packet.primary) this.events.onStep(0, first.node, route[0]!.waitLabel);
      }
      packet.waiting = route[0]!.wait ?? 0;
      return;
    }
    if (packet.waiting > 0) {
      packet.waiting -= dt;
      const here = this.nodes.get(route[packet.leg]!.id);
      if (here) {
        packet.mesh.position.copy(here.root.position);
        (packet.halo.material as SpriteMaterial).opacity = 0.6 + Math.sin(this.time * 9) * 0.35;
      }
      return;
    }
    (packet.halo.material as SpriteMaterial).opacity = 0.9;

    if (packet.leg >= route.length - 1) {
      packet.pause = END_PAUSE + (packet.primary ? 0 : 0.6);
      packet.mesh.visible = false;
      return;
    }

    const from = route[packet.leg]!;
    const to = route[packet.leg + 1]!;
    const found = this.edgeFor(from.id, to.id);
    packet.t += dt / LEG_SECONDS;
    const k = Math.min(packet.t, 1);
    const eased = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
    if (found) {
      packet.mesh.position.copy(found.edge.curve.getPointAt(found.reverse ? 1 - eased : eased));
    } else {
      const a = this.nodes.get(from.id);
      const b = this.nodes.get(to.id);
      if (a && b) packet.mesh.position.lerpVectors(a.root.position, b.root.position, eased);
    }
    if (packet.t >= 1) {
      packet.leg += 1;
      packet.t = 0;
      const arrived = this.nodes.get(to.id);
      if (arrived) {
        this.pulse(arrived);
        if (packet.primary) this.events.onStep(packet.leg, arrived.node, to.waitLabel);
      }
      packet.waiting = to.wait ?? 0;
    }
  }

  /**
   * Which side of the node its label sits on. Side nodes (stores, anything low) go below;
   * nodes that share a row alternate above/below from left to right so long labels on
   * neighbouring nodes don't overlap.
   */
  private readonly labelBelow = new Map<string, boolean>();

  private computeLabelSides() {
    const rows = new Map<number, FlowNode[]>();
    for (const node of this.flow.nodes) {
      if (node.orbits) continue;
      const key = Math.round(node.pos[1] * 2);
      const row = rows.get(key) ?? [];
      row.push(node);
      rows.set(key, row);
    }
    for (const row of rows.values()) {
      row.sort((a, b) => a.pos[0] - b.pos[0]);
      row.forEach((node, i) => {
        const forcedBelow = node.kind === 'store' || node.pos[1] < -1.9;
        this.labelBelow.set(node.id, forcedBelow || i % 2 === 1);
      });
    }
  }

  /** Projects a node's label anchor (just above or below the node) into 0..1 slot coordinates. */
  project(id: string, out: Vector3): { x: number; y: number; below: boolean; orbit: boolean } | null {
    const view = this.nodes.get(id);
    if (!view) return null;
    if (this.labelBelow.size === 0) this.computeLabelSides();
    const below = this.labelBelow.get(id) ?? false;
    const base = view.node.orbits ? 0.72 : 1;
    out.set(0, (below ? -0.48 : 0.48) / (base * view.scale), 0).applyMatrix4(view.root.matrixWorld);
    out.project(this.camera);
    return { x: (out.x + 1) / 2, y: (1 - out.y) / 2, below, orbit: !!view.node.orbits };
  }

  render(renderer: WebGLRenderer) {
    renderer.render(this.scene, this.camera);
  }
}

function clamp(v: number, min: number, max: number) {
  return Math.min(max, Math.max(min, v));
}
