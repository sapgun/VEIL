import { useEffect, useId, useRef, type ReactNode } from 'react';
import { iconPaths, type IconName } from './icon-paths';

/** Only build-time icon geometry enters innerHTML; never pass user-provided SVG. */
export function Icon({ name, size = 24, className = '' }: { name: IconName; size?: number; className?: string }) {
  return <svg className={`vl-icon ${className}`} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false" dangerouslySetInnerHTML={{ __html: iconPaths[name] }} />;
}

export function AppLink({ children = 'Open app', compact = false }: { children?: ReactNode; compact?: boolean }) {
  return <a className={`vl-button ${compact ? 'vl-button--compact' : ''}`} href="/app" data-app-link><span>{children}</span><Icon name="arrow-up-right" size={17} /></a>;
}

/** In-view pattern selected via designeer / Motion Primitives.
 * Native IntersectionObserver + WAAPI port: no extra runtime dependency.
 * After React mounts, content is never hidden while waiting for an animation.
 */
export function Reveal({ children, className = '' }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (!el || media.matches || !('IntersectionObserver' in window) || !el.animate) return;
    let animation: Animation | undefined;
    const observer = new IntersectionObserver(entries => {
      if (!entries.some(e => e.isIntersecting)) return;
      observer.disconnect();
      if (media.matches) return;
      animation = el.animate([{ opacity: 0.65, transform: 'translateY(10px)' }, { opacity: 1, transform: 'translateY(0)' }], { duration: 300, easing: 'cubic-bezier(.22,1,.36,1)' });
    }, { threshold: 0.12 });
    const stop = () => { if (media.matches) animation?.cancel(); };
    observer.observe(el); media.addEventListener('change', stop);
    return () => { observer.disconnect(); animation?.cancel(); media.removeEventListener('change', stop); };
  }, []);
  return <div ref={ref} className={className}>{children}</div>;
}

export function SectionHeading({ index, label, title, children, id }: { index: string; label: string; title: ReactNode; children?: ReactNode; id?: string }) {
  return <div className="vl-section-heading"><p className="vl-eyebrow"><span>{index}</span><i aria-hidden="true" />{label}</p><h2 id={id}>{title}</h2>{children && <p className="vl-section-description">{children}</p>}</div>;
}

export function Wordmark({ footer = false }: { footer?: boolean }) {
  return <a className={`vl-wordmark ${footer ? 'vl-wordmark--footer' : ''}`} href="/" aria-label="VEIL home"><img src="/veil/wordmark.svg" alt="VEIL" width="126" height="33" /></a>;
}

export function Disclosure({ question, children }: { question: string; children: ReactNode }) {
  const id = useId();
  return <details className="vl-disclosure"><summary aria-controls={id}>{question}<Icon name="plus" size={18} /></summary><div id={id} className="vl-disclosure-content">{children}</div></details>;
}
