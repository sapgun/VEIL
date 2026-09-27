const repository = "https://github.com/sapgun/VEIL";

/** Editorial entry point. All product calls-to-action go directly to /app. */
export default function Landing() {
  return (
    <div className="veil-landing">
      <a className="veil-skip" href="#main">Skip to content</a>
      <header className="veil-header">
        <a className="veil-wordmark" href="/" aria-label="VEIL home">VEIL</a>
        <nav aria-label="Main navigation">
          <a href="#principles">The idea</a>
          <a href={repository} target="_blank" rel="noreferrer">Source ↗</a>
          <a className="veil-button veil-nav-app" href="/app">APP <span aria-hidden="true">↗</span></a>
        </nav>
      </header>
      <main id="main">
        <section className="veil-hero" aria-labelledby="veil-title">
          <div className="veil-hero-copy">
            <p className="veil-kicker"><span /> A PRIVATE ECONOMIC IDENTITY LAYER</p>
            <h1 id="veil-title">Reveal only<br /><em>what matters.</em></h1>
            <p className="veil-description">One identity. Separate contexts.<br />You decide when they connect.</p>
            <div className="veil-hero-actions">
              <a className="veil-button" href="/app">Open app <span aria-hidden="true">↗</span></a>
              <a className="veil-text-link" href="#principles">Discover VEIL <span aria-hidden="true">↓</span></a>
            </div>
            <p className="veil-prototype">RESEARCH PROTOTYPE · LOCAL SIGNED MODE</p>
          </div>
          <div className="veil-hero-art" aria-hidden="true">
            <img src="/veil-portrait.svg" alt="" fetchPriority="high" width="600" height="600" />
            <span className="veil-art-label">IDENTITY IS YOURS TO REVEAL.</span>
            <span className="veil-art-index">PRIVATE ARCHIVE / 001</span>
          </div>
          <div className="veil-hero-bottom"><span>UNLINK BY DEFAULT. LINK BY CONSENT.</span><a href="#principles" aria-label="Explore the principles">SCROLL TO EXPLORE ↓</a></div>
        </section>
        <section className="veil-principles" id="principles" aria-label="Three principles">
          <article><span className="veil-number">01 / SEPARATE</span><h2>One root. Your contexts.</h2><p>Present a different persona for a merchant, an API, or DeFi. Keep your private root out of the counterparty view.</p></article>
          <article><span className="veil-number">02 / CONSENT</span><h2>Connect on your terms.</h2><p>Link two personas only with explicit consent. Inspect exactly what a signed receipt reveals.</p></article>
          <article><span className="veil-number">03 / CONTROL</span><h2>Permission has an end.</h2><p>Authorize a specific action. Limit its lifetime. Revoke a persona or the root when you need to.</p></article>
        </section>
        <section className="veil-boundary" aria-label="Prototype limitations"><span>BEHIND THE VEIL</span><p>This prototype uses a local Core and signed receipts, not Midnight zero-knowledge proofs. Mock identity issuer; simulated actions. No real funds or personal documents.</p><a href={repository + "/blob/main/docs/SECURITY.md"} target="_blank" rel="noreferrer">Read the boundaries ↗</a></section>
      </main>
      <footer className="veil-footer"><a className="veil-wordmark" href="/">VEIL</a><span>Intent protected.</span><a href="/app">Enter the app ↗</a></footer>
    </div>
  );
}
