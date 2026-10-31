import { flows, orderedNodes, type FlowNode } from '../data/flows';
import { decryptAll } from './decrypt';
import { hasWebGL, prefersReducedMotion, themeColors } from './theme';

/**
 * Entry point for all motion on the page. What runs depends on the device:
 * - reduced motion: nothing animates, the 2D fallbacks stay.
 * - no WebGL: decrypt effect only.
 * - touch or narrow screens: hero scene only; case studies keep the 2D fallbacks.
 * - desktop: everything.
 */
export async function boot() {
  const reduce = prefersReducedMotion();
  const webgl = hasWebGL();
  const desktop = window.matchMedia('(min-width: 768px) and (hover: hover) and (pointer: fine)').matches;

  if (!reduce) decryptAll();
  if (reduce || !webgl) return;

  const colors = themeColors();

  const heroSlot = document.querySelector<HTMLElement>('[data-scene="hero"]');
  if (heroSlot) {
    const { startHero } = await import('./hero');
    startHero(heroSlot, colors);
  }

  if (!desktop) return;

  const slots = Array.from(document.querySelectorAll<HTMLElement>('[data-flow]'));
  if (slots.length === 0) return;
  const { Stage } = await import('./stage');
  const stage = new Stage(colors);

  for (const slot of slots) {
    const slug = slot.dataset.flow!;
    const flow = flows[slug];
    if (!flow) continue;
    const card = slot.closest<HTMLElement>('[data-flow-card]') ?? slot.parentElement!;
    const stepEl = card.querySelector<HTMLElement>('[data-flow-step]');
    const titleEl = card.querySelector<HTMLElement>('[data-flow-title]');
    const blurbEl = card.querySelector<HTMLElement>('[data-flow-blurb]');
    const legend = Array.from(card.querySelectorAll<HTMLButtonElement>('[data-flow-legend] button[data-node]'));
    const primary = flow.routes[0] ?? [];
    const total = primary.length;
    const ordered = orderedNodes(flow);

    let current: { node: FlowNode; index: number; wait?: string } | null = null;
    let hovered: FlowNode | null = null;

    const show = (node: FlowNode, head: string) => {
      if (stepEl) stepEl.textContent = head;
      if (titleEl) titleEl.textContent = node.label;
      if (blurbEl) blurbEl.textContent = node.blurb;
      for (const b of legend) b.classList.toggle('is-active', b.dataset.node === node.id);
    };

    const refresh = () => {
      const pinnedId = scene.pinnedId;
      const pinned = pinnedId ? flow.nodes.find((n) => n.id === pinnedId) : null;
      if (hovered) show(hovered, `${ordered.findIndex((n) => n.id === hovered!.id) + 1} / ${ordered.length} · hovering`);
      else if (pinned) show(pinned, 'pinned · click again to release');
      else if (current) {
        const head = `step ${current.index + 1} of ${total}${current.wait ? ` · ${current.wait}` : ''}`;
        show(current.node, head);
      }
    };

    const scene = stage.add(slot, flow, {
      onStep: (index, node, wait) => {
        current = { node, index, wait };
        refresh();
      },
      onHover: (node) => {
        hovered = node;
        slot.classList.toggle('is-hovering', !!node);
        refresh();
      },
    });

    slot.addEventListener('flow:pin', refresh);

    legend.forEach((button) => {
      const id = button.dataset.node!;
      button.addEventListener('mouseenter', () => scene.hover(id));
      button.addEventListener('mouseleave', () => scene.hover(null));
      button.addEventListener('focus', () => scene.hover(id));
      button.addEventListener('blur', () => scene.hover(null));
      button.addEventListener('click', () => {
        const stepIndex = primary.findIndex((s) => s.id === id);
        if (stepIndex >= 0) {
          scene.pin(null);
          scene.goToStep(stepIndex);
        } else {
          scene.pin(scene.pinnedId === id ? null : id);
        }
        refresh();
      });
    });
  }
}
