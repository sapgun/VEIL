import { useEffect, useState } from 'react';
import { ACTION, createDemoSession, type Receipt } from './authorization';

export default function App() {
  const [session] = useState(() => createDemoSession());
  const [value, setValue] = useState('27');
  const [visible, setVisible] = useState(false);
  const [receipt, setReceipt] = useState<Receipt>();
  const [executed, setExecuted] = useState(false);
  const [error, setError] = useState('');
  const [time, setTime] = useState(Date.now());
  useEffect(() => { const timer = window.setInterval(() => setTime(Date.now()), 1000); return () => clearInterval(timer); }, []);
  const remaining = receipt ? Math.max(0, Math.ceil((receipt.expiresAt - time) / 1000)) : 0;
  const status = executed ? 'EXECUTED' : receipt ? receipt.authorized ? remaining ? 'AUTHORIZED' : 'EXPIRED' : 'NOT AUTHORIZED' : 'AWAITING INPUT';
  function clearAuthorization() { session.invalidate(); setReceipt(undefined); setExecuted(false); setError(''); }
  function evaluate() {
    clearAuthorization();
    try { setReceipt(session.evaluate(value)); setValue(''); setVisible(false); setTime(Date.now()); }
    catch (cause) { setError((cause as Error).message); }
  }
  function execute() {
    try { session.execute(receipt!.id, ACTION); setExecuted(true); setError(''); }
    catch (cause) { setError((cause as Error).message); setTime(Date.now()); }
  }
  return <div className="shell">
    <header><a className="brand" href="#"><span className="brand-mark">V</span>VEIL<span className="brand-sub">/ LAB</span></a><nav aria-label="Main"><a href="#how-it-works">The protocol</a><a href="https://github.com/sapgun/VEIL" target="_blank" rel="noreferrer">GitHub ↗</a></nav><span className="network"><i />MIDNIGHT CONCEPT</span></header>
    <main>
      <section className="intro"><div><p className="eyebrow">PRIVATE DELEGATED AUTHORIZATION</p><h1>Permission.<br /><span>Without exposure.</span></h1><p className="lede">An agent needs your permission.<br />It doesn’t need your personal data.</p></div><div className="intro-note"><span className="orbit">◈</span><p>Reveal the decision.<br />Keep the credential.</p><span className="tiny">VEIL MINI / HACKATHON MVP</span></div></section>
      <div className="notice"><span className="pill">SIMULATION MODE</span><p>Try the flow locally. No ZK proof is generated, no wallet is connected, and no transaction is sent. Compact source is included in the repository.</p></div>
      <section className="workspace" aria-label="Authorization demo">
        <div className="private-panel"><div className="panel-heading"><span className="step">01</span><h2>Your private side</h2><span className="tag">LOCAL MEMORY</span></div><p className="muted">Use a fictional value. The demo never sends it to a server.</p>
          <div className="policy"><span className="tiny">REQUESTED POLICY</span><div>Age eligibility <span>≥ 18</span></div><p>One fixed rule. One scoped action.</p></div>
          <form onSubmit={event => { event.preventDefault(); evaluate(); }}><label htmlFor="credential">Private age value</label><div className="input-row"><input id="credential" type={visible ? 'text' : 'password'} inputMode="numeric" autoComplete="off" maxLength={3} value={value} onChange={event => { clearAuthorization(); setValue(event.target.value); }} placeholder="Enter demo age" aria-describedby="input-help" /><button type="button" className="reveal" aria-label={visible ? 'Hide private value' : 'Show private value'} onClick={() => setVisible(!visible)}>{visible ? 'Hide' : 'Show'}</button></div><p id="input-help" className="input-help">0–150, whole numbers only. Input clears after evaluation.</p><button className="primary" type="submit">Evaluate privately <span>↗</span></button></form>
          <p className="security-note"><span>◇</span> Self-asserted demo input, not a verified credential.</p>
        </div>
        <div className="public-panel"><div className="panel-heading"><span className="step">02</span><h2>What the agent sees</h2><span className="tag">RESULT ONLY</span></div><div className={'result ' + (receipt?.authorized ? 'success' : '')} aria-live="polite"><div className="result-symbol">{executed ? '↗' : receipt ? receipt.authorized ? '✓' : '×' : '◇'}</div><p className="tiny">{receipt ? 'LOCAL SIMULATION RESULT' : 'AWAITING YOUR AUTHORIZATION'}</p><h3>{status}</h3><p>{executed ? 'Demo access reserved. No external action was taken.' : receipt ? receipt.authorized ? 'Eligibility passed. The raw value is omitted from this receipt.' : 'Policy not satisfied. Delegation remains locked.' : 'Your credential stays on your side of the boundary.'}</p></div>
          <div className="scope"><div><span className="tiny">DELEGATED SCOPE</span><strong>Reserve demo access</strong></div><span className="scope-limit">1 use / 60 sec</span></div>
          <button className="delegate" disabled={!receipt?.authorized || executed || remaining === 0} onClick={execute}>{executed ? '✓ Action simulated' : 'Delegate action'}<span>→</span></button>
          <div className="receipt-footer"><span>{receipt?.authorized && !executed ? `Expires in ${remaining}s` : 'No identity or raw age in receipt'}</span><button onClick={() => { clearAuthorization(); setValue(''); setVisible(false); }}>Reset session</button></div>
        </div>
      </section>
      {error && <p className="error" role="alert">{error}</p>}
      {receipt && <details className="receipt"><summary>Inspect public-shaped receipt · simulation only</summary><pre>{JSON.stringify(receipt, null, 2)}</pre><p>This is an unsigned local object, not a proof or transferable authorization token.</p></details>}
      <section className="explanation" id="how-it-works"><div><p className="eyebrow">MINIMUM DISCLOSURE. EXPLICIT SCOPE.</p><h2>A smaller surface<br />for trust.</h2></div><ol><li><span>01 / PRIVATE INPUT</span><p>A value is evaluated against a fixed policy. This prototype uses self-asserted input.</p></li><li><span>02 / POLICY RESULT</span><p>The receipt omits the raw value. The included Compact scaffold models the private witness check.</p></li><li><span>03 / SCOPED ACTION</span><p>The local agent simulation consumes a single-use permission. Real verification is the next milestone.</p></li></ol></section>
    </main><footer><span className="brand">VEIL</span><p>Midnight Korea Hackathon · Experimental MVP</p><span>PRIVATE BY INTENT. HONEST BY DESIGN.</span></footer>
  </div>;
}
