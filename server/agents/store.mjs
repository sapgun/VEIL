import { DatabaseSync } from "node:sqlite";
import { mkdirSync, chmodSync } from "node:fs";
import { dirname } from "node:path";
import { randomUUID } from "node:crypto";

export function createAgentStore(filename = ":memory:") {
  if (filename !== ":memory:") mkdirSync(dirname(filename), { recursive: true, mode: 0o700 });
  const db = new DatabaseSync(filename);
  if (filename !== ":memory:") chmodSync(filename, 0o600);
  db.exec("PRAGMA busy_timeout=5000; PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL;");
  db.exec("CREATE TABLE IF NOT EXISTS records (kind TEXT NOT NULL, id TEXT NOT NULL, value TEXT NOT NULL, PRIMARY KEY(kind,id))");
  const get = db.prepare("SELECT value FROM records WHERE kind=? AND id=?");
  const put = db.prepare("INSERT INTO records(kind,id,value) VALUES(?,?,?) ON CONFLICT(kind,id) DO UPDATE SET value=excluded.value");
  const list = db.prepare("SELECT value FROM records WHERE kind=? ORDER BY id");
  let nested = false;
  const transaction = (fn) => {
    if (nested) return fn();
    db.exec("BEGIN IMMEDIATE"); nested = true;
    try { const result = fn(); db.exec("COMMIT"); return result; }
    catch (error) { db.exec("ROLLBACK"); throw error; }
    finally { nested = false; }
  };
  const collection = (kind) => ({
    get(id) { const row = get.get(kind, id); return row ? JSON.parse(row.value) : undefined; },
    set(id, value) { put.run(kind, id, JSON.stringify(value)); },
    values() { return list.all(kind).map((r) => JSON.parse(r.value)); },
    get size() { return Number(db.prepare("SELECT count(*) AS n FROM records WHERE kind=?").get(kind).n); },
    reserve(id) {
      return transaction(() => {
        const row = this.get(id);
        if (row?.status !== "authorized") return null;
        row.status = "preparing"; this.set(id, row); return row;
      });
    },
  });
  const meta = collection("meta");
  transaction(() => { if (!meta.get("audience")) meta.set("audience", `veil:${randomUUID()}`); });
  return { audience: meta.get("audience"), transaction, collection, close: () => db.close(),
    payments: { mandates: collection("payment-mandates"), intents: collection("payment-intents") } };
}
