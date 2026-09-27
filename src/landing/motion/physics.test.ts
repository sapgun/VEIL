import { describe, expect, it } from 'vitest';
import { clamp, renderScale, sceneProgress, settled, stepCloth, storyAt, type ClothState } from './physics';
const zero = (): ClothState => ({ bend: 0, velocity: 0, input: 0 });
function integrate(hz: number, seconds: number, speed: number, initial = zero()) {
  let state = initial;
  for (let i = 0; i < seconds * hz; i++) state = stepCloth(state, speed, 1 / hz);
  return state;
}
describe('Living Veil deterministic scroll physics', () => {
  it('clamps progress including zero-height and jump-scroll inputs', () => {
    expect(sceneProgress(0, 500, 1200)).toBe(0);
    expect(sceneProgress(1100, 500, 1200)).toBe(.5);
    expect(sceneProgress(9999, 500, 0)).toBe(1);
  });
  it('aligns three silhouettes, separates, then fully dissolves', () => {
    expect(storyAt(0).spread).toBe(1);
    expect(storyAt(.48).spread).toBe(0);
    expect(storyAt(.48).morph).toBe(1);
    expect(storyAt(.8).spread).toBe(1.4);
    expect(storyAt(1).dissolve).toBe(1);
  });
  it('produces the same story regardless of scroll direction', () => {
    const forward = [0,.2,.48,.72,1].map(storyAt);
    const backward = [1,.72,.48,.2,0].map(storyAt).reverse();
    expect(backward).toEqual(forward);
  });
  it('changes the spring direction without discontinuous position jumps', () => {
    const down = integrate(60, 1, 1500);
    const change = stepCloth(down, -1500, 1/60);
    expect(down.bend).toBeGreaterThan(0);
    expect(Math.abs(change.bend-down.bend)).toBeLessThan(.04);
    expect(integrate(60, 2, -1500, change).bend).toBeLessThan(0);
  });
  it('settles after input stops instead of breathing indefinitely', () => {
    expect(settled(integrate(60, 4, 0, integrate(60, 1, 1800)))).toBe(true);
  });
  it('tracks 30/60/120 Hz within a small spring tolerance', () => {
    const values = [30,60,120].map(hz => integrate(hz, 1, 1000).bend);
    expect(Math.max(...values)-Math.min(...values)).toBeLessThan(.006);
  });
  it('caps velocity spikes and long frame integration', () => {
    let s = zero();
    for (let i=0;i<100;i++) { s=stepCloth(s, 1e9, 10); expect(Math.abs(s.bend)).toBeLessThanOrEqual(.65); }
    expect(Number.isFinite(s.velocity)).toBe(true);
    expect(clamp(-2,-1,1)).toBe(-1);
  });
  it('caps render area and decreases it with quality tiers', () => {
    const scales=[0,1,2].map(tier=>renderScale(1920,1080,3,tier));
    expect(1920*1080*scales[0]**2).toBeLessThanOrEqual(1_800_001);
    expect(scales[0]).toBeGreaterThan(scales[1]); expect(scales[1]).toBeGreaterThan(scales[2]);
  });
});
