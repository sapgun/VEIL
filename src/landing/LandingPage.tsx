import { useEffect, useState } from 'react';
import { AppLink, Disclosure, Icon, Reveal, SectionHeading, Wordmark } from './primitives';
import { DisclosurePreview } from './DisclosurePreview';
import { principles, repository, securityDoc, steps, validationDoc } from './content';
import './tokens.css';
import './landing.css';
import LivingVeil from './motion/LivingVeil';

function Header() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const update = () => setScrolled(window.scrollY > 12);
    update(); window.addEventListener('scroll', update, { passive: true });
    return () => window.removeEventListener('scroll', update);
  }, []);
  return <header className="vl-header" data-scrolled={scrolled}><div className="vl-container vl-header-inner"><Wordmark /><nav aria-label="Main navigation"><a href="#philosophy">Philosophy</a><a href="#experience">Experience</a><a href="#flow">Flow</a><a href={repository} target="_blank" rel="noreferrer">Source<Icon name="arrow-up-right" size={12} /></a></nav><AppLink compact>APP</AppLink></div></header>;
}

function ArchiveArtwork() {
  return <div className="vl-artwork" aria-hidden="true">
    <img className="vl-art-grid" src="/veil/archive-grid.svg" width="800" height="800" alt="" />
    <div className="vl-archive-sheet"><img src="/veil/archival-paper.svg" width="480" height="640" alt="" /><span className="vl-document-caption">DISCLOSURE RECORD<br />PRIVATE ARCHIVE / 001</span></div>
    <figure className="vl-portrait-frame"><picture><source type="image/webp" srcSet="/veil/portrait-256.webp 256w, /veil/portrait-512.webp 512w" sizes="256px" /><img src="/veil/portrait-512.webp" width="512" height="512" alt="" fetchPriority="high" decoding="async" /></picture><figcaption>IDENTITY IS YOURS TO REVEAL.</figcaption></figure>
    <img className="vl-vellum" src="/veil/vellum.svg" alt="" width="400" height="560" />
    <div className="vl-envelope"><img src="/veil/envelope.svg" width="640" height="420" alt="" /><img className="vl-envelope-seal" src="/veil/wax-seal.svg" width="220" height="220" alt="" /></div>
    <div className="vl-art-note"><span className="vl-micro">SAME PERSON.</span><p>Different contexts.<br /><em>Your terms.</em></p><span className="vl-note-rule" /></div>
    <div className="vl-art-callout"><Icon name="shield-check" size={22} /><div>Reveal only<br /><em>what matters.</em></div><span className="vl-callout-rule" /><span className="vl-micro">LESS EXPOSURE.<br />MORE CHOICE.</span></div>
    <span className="vl-art-index">VEIL / ARCHIVE NO. 001</span>
    <img className="vl-art-registration" src="/veil/registration.svg" width="24" height="24" alt="" />
  </div>;
}

function Hero() {
  return <section className="vl-hero vl-container" aria-labelledby="vl-title"><div className="vl-hero-copy"><p className="vl-eyebrow">INTENT PROTECTED<span className="vl-small-rule" aria-hidden="true" /></p><h1 id="vl-title">Privacy that feels<br /><em>intentional,</em><br />not hidden.</h1><p className="vl-hero-description">One identity. Separate contexts.<br />Reveal only what is needed.<br className="vl-small-break" /> Keep the rest yours.</p><div className="vl-hero-actions"><AppLink /><a className="vl-text-link" href="#experience">Explore the experience<Icon name="arrow-down" size={15} /></a></div><p className="vl-hero-footnote">UNLINK BY DEFAULT. LINK BY CONSENT.</p></div><ArchiveArtwork /></section>;
}

function PrincipleStrip() {
  return <section className="vl-signal" aria-label="VEIL principles"><div className="vl-container vl-signal-grid">{principles.map(p => <div className="vl-signal-item" key={p.label}><Icon name={p.icon} size={27} /><div><h2>{p.label}</h2><p>{p.text}</p></div></div>)}</div></section>;
}

function Philosophy() {
  return <section id="philosophy" className="vl-section vl-container vl-editorial-row" aria-labelledby="vl-philosophy-title"><SectionHeading index="01" label="PHILOSOPHY" id="vl-philosophy-title" title={<>A more<br />intentional internet.</>}>Privacy is a choice about what crosses a boundary. That choice should be yours.</SectionHeading><div className="vl-philosophy-cards"><Reveal className="vl-principle-card"><Icon name="person" size={30} /><span className="vl-card-number">I</span><h3>Identity</h3><p>One person, many contexts.<br />Not one public profile.</p><div className="vl-mini-personas" aria-hidden="true"><span /><i /><span /><i /><span /></div></Reveal><Reveal className="vl-principle-card"><Icon name="shield" size={30} /><span className="vl-card-number">II</span><h3>Proof</h3><p>Show that an action is allowed.<br />Not everything behind it.</p><div className="vl-mini-proof" aria-hidden="true"><span /><span /><Icon name="check" size={14} /></div></Reveal><Reveal className="vl-principle-card"><Icon name="revoke" size={30} /><span className="vl-card-number">III</span><h3>Control</h3><p>Give access a purpose.<br />Give it an end.</p><div className="vl-mini-authority" aria-hidden="true"><span /><i /><Icon name="clock" size={14} /></div></Reveal></div></section>;
}

function Experience() {
  return <section id="experience" className="vl-section vl-container" aria-labelledby="vl-experience-title"><div className="vl-wide-heading"><SectionHeading index="02" label="EXPERIENCE" id="vl-experience-title" title={<>Choose what crosses the veil.</>}>Switch contexts. Choose an optional detail. See exactly what the example recipient would receive.</SectionHeading><span className="vl-margin-note">SELECTIVE DISCLOSURE.<br />NOT ALL-OR-NOTHING ACCESS.</span></div><Reveal><DisclosurePreview /></Reveal></section>;
}

function Flow() {
  return <section id="flow" className="vl-section vl-container vl-editorial-row" aria-labelledby="vl-flow-title"><SectionHeading index="03" label="THE FLOW" id="vl-flow-title" title={<>From intent<br />to control.</>}>A clear path from private context to scoped authority.</SectionHeading><ol className="vl-steps">{steps.map((step, index) => <li key={step.label}><span className="vl-step-number">0{index + 1}</span><h3>{step.label}</h3><p>{step.text}</p></li>)}</ol></section>;
}

function Boundaries() {
  return <section className="vl-section vl-container vl-editorial-row vl-boundaries" aria-labelledby="vl-boundaries-title"><SectionHeading index="04" label="BUILT IN THE OPEN" id="vl-boundaries-title" title={<>Trust needs<br />clear boundaries.</>}>A research prototype, not a promise of production anonymity.</SectionHeading><div className="vl-faq"><Disclosure question="What can I try today?"><p>The repository includes context personas, scoped authorization, receipts, verifier views and revocation. Its Midnight prototype works against a local offline ledger. The interaction above is a fictional UI preview, not a cryptographic demonstration.</p><a className="vl-inline-link" href={validationDoc} target="_blank" rel="noreferrer">Read validation notes<Icon name="arrow-up-right" size={14} /></a></Disclosure><Disclosure question="Does opening the website run Midnight proofs?"><p>No. The public frontend does not supply the local Node Core and proof server. Open the app to inspect the interface; follow the repository setup to run the local proof-backed workflow. No public-chain deployment or real settlement is claimed.</p></Disclosure><Disclosure question="What does revocation actually do?"><p>Revocation stops future use when the Core checks current validity. It cannot erase information already disclosed. The trusted Core knows persona relationships, and the local proof server receives private witness data. This single-user prototype is not audited anonymity.</p><a className="vl-inline-link" href={securityDoc} target="_blank" rel="noreferrer">Read the security boundary<Icon name="arrow-up-right" size={14} /></a></Disclosure></div></section>;
}

function FinalCTA() {
  return <section className="vl-final"><div className="vl-container vl-final-inner"><div className="vl-final-art" aria-hidden="true"><img src="/veil/envelope.svg" alt="" width="640" height="420" loading="lazy" /><img className="vl-final-seal" src="/veil/wax-seal.svg" alt="" width="220" height="220" loading="lazy" /></div><div><p className="vl-eyebrow">YOUR IDENTITY. YOUR TERMS.</p><h2>Go straight into the product.</h2></div><AppLink /></div></section>;
}

export default function LandingPage() {
  return <div className="vl-site" data-veil-version="editorial-living-1"><a className="vl-skip" href="#vl-main">Skip to content</a><Header /><main id="vl-main"><Hero /><PrincipleStrip /><LivingVeil /><Philosophy /><Experience /><Flow /><Boundaries /><FinalCTA /></main><footer className="vl-footer vl-container"><Wordmark footer /><span>A MORE INTENTIONAL INTERNET.</span><div><a href={securityDoc} target="_blank" rel="noreferrer">Security boundaries<Icon name="arrow-up-right" size={12} /></a><a href={repository} target="_blank" rel="noreferrer">Source<Icon name="arrow-up-right" size={12} /></a></div></footer></div>;
}
