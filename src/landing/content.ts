import type { IconName } from './icon-paths';

export const repository = 'https://github.com/sapgun/VEIL';
export const securityDoc = `${repository}/blob/main/docs/SECURITY.md`;
export const validationDoc = `${repository}/blob/main/docs/VALIDATION.md`;
export const principles: { icon: IconName; label: string; text: string }[] = [
  { icon: 'eye-off', label: 'UNLINK BY DEFAULT', text: 'Separate contexts. One private root.' },
  { icon: 'users', label: 'LINK BY CONSENT', text: 'You decide what connects.' },
  { icon: 'shield', label: 'MINIMAL DISCLOSURE', text: 'Share only what a moment needs.' },
  { icon: 'clock', label: 'SCOPED AUTHORITY', text: 'Set a limit. Keep an exit.' },
];
export const contexts = [
  { key: 'daily', label: 'Daily', icon: 'briefcase' as const, audience: 'Merchant / POS', action: 'Approve a purchase', amount: '12 demo units', subject: 'daily_7b3f…a19c', purpose: 'A purchase is not your whole financial life.', consent: 'Share the purchase category', optional: 'Purchase category', value: 'Everyday essentials' },
  { key: 'api', label: 'API', icon: 'code' as const, audience: 'Paid API', action: 'Authorize API access', amount: '5 demo units', subject: 'api_91ce…2f80', purpose: 'Give an agent a task, not your entire identity.', consent: 'Share the task category', optional: 'Task category', value: 'Research request' },
  { key: 'defi', label: 'DeFi', icon: 'cube' as const, audience: 'DeFi sandbox', action: 'Authorize a sandbox action', amount: '8 demo units', subject: 'defi_42d1…c063', purpose: 'Keep an experimental context separate.', consent: 'Share the strategy category', optional: 'Strategy category', value: 'Sandbox simulation' },
] as const;
export const steps = [
  { label: 'Create a root', text: 'Start with a private root in the local Core.' },
  { label: 'Separate contexts', text: 'Present a different persona for each context.' },
  { label: 'Authorize an action', text: 'Approve a specific scope and inspect its receipt.' },
  { label: 'End future access', text: 'Expire or revoke authority. Past disclosures stay disclosed.' },
];
