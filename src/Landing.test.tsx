import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import Landing from "./Landing";

describe("VEIL landing", () => {
  it("routes all three product CTAs directly to /app", () => {
    const html = renderToStaticMarkup(<Landing />);
    expect(html.match(/href="\/app"/g)).toHaveLength(3);
    expect(html).toContain("APP");
    expect(html).toContain("Open app");
    expect(html).toContain("Enter the app");
  });
  it("uses the concept portrait instead of phone mockups", () => {
    const html = renderToStaticMarkup(<Landing />);
    expect(html).toContain('/veil-portrait.svg');
    expect(html).toContain("Reveal only");
    expect(html).not.toContain("iPhone");
  });
  it("does not represent local signatures as a deployed Midnight proof", () => {
    const html = renderToStaticMarkup(<Landing />);
    expect(html).toContain("not Midnight zero-knowledge proofs");
    expect(html).toContain("No real funds or personal documents");
  });
});
