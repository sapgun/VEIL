import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import Landing from "./Landing";
import { AppLink } from "./landing/primitives";
import { Redaction } from "./landing/controls";

// Static contract tests; interactive keyboard/motion behavior is covered by browser QA.
const render = () => renderToStaticMarkup(<Landing />);

describe("VEIL editorial landing", () => {
  it("routes all four product CTAs directly to /app", () => {
    const html = render();
    const productLinks = [...html.matchAll(/<a\b[^>]*data-app-link="true"[^>]*>/g)].map(match => match[0]);
    expect(productLinks).toHaveLength(4);
    for (const link of productLinks) {
      expect(link).toContain('href="/app"');
      expect(link).not.toContain('target="_blank"');
    }
    expect(html.match(/href="\/app"/g)).toHaveLength(4);
    expect(html).toContain("APP");
    expect(html).toContain("Open app");
    expect(html).toContain("Try the app");
  });

  it("keeps the shared app action a real navigable anchor", () => {
    const html = renderToStaticMarkup(<AppLink compact>APP</AppLink>);
    expect(html).toMatch(/^<a\b/);
    expect(html).toContain('href="/app"');
    expect(html).not.toContain("<button");
    expect(html).not.toContain('role="dialog"');
  });

  it("uses native-size concept art plus independent vector assets", () => {
    const html = render();
    expect(html).toContain('/veil/portrait-512.webp');
    expect(html).toContain('/veil/portrait-256.webp 256w, /veil/portrait-512.webp 512w');
    expect(html).toContain('sizes="256px"');
    expect(html).toContain('width="512" height="512"');
    for (const asset of ['wordmark.svg', 'envelope.svg', 'wax-seal.svg', 'vellum.svg']) {
      expect(html).toContain(`/veil/${asset}`);
    }
    expect(html).not.toContain('/veil-portrait.svg');
    expect(html).not.toContain("iPhone");
  });

  it("distinguishes the local Midnight implementation from the public frontend", () => {
    const html = render();
    expect(html).toContain("Its Midnight prototype works against a local offline ledger.");
    expect(html).toContain("The public frontend does not supply the local Node Core and proof server.");
    expect(html).toContain("No public-chain deployment or real settlement is claimed.");
    expect(html).toContain("docs/SECURITY.md");
    expect(html).toContain("docs/VALIDATION.md");
  });

  it("labels the disclosure exercise as fictional with optional sharing off", () => {
    const html = render();
    expect(html).toContain("INTERFACE PREVIEW");
    expect(html).toContain("Fictional example. No proof has been generated.");
    expect(html).toContain("Optional detail stays private. Nothing is transmitted.");
    const inputs = html.match(/<input\b[^>]*type="checkbox"[^>]*>/g) ?? [];
    expect(inputs).toHaveLength(1);
    expect(inputs[0]).not.toMatch(/\bchecked(?:=|\s|\/?>)/);
  });

  it("exposes three correctly linked tabs with one initially active panel", () => {
    const html = render();
    const tabs = [...html.matchAll(/<button\b[^>]*role="tab"[^>]*>/g)].map(match => match[0]);
    expect(tabs).toHaveLength(3);
    expect(tabs.filter(tab => tab.includes('aria-selected="true"'))).toHaveLength(1);
    expect(tabs.filter(tab => tab.includes('tabindex="0"'))).toHaveLength(1);
    expect(html.match(/role="tabpanel"/g)).toHaveLength(3);
    for (const tab of tabs) {
      const target = tab.match(/aria-controls="([^"]+)"/)?.[1];
      expect(target).toBeTruthy();
      expect(html).toContain(`id="${target}"`);
    }
    expect(html).toContain('role="status"');
    expect(html).toContain('aria-live="polite"');
  });

  it("does not present revocation as erasing past disclosures or audited anonymity", () => {
    const html = render();
    expect(html).toContain("It cannot erase information already disclosed.");
    expect(html).toContain("The trusted Core knows persona relationships");
    expect(html).toContain("not audited anonymity");
  });

  it("renders redactions without a hidden sensitive value", () => {
    const html = renderToStaticMarkup(<Redaction />);
    expect(html).toContain('aria-label="Private value not sent to this view"');
    expect(html).not.toContain("data-secret");
    expect(html).toMatch(/><\/span>$/);
  });
});
