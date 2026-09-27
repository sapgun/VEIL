/** Structural adapter scaffold. Bind to the generated Witnesses<PrivateState>
 * type after compilation; this file is not used by the browser simulation. */
export type PrivateState = { age: bigint };
export const witnesses = {
  privateAge: ({ privateState }: { privateState: PrivateState }): [PrivateState, bigint] => {
    if (privateState.age < 0n || privateState.age > 150n) throw new Error('Invalid demo age');
    return [privateState, privateState.age];
  },
};
