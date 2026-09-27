import { afterEach, describe, expect, it } from "vitest";
import { createApp } from "./http.mjs";
import { get } from "node:http";

const servers = [];
afterEach(async () => {
  await Promise.all(
    servers.splice(0).map(
      (server) =>
        new Promise((resolve) => {
          server.closeAllConnections();
          server.close(resolve);
        }),
    ),
  );
});
async function start() {
  const server = createApp();
  servers.push(server);
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const url = `http://127.0.0.1:${server.address().port}`;
  const { token } = await (await fetch(url + "/api/session")).json();
  const post = (route, data = {}, owner = true, extra = {}) =>
    fetch(url + "/api/" + route, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(owner ? { "X-Veil-Session": token } : {}),
        ...extra,
      },
      body: JSON.stringify(data),
    });
  return { url, post };
}
describe("HTTP trust boundary", () => {
  it("requires owner token and blocks cross-origin/host requests", async () => {
    const { url, post } = await start();
    expect((await post("owner/setup", {}, false)).status).toBe(401);
    expect(
      (await post("owner/setup", {}, true, { Origin: "https://evil.example" }))
        .status,
    ).toBe(403);
    const wrongHostStatus = await new Promise((resolve, reject) => {
      get(
        url + "/api/session",
        { headers: { Host: "evil.example" } },
        (response) => {
          response.resume();
          resolve(response.statusCode);
        },
      ).on("error", reject);
    });
    expect(wrongHostStatus).toBe(403);
    expect((await post("owner/setup")).status).toBe(200);
  });
  it("runs authorization, public execution, selective link and revocation through HTTP", async () => {
    const { url, post } = await start();
    await post("owner/setup");
    const envelope = await (
      await post("owner/authorize", { context: "daily", amount: 12 })
    ).json();
    const nonce = JSON.parse(envelope.payload).nonce;
    expect(
      (
        await post(
          "public/execute",
          { envelope, context: "daily", nonce },
          false,
        )
      ).status,
    ).toBe(200);
    expect(
      (
        await post(
          "public/execute",
          { envelope, context: "daily", nonce },
          false,
        )
      ).status,
    ).toBe(400);
    const link = await (
      await post("owner/link", { contexts: ["daily", "defi"], consent: true })
    ).json();
    expect(
      (await post("public/verify-link", { envelope: link }, false)).status,
    ).toBe(200);
    await post("owner/revoke", { context: "daily" });
    expect(
      (await post("owner/authorize", { context: "daily", amount: 12 })).status,
    ).toBe(400);
    expect(
      (await post("public/verify-link", { envelope: link }, false)).status,
    ).toBe(400);
    const view = await (
      await fetch(url + "/api/public/view?context=daily")
    ).json();
    expect(view.current).toBe("REVOKED");
    expect(view.root).toBeUndefined();
  });
  it("handles malformed input without exposing stack traces", async () => {
    const { url } = await start();
    const response = await fetch(url + "/api/public/execute", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{",
    });
    expect(response.status).toBe(400);
    expect(Object.keys(await response.json())).toEqual(["error"]);
  });
});
