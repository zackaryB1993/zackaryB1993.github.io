const GLYPHS = '#$%&*+<>=?@ABCDEF0123456789XYZ';

/**
 * "Decrypts" each [data-decrypt] element: the text starts as random glyphs and resolves
 * left to right. The real text is kept in the DOM for assistive tech via aria-label on
 * the parent heading, and the effect is skipped under reduced motion.
 */
export function decryptAll(root: ParentNode = document) {
  const targets = Array.from(root.querySelectorAll<HTMLElement>('[data-decrypt]'));
  targets.forEach((el, i) => decrypt(el, 1100 + i * 250, i * 220));
}

export function decrypt(el: HTMLElement, duration = 1200, delay = 0) {
  const final = el.dataset.text ?? el.textContent ?? '';
  el.dataset.text = final;
  const chars = Array.from(final);
  const start = performance.now() + delay;
  el.setAttribute('aria-hidden', 'true');
  el.classList.add('is-decrypting');

  const tick = (now: number) => {
    const k = Math.min(Math.max((now - start) / duration, 0), 1);
    const resolved = Math.floor(k * chars.length);
    let out = '';
    for (let i = 0; i < chars.length; i++) {
      const c = chars[i]!;
      if (c === ' ') out += ' ';
      else if (i < resolved) out += c;
      else out += GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
    }
    el.textContent = out;
    if (k < 1) requestAnimationFrame(tick);
    else {
      el.textContent = final;
      el.classList.remove('is-decrypting');
      el.removeAttribute('aria-hidden');
    }
  };
  requestAnimationFrame(tick);
}
