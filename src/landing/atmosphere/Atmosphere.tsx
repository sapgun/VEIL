import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { mountAtmosphere } from './kinetics';
import './atmosphere.css';

// Respect preferences set in the previous implementation instead of resetting them.
const STORAGE_KEY = 'veil:motion:v1';
const MotionContext = createContext({ enabled: false, reduced: false, toggle: () => {} });
export function AtmosphereProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false), [off, setOff] = useState(false), [reduced, setReduced] = useState(false);
  useEffect(() => {
    const query = matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduced(query.matches);
    try { setOff(localStorage.getItem(STORAGE_KEY) === 'off'); } catch { /* Preference storage is optional. */ }
    update(); setReady(true); query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);
  function toggle() {
    setOff(current => {
      const next = !current;
      try { localStorage.setItem(STORAGE_KEY, next ? 'off' : 'on'); } catch { /* No storage requirement. */ }
      return next;
    });
  }
  return <MotionContext.Provider value={{ enabled: ready && !off && !reduced, reduced, toggle }}>{children}</MotionContext.Provider>;
}

/** A background material, not a second page or a foreground effect covering the UI. */
export function Atmosphere() {
  const ref = useRef<HTMLDivElement>(null);
  const { enabled } = useContext(MotionContext);
  useEffect(() => {
    if (!enabled || !ref.current) return;
    const site = ref.current.closest<HTMLElement>('.vl-site');
    if (site) return mountAtmosphere(ref.current, site);
  }, [enabled]);
  return <div ref={ref} className="vl-atmosphere" data-motion={enabled ? 'on' : 'off'} aria-hidden="true">
    <div className="vl-atmo-sheet vl-atmo-near" data-veil-sheet="near" />
    <div className="vl-atmo-sheet vl-atmo-mid" data-veil-sheet="mid" />
    <div className="vl-atmo-sheet vl-atmo-far" data-veil-sheet="far" />
  </div>;
}

/** The same supplied photographic presence, not invented vector human figures. */
export function PhotoPresence() {
  const [available, setAvailable] = useState(true);
  return <div className="vl-presence" aria-hidden="true" data-photo-available={available}>
    {available && [0, 1, 2].map(index => <div key={index} className={`vl-presence-echo vl-presence-echo--${index}`} data-photo-echo={index}>
      <img src="/veil/atmosphere/presence.webp" alt="" width="512" height="640" decoding="async" onError={() => setAvailable(false)} />
    </div>)}
    <div className="vl-presence-gauze" />
  </div>;
}

/** Out of the composition, in the footer. No disabled controls before content. */
export function AtmosphereControl() {
  const { enabled, reduced, toggle } = useContext(MotionContext);
  if (reduced) return null;
  return <button type="button" className="vl-ambient-control" onClick={toggle} aria-pressed={enabled} aria-label="Ambient motion">
    <span className="vl-ambient-dot" aria-hidden="true" />Ambient motion<span aria-hidden="true">{enabled ? 'On' : 'Off'}</span>
  </button>;
}
