# Living Veil — superseded by Atmosphere C

The standalone stage in the original Living Veil implementation was rejected during visual review: regular curtain stripes, avatar-like silhouettes and a conspicuous mobile fallback did not fit VEIL's photographic/editorial direction.

It has been removed from production along with its WebGL engine and mask assets. The replacement is documented in [ATMOSPHERE-C.md](./ATMOSPHERE-C.md): three low-contrast, asymmetric page-wide material layers plus photographic echoes inside the existing hero. There is no added storytelling section or forced scroll travel.

The previous implementation is retained in Git history at `1b24ef39f86d3a630ad500d5b26e1ba0a48322dd`, not loaded by the current landing. The browser workflow filename is retained for continuity, but its tests and artifacts now describe the C revision.
