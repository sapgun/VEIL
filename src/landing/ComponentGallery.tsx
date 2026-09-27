import { AppLink, Disclosure, Icon, Wordmark } from './primitives';
import { Button, CopyButton, EmptyState, Notice, StatusBadge, TextField, type BadgeStatus } from './controls';
import { iconPaths, type IconName } from './icon-paths';
import './tokens.css';
import './landing.css';

export default function ComponentGallery() {
  return <div className="vl-site"><header className="vl-header"><div className="vl-container vl-header-inner"><Wordmark /><a href="/">Back to landing</a><AppLink compact /></div></header><main className="vl-container vl-gallery"><p className="vl-eyebrow">VEIL / COMPONENT LIBRARY / 1.0</p><h1>One visual language.<br />Every state considered.</h1><p>Developer reference. Demonstration states below are fictional, not live verification results.</p>
    <section className="vl-gallery-section"><h2>01 / Actions</h2><div className="vl-gallery-row"><AppLink /><Button>Generate proof</Button><Button variant="quiet">Inspect receipt</Button><Button variant="danger">Revoke access</Button><Button disabled>Waiting for Core</Button></div></section>
    <section className="vl-gallery-section"><h2>02 / Semantic states</h2><div className="vl-gallery-row">{(['private','shared','verified','revoked','expired','pending'] as BadgeStatus[]).map(status => <StatusBadge key={status} status={status} />)}</div></section>
    <section className="vl-gallery-section"><h2>03 / Inputs</h2><div className="vl-gallery-grid"><TextField label="Public action label" placeholder="Research request" hint="Never enter keys or real personal documents." /><TextField label="Expiry in seconds" type="number" defaultValue="60" min={1} max={3600} hint="Local policy, not a network transaction." /><TextField label="Mandate amount" defaultValue="150" error="Amount exceeds this fictional 100-unit limit." /></div></section>
    <section className="vl-gallery-section"><h2>04 / Receipts and boundaries</h2><div className="vl-gallery-grid"><Notice title="Research prototype">Local offline ledger only. The page is not an independent proof verifier.</Notice><EmptyState title="No receipt yet">Authorize an action in the local app before inspecting a real receipt.</EmptyState><div><Disclosure question="What is shown here?"><p>Only design-system examples. No wallet session or private data is collected.</p></Disclosure><CopyButton text={'{"example":true,"context":"daily","proof":null}'} /></div></div></section>
    <section className="vl-gallery-section"><h2>05 / Line icons</h2><div className="vl-gallery-icons">{(Object.keys(iconPaths) as IconName[]).map(name => <div key={name}><Icon name={name} size={26} /><span>{name}</span></div>)}</div></section>
    <section className="vl-gallery-section"><h2>06 / Production assets</h2><div className="vl-gallery-assets">{['wordmark.svg','monogram.svg','wax-seal.svg','envelope.svg','archival-paper.svg','vellum.svg','context-map.svg','portrait-512.webp','archive-grid.svg','registration.svg','divider.svg','redaction.svg'].map(file => <figure key={file}><img src={`/veil/${file}`} alt={file} loading="lazy" /><figcaption>{file}</figcaption></figure>)}</div></section>
  </main></div>;
}
