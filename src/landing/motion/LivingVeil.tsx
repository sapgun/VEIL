import { useEffect, useRef, useState } from 'react';
import './living-veil.css';

const STORAGE_KEY = 'veil:motion:v1';
const phases = ['Separate contexts.', 'One private self.', 'Your boundaries.', 'Reveal only what matters.'];

export default function LivingVeil() {
  const track = useRef<HTMLElement>(null);
  const screen = useRef<HTMLDivElement>(null);
  const [near, setNear] = useState(false);
  const [allowed, setAllowed] = useState(false);
  const [reduced, setReduced] = useState(false);
  const [off, setOff] = useState(false);
  const [status, setStatus] = useState<'waiting' | 'active' | 'lite' | 'fallback'>('waiting');
  const enabled = allowed && !reduced && !off && status !== 'fallback';

  useEffect(() => {
    const desktop = matchMedia('(min-width: 960px)');
    const preference = matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => { setAllowed(desktop.matches && 'IntersectionObserver' in window && 'ResizeObserver' in window); setReduced(preference.matches); };
    try { setOff(localStorage.getItem(STORAGE_KEY) === 'off'); } catch { /* Private storage is optional. */ }
    update(); desktop.addEventListener('change', update); preference.addEventListener('change', update);
    if (!('IntersectionObserver' in window)) return () => { desktop.removeEventListener('change', update); preference.removeEventListener('change', update); };
    const observer = new IntersectionObserver(([entry]) => { if (entry.isIntersecting) setNear(true); }, { rootMargin: '400px' });
    if (track.current) observer.observe(track.current);
    return () => { observer.disconnect(); desktop.removeEventListener('change', update); preference.removeEventListener('change', update); };
  }, []);

  useEffect(() => {
    if (!enabled || !near || !screen.current || !track.current) return;
    let cancelled = false;
    let scene: { dispose(): void } | undefined;
    const host = screen.current, element = track.current;
    // Download / compile the GPU module only when an eligible visitor approaches.
    void import('./engine').then(module => {
      if (!cancelled) scene = module.createLivingVeil(host, element, next => { if (!cancelled) setStatus(next); });
    }).catch(() => { if (!cancelled) setStatus('fallback'); });
    return () => { cancelled = true; scene?.dispose(); };
  }, [enabled, near]);

  function toggle() {
    const next = !off;
    setOff(next);
    try { localStorage.setItem(STORAGE_KEY, next ? 'off' : 'on'); } catch { /* No persistence required. */ }
  }
  const explanation = reduced ? 'Reduced motion · still composition' : !allowed ? 'Still composition' : status === 'fallback' ? 'Still composition · graphics fallback' : off ? 'Motion is off' : status === 'lite' ? 'Scroll-responsive · light mode' : 'Scroll to reveal · reverse to return';

  return <section ref={track} id="living-veil" className="vl-living" data-motion={enabled ? 'on' : 'off'} aria-labelledby="vl-living-title">
    <div className="vl-living-stage">
      <div className="vl-living-heading vl-container">
        <div><p className="vl-eyebrow">LIVING VEIL <span className="vl-small-rule" aria-hidden="true" /> A STUDY IN BOUNDARIES</p><h2 id="vl-living-title">One self. <em>Many ways to be.</em></h2></div>
        <div className="vl-living-controls">
          <button type="button" className="vl-motion-toggle" onClick={toggle} aria-pressed={enabled} disabled={reduced || !allowed || status === 'fallback'} aria-describedby="vl-motion-note">{enabled ? 'Motion on' : 'Motion off'}<span aria-hidden="true">{enabled ? 'Ⅱ' : '▷'}</span></button>
          <a href="#philosophy">Skip scene ↓</a>
        </div>
      </div>
      <div ref={screen} className="vl-living-screen" aria-hidden="true">
        <img className="vl-living-poster" src="/veil/motion/still.svg" alt="" width="1440" height="720" loading="lazy" />
        <span className="vl-living-ruler vl-living-ruler--left">PRIVATE / CONTEXT 01—03</span>
        <span className="vl-living-ruler vl-living-ruler--right">IDENTITY IS YOURS TO REVEAL.</span>
      </div>
      <div className="vl-living-bottom vl-container">
        <div className="vl-living-captions" aria-hidden="true">{phases.map((label,index) => <span key={label} data-story-phase={index} data-active={index === 0}>{label}</span>)}</div>
        <p className="vl-living-accessible">Different silhouettes represent the same person in different contexts. They align, separate, and fade as you scroll. This is a visual metaphor, not identity processing or deletion of disclosed data.</p>
        <p id="vl-motion-note">{explanation}</p>
        <div className="vl-living-progress" aria-hidden="true"><span className="vl-living-progress-fill" /></div>
      </div>
    </div>
  </section>;
}
