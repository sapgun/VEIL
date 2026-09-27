/** A local UX simulator. Never use its receipts as a security boundary. */
export const POLICY = 'age-at-least-18' as const;
export const ACTION = 'reserve-demo-access' as const;
export const TTL_MS = 60_000;
export type Receipt = {
  mode: 'simulation'; id: string; policy: typeof POLICY; action: typeof ACTION;
  authorized: boolean; issuedAt: number; expiresAt: number;
};
export type Execution = { action: typeof ACTION; status: 'simulated'; receiptId: string };

export function parseAge(input: string): number {
  if (!/^\d{1,3}$/.test(input)) throw new Error('Enter a whole number between 0 and 150.');
  const age = Number(input);
  if (age > 150) throw new Error('Enter a whole number between 0 and 150.');
  return age;
}

export function createDemoSession(now = () => Date.now(), id = () => crypto.randomUUID()) {
  let current: Receipt | undefined;
  let used = false;
  return {
    evaluate(input: string): Receipt {
      current = undefined;
      used = false;
      const age = parseAge(input);
      const issuedAt = now();
      current = { mode: 'simulation', id: id(), policy: POLICY, action: ACTION,
        authorized: age >= 18, issuedAt, expiresAt: issuedAt + TTL_MS };
      return { ...current };
    },
    invalidate() { current = undefined; used = false; },
    execute(receiptId: string, action: string): Execution {
      if (!current || current.id !== receiptId || !current.authorized)
        throw new Error('Evaluate an eligible credential first.');
      if (action !== current.action) throw new Error('This action is outside the approved scope.');
      if (used) throw new Error('This authorization has already been used.');
      if (now() >= current.expiresAt) throw new Error('Authorization expired. Evaluate again.');
      used = true;
      return { action: ACTION, status: 'simulated', receiptId: current.id };
    },
  };
}
