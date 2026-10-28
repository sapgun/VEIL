import { createCore } from "../server/core.mjs";
import { createPaymentService } from "../server/solana/payments.mjs";
import { createSolanaTransport, loadDevnetSigner, solanaConfig } from "../server/solana/transport.mjs";

// Explicit CLI prototype; no Midnight proof or autonomous agent claim.
try {
  const config = solanaConfig();
  const signer = await loadDevnetSigner(config.keypairPath);
  const transport = createSolanaTransport({ ...config, signer });
  await transport.assertDevnet();
  console.log(JSON.stringify({ network: "solana:devnet", payer: signer.address,
    provider: config.provider, authority: "local-owner-policy", privacy: "public-transfer" }));
  if (process.argv.includes("--execute")) {
    if (!config.enabled) throw new Error("Set VEIL_SOLANA_ENABLED=1 to enable Devnet payment execution");
    const arg = (key) => process.argv.find((a) => a.startsWith(`--${key}=`))?.slice(key.length + 3);
    const recipient = arg("recipient");
    const lamports = arg("lamports");
    if (!recipient || !lamports) throw new Error("Specify --recipient=ADDRESS and --lamports=INTEGER");
    const core = createCore(); core.setup();
    const payments = createPaymentService({ core, transport });
    const mandate = payments.grant({ context: "api", recipient, maxLamports: lamports, ttlMs: 60000, consent: true });
    const intent = payments.createIntent({ mandateId: mandate.id, lamports });
    let receipt = await payments.execute(intent.id);
    console.log(JSON.stringify(receipt));
    for (let poll = 0; poll < 10 && ["submitted", "unknown"].includes(receipt.status); poll++) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      receipt = await payments.refresh(intent.id);
    }
    console.log(JSON.stringify(receipt));
    if (receipt.signature) console.log(`https://explorer.solana.com/tx/${receipt.signature}?cluster=devnet`);
    if (!["confirmed", "finalized"].includes(receipt.status)) process.exitCode = 1;
  }
} catch (error) {
  // Transport errors are sanitized in the module; key-file errors omit contents.
  console.error(error.message);
  process.exitCode = 1;
}
