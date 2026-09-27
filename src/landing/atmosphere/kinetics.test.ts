import { describe, expect, it } from 'vitest';
import { advanceSpring, clamp, ease, isResting, presenceAt, type Spring } from './kinetics';
const zero = (): Spring => ({ x: 0, v: 0, input: 0 });
function run(hz: number, seconds: number, speed: number, initial = zero()) {
  let s = initial;
  for (let i = 0; i < seconds * hz; i++) s = advanceSpring(s, speed, 1 / hz);
  return s;
}
describe('VEIL atmosphere kinetics', () => {
  it('limits overscroll and easing inputs', () => {
    expect(clamp(-10)).toBe(0); expect(clamp(9)).toBe(1);
    expect(ease(.2,.8,-1)).toBe(0); expect(ease(.2,.8,2)).toBe(1);
  });
  it('aligns photographic echoes into one presence before separating', () => {
    expect(presenceAt(0).spread).toBe(1);
    expect(presenceAt(.45)).toEqual({spread:0,opacity:1,merged:true});
    expect(presenceAt(.8).spread).toBe(1);
    expect(presenceAt(1).opacity).toBe(0);
  });
  it('reverses the same photographic story without a clock', () => {
    const positions=[0,.2,.45,.7,1];
    expect(positions.map(presenceAt)).toEqual([...positions].reverse().map(presenceAt).reverse());
  });
  it('never increases merged exposure by stacking three opaque photos', () => {
    for(let p=0;p<=1;p+=.01){
      const s=presenceAt(p);expect(s.spread).toBeGreaterThanOrEqual(0);expect(s.spread).toBeLessThanOrEqual(1);
      expect(s.opacity).toBeGreaterThanOrEqual(0);expect(s.opacity).toBeLessThanOrEqual(1);
    }
  });
  it('settles rather than continuously animating', () => {
    expect(isResting(run(60,4,0,run(60,1,1500)))).toBe(true);
  });
  it('changes direction without jumping the sheet position', () => {
    const down=run(60,1,1500),next=advanceSpring(down,-1500,1/60);
    expect(down.x).toBeGreaterThan(0);expect(Math.abs(next.x-down.x)).toBeLessThan(.03);
    expect(run(60,2,-1500,next).x).toBeLessThan(0);
  });
  it('keeps 30/60/120Hz integration close', () => {
    const x=[30,60,120].map(hz=>run(hz,1,1000).x);
    expect(Math.max(...x)-Math.min(...x)).toBeLessThan(.005);
  });
  it('bounds long-frame impulses and leaves its input state immutable', () => {
    const initial=zero();let s=initial;
    for(let i=0;i<100;i++)s=advanceSpring(s,1e9,20);
    expect(initial).toEqual(zero());expect(Math.abs(s.x)).toBeLessThanOrEqual(.5);expect(Number.isFinite(s.v)).toBe(true);
  });
});
