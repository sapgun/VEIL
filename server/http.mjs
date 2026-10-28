import { createServer } from "node:http";
import { randomBytes } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve, extname, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { createCore } from "./core.mjs";

const dist = fileURLToPath(new URL("../dist/", import.meta.url));
export function createApp(core = createCore(), { solana, delegation } = {}) {
  const sessionToken = randomBytes(32).toString("hex");
  return createServer(async (req, res) => {
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Referrer-Policy", "no-referrer");
    res.setHeader(
      "Content-Security-Policy",
      "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; worker-src 'self'; manifest-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'",
    );
    const send = (status, value) => {
      res.writeHead(status, { "Content-Type": "application/json" });
      res.end(JSON.stringify(value));
    };
    try {
      const host = req.headers.host ?? "";
      const expected = `http://127.0.0.1:${req.socket.localPort}`;
      if (host !== `127.0.0.1:${req.socket.localPort}`)
        return send(403, { error: "Loopback host required" });
      if (req.headers.origin && req.headers.origin !== expected)
        return send(403, { error: "Cross-origin request blocked" });
      if (
        req.headers["sec-fetch-site"] &&
        !["same-origin", "none"].includes(req.headers["sec-fetch-site"])
      )
        return send(403, { error: "Cross-site request blocked" });
      const url = new URL(req.url, expected);
      const path = url.pathname;
      if (path.startsWith("/api/")) {
        if (req.method === "GET" && path === "/api/session")
          return send(200, { token: sessionToken });
        if (req.method === "GET" && path === "/api/public/key")
          return send(200, core.publicKey());
        if (req.method === "GET" && path === "/api/public/view")
          return send(200, core.verifierView(url.searchParams.get("context")));
        if (
          path.startsWith("/api/owner/") &&
          req.headers["x-veil-session"] !== sessionToken
        )
          return send(401, { error: "Owner session required" });
        if (req.method === "GET" && path === "/api/owner/state")
          return send(200, core.snapshot());
        if (req.method === "GET" && path === "/api/owner/solana/info")
          return send(200, solana?.info() ?? { enabled: false, network: "solana:devnet" });
        if (req.method === "GET" && path === "/api/agent/info")
          return delegation ? send(200, delegation.info()) : send(503, { error: "Agent adapter is disabled" });
        if (req.method !== "POST")
          return send(405, { error: "Method not allowed" });
        if (req.headers["content-type"]?.split(";")[0] !== "application/json")
          return send(415, { error: "JSON required" });
        let buffer = "";
        for await (const chunk of req) {
          buffer += chunk;
          if (Buffer.byteLength(buffer) > 16_384)
            return send(413, { error: "Request too large" });
        }
        const body = JSON.parse(buffer || "{}");
        if (path.startsWith("/api/agent/") || path.startsWith("/api/owner/agents/")) {
          if (!delegation) return send(503, { error: "Agent adapter is disabled" });
          switch (path) {
            case "/api/owner/agents/register": return send(200, delegation.register(body));
            case "/api/owner/agents/offer": return send(200, delegation.offer(body));
            case "/api/owner/agents/revoke": return send(200, delegation.revokeAgent(body.agentId));
            case "/api/owner/agents/revoke-mandate": return send(200, delegation.revokeMandate(body.mandateId));
            case "/api/owner/agents/status": return send(200, await delegation.ownerStatus(body));
            case "/api/agent/connect": return send(200, delegation.connect(body));
            case "/api/agent/inbox": return send(200, delegation.inbox(body));
            case "/api/agent/accept": return send(200, delegation.accept(body));
            case "/api/agent/pay": return send(200, await delegation.pay(body));
            case "/api/agent/status": return send(200, await delegation.status(body));
            default: return send(404, { error: "Route not found" });
          }
        }
        if (path.startsWith("/api/owner/solana/")) {
          if (!solana) return send(503, { error: "Solana adapter is disabled" });
          switch (path) {
            case "/api/owner/solana/mandates":
              return send(200, solana.grant(body));
            case "/api/owner/solana/revoke":
              return send(200, solana.revoke(body.mandateId));
            case "/api/owner/solana/intents":
              return send(200, solana.createIntent(body));
            case "/api/owner/solana/execute":
              return send(200, await solana.execute(body.intentId));
            case "/api/owner/solana/status":
              return send(200, await solana.refresh(body.intentId));
            default:
              return send(404, { error: "Route not found" });
          }
        }
        switch (path) {
          case "/api/owner/setup":
            return send(200, await core.setup());
          case "/api/owner/reset":
            return send(200, await core.reset());
          case "/api/owner/revoke":
            return send(200, await core.revoke(body.context));
          case "/api/owner/authorize":
            return send(200, await core.authorize(body.context, body.amount));
          case "/api/owner/link":
            return send(200, await core.link(body.contexts, body.consent));
          case "/api/public/execute":
            return send(
              200,
              await core.execute(body.envelope, body.context, body.nonce),
            );
          case "/api/public/verify-proof":
            return send(200, core.verifyProof(body.envelope));
          case "/api/public/verify-link":
            return send(200, await core.verifyLink(body.envelope));
          default:
            return send(404, { error: "Route not found" });
        }
      }
      if (req.method !== "GET")
        return send(405, { error: "Method not allowed" });
      const decoded = decodeURIComponent(path);
      const relative =
        ["/", "/app", "/app/", "/verifier"].includes(decoded)
          ? "index.html"
          : decoded.slice(1);
      const filename = resolve(dist, relative);
      if (!filename.startsWith(resolve(dist) + sep))
        return send(403, { error: "Forbidden path" });
      const content = await readFile(filename);
      const types = {
        ".html": "text/html; charset=utf-8",
        ".js": "text/javascript",
        ".css": "text/css",
        ".svg": "image/svg+xml",
        ".webmanifest": "application/manifest+json",
      };
      res.writeHead(200, {
        "Content-Type": types[extname(filename)] ?? "application/octet-stream",
      });
      res.end(content);
    } catch (error) {
      send(error.code === "ENOENT" ? 404 : 400, {
        error:
          error.code === "ENOENT"
            ? "Build the frontend first with npm run build"
            : error.message,
      });
    }
  });
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const port = Number(process.env.PORT ?? 43127);
  const { createZkCore } = await import("./zk-core.mjs");
  const core = createZkCore();
  let solana;
  let delegation;
  if (process.env.VEIL_AGENTS_ENABLED === "1" && process.env.VEIL_SOLANA_ENABLED !== "1")
    throw new Error("Agent payments require the explicitly enabled Devnet Solana adapter");
  if (process.env.VEIL_SOLANA_ENABLED === "1") {
    const { solanaConfig, loadDevnetSigner, createSolanaTransport } = await import("./solana/transport.mjs");
    const { createPaymentService } = await import("./solana/payments.mjs");
    const config = solanaConfig();
    const signer = await loadDevnetSigner(config.keypairPath);
    const transport = createSolanaTransport({ ...config, signer });
    solana = createPaymentService({ core, transport });
    if (process.env.VEIL_AGENTS_ENABLED === "1") {
      const { createAgentStore } = await import("./agents/store.mjs");
      const { createDelegationService } = await import("./agents/delegation.mjs");
      const store = createAgentStore(process.env.VEIL_AGENT_DB_PATH ?? ".private/agents.sqlite");
      delegation = createDelegationService({ core, transport, store });
    }
  }
  createApp(core, { solana, delegation }).listen(port, "127.0.0.1", () =>
    console.log(
      `VEIL Desktop Core: http://127.0.0.1:${port} (Midnight offline ledger; Solana Devnet adapter ${solana ? "enabled" : "disabled"})`,
    ),
  );
}

