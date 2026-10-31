import { Color, CanvasTexture, SRGBColorSpace } from 'three';

/**
 * Scene colors come from the CSS variables in theme.css, so swapping the theme also
 * recolors the 3D scenes. Nothing in src/scenes holds a hex value.
 */
export type ThemeColors = {
  glow: Color;
  link: Color;
  accent: Color;
  muted: Color;
  ink: Color;
  bg: Color;
  dock: Color;
};

export function themeColors(): ThemeColors {
  const style = getComputedStyle(document.documentElement);
  const read = (name: string) => new Color(style.getPropertyValue(name).trim() || '#ffffff');
  return {
    glow: read('--accent-glow'),
    link: read('--accent-link'),
    accent: read('--accent-primary'),
    muted: read('--text-muted'),
    ink: read('--text-heading'),
    bg: read('--background'),
    dock: read('--surface-dock'),
  };
}

let haloTexture: CanvasTexture | null = null;

/** Soft radial sprite used for glows. Built once and shared. */
export function getHaloTexture(): CanvasTexture {
  if (haloTexture) return haloTexture;
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.25, 'rgba(255,255,255,0.55)');
  g.addColorStop(0.6, 'rgba(255,255,255,0.12)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  haloTexture = new CanvasTexture(canvas);
  haloTexture.colorSpace = SRGBColorSpace;
  return haloTexture;
}

export const prefersReducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export function hasWebGL(): boolean {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch {
    return false;
  }
}
