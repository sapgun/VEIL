import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import Landing from "./Landing";
import { AppLink } from "./landing/primitives";
import { Redaction } from "./landing/controls";
const render = () => renderToStaticMarkup(<Landing />);
describe("VEIL editorial landing", () => {
  it("routes all four product CTAs directly to /app", () => {
    const html=render();
    const links=[...html.matchAll(/<a\b[^>]*data-app-link="true"[^>]*>/g)].map(m=>m[0]);
    expect(links).toHaveLength(4);
    for(const link of links){expect(link).toContain('href="/app"');expect(link).not.toContain('target="_blank"');}
    expect(html.match(/href="\/app"/g)).toHaveLength(4);
    for(const label of ['APP','Open app','Try the app'])expect(html).toContain(label);
  });
  it("keeps the shared app action a real anchor", () => {
    const html=renderToStaticMarkup(<AppLink compact>APP</AppLink>);
    expect(html).toMatch(/^<a\b/);expect(html).toContain('href="/app"');expect(html).not.toContain('<button');
  });
  it("uses the supplied photographic presence and excludes the old mask stage", () => {
    const html=render();
    expect(html).toContain('/veil/atmosphere/presence.webp');
    expect(html).toContain('width="512" height="640"');
    for(const asset of ['wordmark.svg','envelope.svg','wax-seal.svg'])expect(html).toContain(`/veil/${asset}`);
    for(const removed of ['vl-living-stage','Skip scene','Still composition','/veil/motion/','iPhone'])expect(html).not.toContain(removed);
    expect(html.match(/data-veil-sheet=/g)).toHaveLength(3);
    expect(html.match(/data-photo-echo=/g)).toHaveLength(3);
  });
  it("distinguishes local Midnight from the public frontend", () => {
    const html=render();
    expect(html).toContain('Its Midnight prototype works against a local offline ledger.');
    expect(html).toContain('The public frontend does not supply the local Node Core and proof server.');
    expect(html).toContain('No public-chain deployment or real settlement is claimed.');
    expect(html).toContain('docs/SECURITY.md');expect(html).toContain('docs/VALIDATION.md');
  });
  it("labels the disclosure exercise fictional with sharing off", () => {
    const html=render();
    expect(html).toContain('Fictional example. No proof has been generated.');
    expect(html).toContain('Optional detail stays private. Nothing is transmitted.');
    const inputs=html.match(/<input\b[^>]*type="checkbox"[^>]*>/g)??[];
    expect(inputs).toHaveLength(1);expect(inputs[0]).not.toMatch(/\bchecked(?:=|\s|\/?>)/);
  });
  it("exposes three accessible tabs and one initially active panel", () => {
    const html=render(),tabs=[...html.matchAll(/<button\b[^>]*role="tab"[^>]*>/g)].map(m=>m[0]);
    expect(tabs).toHaveLength(3);expect(tabs.filter(t=>t.includes('aria-selected="true"'))).toHaveLength(1);
    expect(tabs.filter(t=>t.includes('tabindex="0"'))).toHaveLength(1);
    expect(html.match(/role="tabpanel"/g)).toHaveLength(3);
    for(const tab of tabs){const target=tab.match(/aria-controls="([^"]+)"/)?.[1];expect(target).toBeTruthy();expect(html).toContain(`id="${target}"`);}
    expect(html).toContain('aria-live="polite"');
  });
  it("retains the limitations on past disclosures and anonymity", () => {
    const html=render();expect(html).toContain('It cannot erase information already disclosed.');
    expect(html).toContain('The trusted Core knows persona relationships');expect(html).toContain('not audited anonymity');
  });
  it("renders redactions without a hidden sensitive value", () => {
    const html=renderToStaticMarkup(<Redaction />);expect(html).toContain('aria-label="Private value not sent to this view"');
    expect(html).not.toContain('data-secret');expect(html).toMatch(/><\/span>$/);
  });
});
