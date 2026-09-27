/** Structural example only. Replace the generic path with the compiler-generated
 * Merkle path type and check against generated Witnesses<PrivateState<Path>>. */
export type PrivateState<Path> = {
  rootSecret: Uint8Array;
  issuerSecret?: Uint8Array;
  membershipPath: Path;
};
export function createWitnesses<Path>() {
  return {
    rootSecret: ({
      privateState,
    }: {
      privateState: PrivateState<Path>;
    }): [PrivateState<Path>, Uint8Array] => {
      if (privateState.rootSecret.length !== 32)
        throw new Error("Expected 32-byte root secret");
      return [privateState, privateState.rootSecret];
    },
    issuerSecret: ({
      privateState,
    }: {
      privateState: PrivateState<Path>;
    }): [PrivateState<Path>, Uint8Array] => {
      if (privateState.issuerSecret?.length !== 32)
        throw new Error("Issuer role required");
      return [privateState, privateState.issuerSecret];
    },
    membershipPath: ({
      privateState,
    }: {
      privateState: PrivateState<Path>;
    }): [PrivateState<Path>, Path] => [
      privateState,
      privateState.membershipPath,
    ],
  };
}
