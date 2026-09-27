/** The story follows position; only the material's small after-motion follows velocity. */
export const clamp = (n: number, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, n));
export function ease(a: number, b: number, value: number) {
  const t = clamp((value - a) / (b - a));
  return t * t * (3 - 2 * t);
}
export type Spring = { x: number; v: number; input: number };
export function advanceSpring(previous: Spring, speed: number, elapsed: number): Spring {
  const s = { ...previous };
  const dt = clamp(elapsed, 0, .05), steps = Math.max(1, Math.ceil(dt * 120)), h = dt / steps;
  for (let i = 0; i < steps; i++) {
    s.input += (clamp(speed / 1500, -1, 1) - s.input) * (1 - Math.exp(-14 * h));
    s.v += (28 * s.input - 64 * s.x - 12 * s.v) * h;
    s.x = clamp(s.x + s.v * h, -.5, .5);
  }
  return s;
}
export const isResting = (s: Spring) => Math.abs(s.x) + Math.abs(s.v) + Math.abs(s.input) < .0005;
export function presenceAt(progress: number) {
  const p = clamp(progress);
  const merge = ease(.06, .39, p), release = ease(.52, .8, p);
  const spread = 1 - merge + release;
  const opacity = 1 - ease(.78, 1, p);
  return { spread, opacity, merged: p >= .39 && p <= .52 };
}

/** Compositor transforms only: no canvas, no infinite clock, no scroll interception. */
export function mountAtmosphere(layer: HTMLElement, site: HTMLElement) {
  const sheets = [...layer.querySelectorAll<HTMLElement>('[data-veil-sheet]')];
  const portrait = site.querySelector<HTMLElement>('.vl-presence');
  const echoes = [...site.querySelectorAll<HTMLElement>('[data-photo-echo]')];
  let raf = 0, last = 0, lastY = window.scrollY, dead = false, dirty = true;
  let anchor = 0, travel = 500, fullTravel = 1, narrow = false;
  let s: Spring = { x: 0, v: 0, input: 0 };
  const header = site.querySelector<HTMLElement>('.vl-header');
  function measure() {
    narrow = innerWidth < 960;
    const rect = portrait?.getBoundingClientRect();
    anchor = Math.max(0, (rect?.top ?? 0) + scrollY - innerHeight * .55);
    travel = Math.max(240, (rect?.height ?? 450) * .55);
    fullTravel = Math.max(1, site.scrollHeight - innerHeight);
    // Keep anchor navigation clear of the actual sticky header, including font zoom.
    site.style.setProperty('--vl-header-clearance', `${(header?.offsetHeight ?? 78) + 24}px`);
    dirty = false;
  }
  function stop() { cancelAnimationFrame(raf); raf = 0; last = 0; }
  function frame(time: number) {
    raf = 0;
    if (dead || document.hidden) return;
    if (dirty) measure();
    const dt = last ? Math.min(.05, (time - last) / 1000) : 1 / 60;
    const y = Math.max(0, scrollY), speed = clamp((y - lastY) / Math.max(.001, dt), -3000, 3000);
    lastY = y; last = time; s = advanceSpring(s, speed, dt);
    const position = clamp(y / fullTravel), amplitude = narrow ? .35 : 1;
    sheets.forEach((sheet, index) => {
      const weight = [1, -.52, .24][index];
      const x = (s.x * 18 + (position - .5) * 12) * weight * amplitude;
      const top = (-s.x * 10 + (position - .5) * 18) * weight * amplitude;
      sheet.style.transform = `translate3d(${x.toFixed(3)}px,${top.toFixed(3)}px,0) rotate(${(s.x * weight * .28).toFixed(4)}deg)`;
    });
    const p = narrow ? 0 : clamp((y - anchor) / travel);
    const story = presenceAt(p);
    echoes.forEach((echo, index) => {
      const lateral = [-90, 0, 105][index] * story.spread;
      const vertical = [18, 0, 28][index] * story.spread;
      const opacity = index === 1 ? .76 * story.opacity : [.22, 0, .17][index] * story.spread * story.opacity;
      echo.style.transform = `translate3d(${lateral.toFixed(2)}px,${vertical.toFixed(2)}px,0) scale(${(1 - Math.abs(index - 1) * .075 * story.spread).toFixed(4)})`;
      echo.style.opacity = String(opacity);
    });
    if (portrait) portrait.dataset.progress = p.toFixed(3);
    if (!isResting(s) || speed !== 0) raf = requestAnimationFrame(frame);
    else { last = 0; s = { x: 0, v: 0, input: 0 }; }
  }
  function wake() { if (!dead && !document.hidden && !raf) raf = requestAnimationFrame(frame); }
  function resize() { dirty = true; wake(); }
  function visibility() {
    stop(); lastY = Math.max(0, scrollY); s = { x: 0, v: 0, input: 0 };
    if (!document.hidden) { dirty = true; wake(); }
  }
  const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(resize);
  observer?.observe(site); if (portrait) observer?.observe(portrait);
  window.addEventListener('scroll', wake, { passive: true });
  window.addEventListener('resize', resize, { passive: true });
  document.addEventListener('visibilitychange', visibility);
  wake();
  return () => {
    dead = true; stop(); observer?.disconnect();
    window.removeEventListener('scroll', wake); window.removeEventListener('resize', resize);
    document.removeEventListener('visibilitychange', visibility);
    for (const element of [...sheets, ...echoes]) { element.style.removeProperty('transform'); element.style.removeProperty('opacity'); }
    portrait?.removeAttribute('data-progress');
  };
}
