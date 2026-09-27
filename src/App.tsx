import { useEffect, useState } from "react";
import {
  api,
  connect,
  verifyEnvelope,
  type Context,
  type Envelope,
  type PublicView,
  type State,
} from "./protocol";

const empty: State = {
  root: null,
  personas: [],
  latestLink: null,
  serverTime: 0,
};
const labels: Record<Context, string> = {
  daily: "Merchant / POS",
  api: "Paid API",
  defi: "DeFi sandbox",
};
const short = (id: string) => `${id.slice(0, 10)}…${id.slice(-6)}`;
function Receipt({ envelope }: { envelope: Envelope }) {
  return (
    <details className="receipt">
      <summary>Inspect proof and receipt</summary>
      {envelope.zk && (
        <div className="execution">
          <strong>✓ MIDNIGHT ZK VERIFIED</strong>
          <p>
            {envelope.zk.circuit} ·{" "}
            {envelope.zk.transactionBytes.toLocaleString()} transaction bytes ·{" "}
            {(envelope.zk.elapsedMs / 1000).toFixed(1)}s
          </p>
          <code className="signature">{envelope.zk.transactionHash}</code>
          <p className="micro">
            Real proof verified by Midnight ledger locally. No network
            submission.
          </p>
        </div>
      )}
      <pre>{JSON.stringify(JSON.parse(envelope.payload), null, 2)}</pre>
      <p className="micro">
        Ed25519 signature over the exact payload · no root identifier included
      </p>
      <code className="signature">{envelope.signature}</code>
    </details>
  );
}
function Header({ verifier = false }: { verifier?: boolean }) {
  return (
    <header>
      <a className="brand" href="/">
        <span className="logo">V</span>VEIL
        <span className="brand-label">
          {verifier ? "/ VERIFIER" : "/ PRIVATE CORE"}
        </span>
      </a>
      <nav>
        <a
          href="https://github.com/sapgun/VEIL"
          target="_blank"
          rel="noreferrer"
        >
          Source ↗
        </a>
        <span className="network">
          <i /> MIDNIGHT ZK / LOCAL
        </span>
      </nav>
    </header>
  );
}
function Notice() {
  return (
    <div className="notice">
      <span>PROTOTYPE BOUNDARY</span>
      <p>
        Real Midnight ZK proofs verified against a local ledger. Mock issuer and
        simulated actions; no public network deployment. The trusted Core holds
        the root. Encrypted phone pairing is not connected.
      </p>
    </div>
  );
}
function Verifier() {
  const requested =
    new URLSearchParams(location.search).get("context") ?? "daily";
  const context = Object.hasOwn(labels, requested)
    ? (requested as Context)
    : null;
  const [view, setView] = useState<PublicView>();
  const [verified, setVerified] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function refresh() {
    if (!context) return;
    setBusy(true);
    setError("");
    setVerified(false);
    setView(undefined);
    try {
      const next = await api<PublicView>(`public/view?context=${context}`);
      setView(next);
      if (next.envelope) setVerified(await verifyEnvelope(next.envelope));
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    void refresh();
  }, []);
  return (
    <div className="shell">
      <Header verifier />
      <main>
        <section className="intro compact">
          <p className="eyebrow">CONTEXT-SCOPED DISCLOSURE</p>
          <h1>{context ? labels[context] : "Unknown context"}</h1>
          <p className="lede">
            This view requests only one context’s receipt.
            <br />
            No owner dashboard, root identifier or other personas in the
            response.
          </p>
        </section>
        <Notice />
        <section className="verifier-card">
          <div className="section-title">
            <h2>Counterparty view</h2>
            <button
              className="quiet"
              disabled={busy || !context}
              onClick={() => void refresh()}
            >
              Refresh receipt
            </button>
          </div>
          <div className="result-symbol">{verified ? "✓" : "◇"}</div>
          <h3 className="result-status">{view?.current ?? "WAITING"}</h3>
          <p className="center muted">
            {view?.envelope
              ? verified
                ? "Midnight ZK proof and receipt signature verified"
                : "Proof not verified"
              : "Authorize this context in the owner dashboard first."}
          </p>
          {view?.envelope && <Receipt envelope={view.envelope} />}
          {view?.execution && (
            <p className="execution">
              {JSON.parse(view.execution.payload).description}
            </p>
          )}
          <p className="micro">
            Status is a snapshot from the last refresh. A signature alone does
            not establish current validity, anonymity, or a ZK proof. All
            verifier screens here share one trusted local demo process.
          </p>
        </section>
        {error && (
          <p role="alert" className="error">
            {error}
          </p>
        )}
      </main>
      <Footer />
    </div>
  );
}
function Footer() {
  return (
    <footer>
      <span className="brand">VEIL</span>
      <p>Unlink by Default. Link by Consent.</p>
      <span>EXPERIMENTAL / MIDNIGHT KOREA</span>
    </footer>
  );
}

export default function App() {
  if (location.pathname === "/verifier") return <Verifier />;
  return <Owner />;
}
function Owner() {
  const [state, setState] = useState<State>(empty);
  const [connected, setConnected] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [context, setContext] = useState<Context>("daily");
  const [amount, setAmount] = useState("12");
  const [receipt, setReceipt] = useState<Envelope | null>(null);
  const [denied, setDenied] = useState(false);
  const [execution, setExecution] = useState<Envelope | null>(null);
  const [pair, setPair] = useState<Context[]>(["daily", "defi"]);
  const [consent, setConsent] = useState(false);
  const [link, setLink] = useState<Envelope | null>(null);
  const [linkStatus, setLinkStatus] = useState("");
  const [now, setNow] = useState(Date.now());
  const [resetConfirm, setResetConfirm] = useState(false);
  const selected = state.personas.find((p) => p.context === context);
  const payload = receipt ? JSON.parse(receipt.payload) : null;
  const linkPayload = link ? JSON.parse(link.payload) : null;
  const remaining = payload
    ? Math.max(0, Math.ceil((payload.expiresAt - now) / 1000))
    : 0;
  const active = state.root?.status === "MOCK VERIFIED";

  async function refresh() {
    const next = await api<State>("owner/state");
    setState(next);
    setConnected(true);
    return next;
  }
  async function boot() {
    setBusy(true);
    setError("");
    try {
      await connect();
      await refresh();
    } catch {
      setConnected(false);
      setError(
        "Desktop Core is offline. Start it with npm run demo, then reconnect.",
      );
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    void boot();
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  async function run(work: () => Promise<void>) {
    setBusy(true);
    setError("");
    try {
      await work();
      await refresh();
    } catch (cause) {
      setError((cause as Error).message);
      try {
        await refresh();
      } catch {
        setConnected(false);
      }
    } finally {
      setBusy(false);
      setNow(Date.now());
    }
  }
  function clearReceipt() {
    setReceipt(null);
    setExecution(null);
    setDenied(false);
  }
  function choose(next: Context) {
    setContext(next);
    setAmount(
      String(state.personas.find((p) => p.context === next)?.amount ?? 1),
    );
    clearReceipt();
    setError("");
  }
  async function authorize() {
    clearReceipt();
    await run(async () => {
      try {
        const envelope = await api<Envelope>("owner/authorize", {
          context,
          amount: Number(amount),
        });
        if (!(await verifyEnvelope(envelope)))
          throw new Error("Signature verification failed");
        setReceipt(envelope);
      } catch (cause) {
        setDenied(true);
        throw cause;
      }
    });
  }
  async function execute() {
    if (!receipt) return;
    await run(async () => {
      const result = await api<Envelope>("public/execute", {
        envelope: receipt,
        context,
        nonce: payload.nonce,
      });
      if (!(await verifyEnvelope(result)))
        throw new Error("Execution receipt signature failed");
      setExecution(result);
    });
  }
  async function revoke(target: Context | "root") {
    await run(async () => {
      await api("owner/revoke", { context: target });
      clearReceipt();
      setLink(null);
      setLinkStatus("");
      setConsent(false);
    });
  }
  function toggle(next: Context) {
    setPair((current) =>
      current.includes(next)
        ? current.filter((p) => p !== next)
        : current.length < 2
          ? [...current, next]
          : [current[0], next],
    );
    setConsent(false);
    setLink(null);
    setLinkStatus("");
  }
  return (
    <div className="shell">
      <Header />
      <main>
        <section className="intro">
          <div>
            <p className="eyebrow">PRIVATE ECONOMIC IDENTITY LAYER</p>
            <h1>
              One root.
              <br />
              <span>Many possibilities.</span>
            </h1>
            <p className="lede">
              Separate identities for separate contexts.
              <br />
              Reveal the connection only when you choose.
            </p>
          </div>
          <div className="root-visual" aria-hidden="true">
            <div className="root-orbit">◈</div>
            <div className="branches">
              <span>◒</span>
              <span>⌘</span>
              <span>◇</span>
            </div>
            <p>ONE PRINCIPAL / THREE PERSONAS</p>
          </div>
        </section>
        <Notice />
        <section className="root-card">
          <div className="root-label">
            <span className="root-icon">◈</span>
            <div>
              <p className="eyebrow">YOUR PRIVATE ROOT</p>
              <h2>{state.root?.status ?? "Create your demo identity"}</h2>
              <p className="micro">
                {state.root
                  ? "Root secret stays in Desktop Core memory. No real identity collected."
                  : "A mock issuer creates a fresh root and three context-derived personas."}
              </p>
            </div>
          </div>
          <div className="root-actions">
            <span className={"connection " + (connected ? "online" : "")}>
              {connected ? "● Core connected" : "○ Core offline"}
            </span>
            {!state.root ? (
              <button
                className="primary"
                disabled={busy || !connected}
                onClick={() =>
                  void run(async () => {
                    await api("owner/setup", {});
                  })
                }
              >
                Create mock verified root ↗
              </button>
            ) : (
              <button
                className="danger"
                disabled={busy || !active}
                onClick={() => void revoke("root")}
              >
                Revoke root
              </button>
            )}
            {!connected && (
              <button
                className="quiet"
                disabled={busy}
                onClick={() => void boot()}
              >
                Reconnect
              </button>
            )}
          </div>
        </section>
        {state.latestProof && (
          <p className="execution" role="status">
            ✓ Midnight ZK verified: {state.latestProof.circuit} ·{" "}
            {state.latestProof.transactionBytes.toLocaleString()} transaction
            bytes · {(state.latestProof.elapsedMs / 1000).toFixed(1)}s · offline
            ledger
          </p>
        )}
        <section className="personas-section">
          <div className="section-title">
            <div>
              <p className="eyebrow">01 / CONTEXT PERSONAS</p>
              <h2>Same owner. Separate presentations.</h2>
            </div>
            <span className="micro">Owner-only overview</span>
          </div>
          <div className="persona-grid">
            {(["daily", "api", "defi"] as Context[]).map((key, index) => {
              const p = state.personas.find((item) => item.context === key);
              return (
                <article
                  key={key}
                  className={`persona-card ${context === key ? "selected" : ""} ${p?.revoked || (state.root && !active) ? "revoked" : ""}`}
                >
                  <div className="persona-top">
                    <span className="persona-glyph">
                      {["◒", "⌘", "◇"][index]}
                    </span>
                    <span className="tag">
                      {!p
                        ? "NOT CREATED"
                        : p.revoked || !active
                          ? "REVOKED"
                          : "ACTIVE"}
                    </span>
                  </div>
                  <h3>{key.toUpperCase()}</h3>
                  <p className="muted">{labels[key]}</p>
                  <code className="persona-id" title={p?.id}>
                    {p ? short(p.id) : "Awaiting private root"}
                  </code>
                  <p className="micro">
                    {p
                      ? `Up to ${p.limit} demo units / ${p.action}`
                      : "Context-bound authority"}
                  </p>
                  <div className="card-actions">
                    <button
                      className="select-persona"
                      aria-label={`Use ${key.toUpperCase()} persona`}
                      aria-pressed={context === key}
                      disabled={busy || !p}
                      onClick={() => choose(key)}
                    >
                      {context === key ? "Selected ✓" : "Use persona →"}
                    </button>
                    <button
                      className="revoke-button"
                      aria-label={`Revoke ${key.toUpperCase()}`}
                      disabled={busy || !p || p.revoked || !active}
                      onClick={() => void revoke(key)}
                    >
                      Revoke
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
        <section className="workspace">
          <div className="request-panel">
            <p className="eyebrow">02 / PRIVATE AUTHORIZATION</p>
            <h2>{labels[context]}</h2>
            <p className="muted">
              Approve only this context, action and amount.
            </p>
            <div className="request-meta">
              <span>Counterparty</span>
              <strong>{selected?.target ?? "—"}</strong>
              <span>Action</span>
              <strong>{selected?.action ?? "—"}</strong>
              <span>Validity</span>
              <strong>60 seconds · one use</strong>
            </div>
            <form
              onSubmit={(event) => {
                event.preventDefault();
                void authorize();
              }}
            >
              <label htmlFor="amount">Amount in fictional demo units</label>
              <input
                id="amount"
                type="number"
                min="1"
                step="1"
                value={amount}
                disabled={busy || !state.root}
                onChange={(event) => {
                  setAmount(event.target.value);
                  clearReceipt();
                }}
              />
              <p className="micro">
                Demo mandate limit: {selected?.limit ?? "—"}. Try a higher
                amount to demonstrate denial.
              </p>
              <button
                type="submit"
                className="primary"
                disabled={busy || !connected || !state.root}
              >
                {busy
                  ? "Generating ZK proof…"
                  : "Generate Midnight ZK proof ↗"}
              </button>
            </form>
            <p className="micro">
              Root verification is mocked. Amount, context, expiry and
              revocation checks run in the local Core.
            </p>
          </div>
          <div className="public-panel">
            <p className="eyebrow">WHAT THIS COUNTERPARTY RECEIVES</p>
            <div className="result" aria-live="polite">
              <div className="result-symbol">
                {denied ? "×" : execution ? "↗" : receipt ? "✓" : "◇"}
              </div>
              <h3 className="result-status">
                {denied
                  ? "DENIED"
                  : execution
                    ? "EXECUTED"
                    : receipt
                      ? remaining > 0
                        ? "AUTHORIZED"
                        : "EXPIRED"
                      : "AWAITING REQUEST"}
              </h3>
              <p>
                {execution
                  ? JSON.parse(execution.payload).description
                  : receipt
                    ? "Midnight ZK verified. Hidden root membership proven."
                    : "Only the selected persona and its scoped authorization."}
              </p>
            </div>
            <div className="disclosure">
              <span>Root secret / identity</span>
              <strong>NOT DISCLOSED</strong>
              <span>Other persona IDs</span>
              <strong>NOT DISCLOSED</strong>
              <span>Other context activity</span>
              <strong>NOT DISCLOSED</strong>
            </div>
            <button
              className="delegate"
              disabled={
                busy ||
                !receipt ||
                !!execution ||
                remaining === 0 ||
                !active ||
                selected?.revoked
              }
              onClick={() => void execute()}
            >
              Execute simulated action <span>→</span>
            </button>
            <div className="receipt-footer">
              <span>
                {receipt && !execution
                  ? `Expires in ${remaining}s`
                  : "No payment or real swap"}
              </span>
              {execution && (
                <button
                  className="text-button"
                  disabled={busy}
                  onClick={() => void execute()}
                >
                  Test replay rejection
                </button>
              )}
              <a
                href={`/verifier?context=${context}`}
                target="_blank"
                rel="noreferrer"
              >
                Open verifier ↗
              </a>
            </div>
            {receipt && <Receipt envelope={receipt} />}
          </div>
        </section>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <section className="link-section">
          <div>
            <p className="eyebrow">03 / LINK BY CONSENT</p>
            <h2>
              Reveal a connection.
              <br />
              <span>Keep the root private.</span>
            </h2>
            <p className="muted">
              Select exactly two personas. The unselected persona is omitted
              from the signed relationship statement.
            </p>
            <p className="micro">
              A real Midnight proof demonstrates that both selected personas
              derive from the same hidden, enrolled root. The third persona is
              not disclosed.
            </p>
          </div>
          <div className="link-controls">
            <fieldset disabled={busy || !active}>
              <legend>Personas to disclose together</legend>
              <div className="pair-options">
                {state.personas.map((p) => (
                  <label
                    key={p.context}
                    className={pair.includes(p.context) ? "checked" : ""}
                  >
                    <input
                      type="checkbox"
                      checked={pair.includes(p.context)}
                      disabled={p.revoked}
                      onChange={() => toggle(p.context)}
                    />
                    {p.name}
                  </label>
                ))}
              </div>
              <label className="consent">
                <input
                  type="checkbox"
                  checked={consent}
                  onChange={(event) => setConsent(event.target.checked)}
                />
                I consent to revealing that{" "}
                {pair.map((p) => p.toUpperCase()).join(" + ") ||
                  "the selected personas"}{" "}
                share a principal.
              </label>
              <button
                className="primary"
                disabled={
                  !consent ||
                  pair.length !== 2 ||
                  pair.some(
                    (key) =>
                      state.personas.find((p) => p.context === key)?.revoked,
                  )
                }
                onClick={() =>
                  void run(async () => {
                    setLink(null);
                    setLinkStatus("");
                    const result = await api<Envelope>("owner/link", {
                      contexts: pair,
                      consent,
                    });
                    if (!(await verifyEnvelope(result)))
                      throw new Error("Link signature failed");
                    await api("public/verify-link", { envelope: result });
                    setLink(result);
                    setLinkStatus("SAME HIDDEN PRINCIPAL — ZK VERIFIED");
                    setConsent(false);
                  })
                }
              >
                Generate selective link ZK proof ↗
              </button>
            </fieldset>
            {link && (
              <div className="link-result" aria-live="polite">
                <h3>{linkStatus}</h3>
                <p>
                  Disclosed:{" "}
                  {linkPayload.personas
                    .map((p: { context: string }) => p.context.toUpperCase())
                    .join(" + ")}{" "}
                  only
                </p>
                <p className="micro">
                  {now >= linkPayload.expiresAt
                    ? "Expired — create a new statement."
                    : "Short-lived statement · 60 seconds"}
                </p>
                <button
                  className="quiet"
                  disabled={busy}
                  onClick={() =>
                    void run(async () => {
                      setLinkStatus("CHECKING");
                      try {
                        await api("public/verify-link", { envelope: link });
                        setLinkStatus("ZK VERIFIED · CURRENTLY VALID");
                      } catch (cause) {
                        setLinkStatus("NOT CURRENTLY VALID");
                        throw cause;
                      }
                    })
                  }
                >
                  Check current validity
                </button>
                <Receipt envelope={link} />
              </div>
            )}
          </div>
        </section>
        <section className="roadmap">
          <div>
            <p className="eyebrow">MIDNIGHT INTEGRATION</p>
            <h2>The privacy target.</h2>
            <p className="muted">
              A hidden root membership proof, context-bound authorization,
              consented same-root proof and revocation. Compact compilation and
              real proof verification run locally. Network deployment and funded
              transactions remain out of scope.
            </p>
          </div>
          <div className="reset-box">
            <p className="micro">
              All state is in memory. Restarting Core or resetting discards this
              demo identity and invalidates its receipts.
            </p>
            {!resetConfirm ? (
              <button
                className="quiet"
                disabled={busy || !state.root}
                onClick={() => setResetConfirm(true)}
              >
                Reset demo…
              </button>
            ) : (
              <div className="reset-actions">
                <button
                  className="danger"
                  disabled={busy}
                  onClick={() =>
                    void run(async () => {
                      await api("owner/reset", {});
                      clearReceipt();
                      setLink(null);
                      setLinkStatus("");
                      setConsent(false);
                      setResetConfirm(false);
                    })
                  }
                >
                  Discard demo identity
                </button>
                <button
                  className="quiet"
                  disabled={busy}
                  onClick={() => setResetConfirm(false)}
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
