import { spawnSync } from 'node:child_process';
// Windows ships an unrelated compact.exe disk utility. Never invoke it here.
if (process.platform === 'win32') {
  console.error('Run contract compilation in WSL/Linux/macOS with the Midnight Compact toolchain. See contracts/README.md.');
  process.exit(1);
}
const args = ['compile', '+0.30.0', ...process.argv.slice(2), 'contracts/veil.compact', 'contracts/managed/veil'];
const result = spawnSync('compact', args, { stdio: 'inherit', shell: false });
if (result.error) console.error('Compact toolchain unavailable. See contracts/README.md.');
process.exit(result.status ?? 1);
