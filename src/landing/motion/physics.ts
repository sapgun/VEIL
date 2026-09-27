/** Scroll position controls the story. Velocity only excites the cloth. */
export const clamp = (n: number, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, n));
export const smoothstep = (a: number, b: number, n: number) => {
  const t = clamp((n - a) / (b - a));
  return t * t * (3 - 2 * t);
};
export function sceneProgress(scrollY: number, top: number, travel: number) {
  return clamp((scrollY - top) / Math.max(1, travel));
}
export function storyAt(progress: number) {
  const p = clamp(progress);
  const merge = smoothstep(.10, .43, p);
  const separate = smoothstep(.55, .79, p);
  return {
    spread: (1 - merge) + separate * 1.4,
    morph: merge * (1 - separate),
    dissolve: smoothstep(.76, 1, p),
    phase: p < .34 ? 0 : p < .56 ? 1 : p < .80 ? 2 : 3,
  };
}
export interface ClothState { bend: number; velocity: number; input: number }
export function stepCloth(state: ClothState, scrollSpeed: number, elapsed: number): ClothState {
  const next = { ...state };
  // Substeps keep the spring stable across 30/60/120 Hz and after long frames.
  const dt = clamp(elapsed, 0, .05);
  const steps = Math.max(1, Math.ceil(dt * 120));
  const h = dt / steps;
  const impulse = clamp(scrollSpeed / 1500, -1, 1);
  for (let i = 0; i < steps; i++) {
    next.input += (impulse - next.input) * (1 - Math.exp(-14 * h));
    next.velocity += (34 * next.input - 64 * next.bend - 10 * next.velocity) * h;
    next.bend = clamp(next.bend + next.velocity * h, -.65, .65);
  }
  return next;
}
export function settled(s: ClothState) {
  return Math.abs(s.bend) + Math.abs(s.velocity) + Math.abs(s.input) < .0006;
}
export function renderScale(width: number, height: number, dpr: number, tier: number) {
  // Cap both pixel ratio and total back-buffer area. DOM text is never downscaled.
  const budget = tier === 0 ? 1_800_000 : tier === 1 ? 950_000 : 520_000;
  return Math.min(Math.max(.5, dpr), tier === 0 ? 1.5 : 1, Math.sqrt(budget / Math.max(1, width * height)));
}
