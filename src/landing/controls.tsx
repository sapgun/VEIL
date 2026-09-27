import { useId, useState, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode } from 'react';
import { Icon } from './primitives';

export function Button({ children, variant = 'primary', className = '', type = 'button', ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'quiet' | 'danger' }) {
  return <button type={type} className={`vl-ui-button vl-ui-button--${variant} ${className}`} {...props}>{children}</button>;
}
export type BadgeStatus = 'private' | 'shared' | 'verified' | 'revoked' | 'expired' | 'pending';
/** Display-only status. Never infer verification from this badge. */
export function StatusBadge({ status }: { status: BadgeStatus }) {
  return <span className={`vl-badge vl-badge--${status}`}><span aria-hidden="true" />{status}</span>;
}
/** Receives no sensitive value: CSS redaction must never conceal real secrets in DOM. */
export function Redaction({ short = false }: { short?: boolean }) {
  return <span className={`vl-redaction ${short ? 'vl-redaction--short' : ''}`} role="img" aria-label="Private value not sent to this view" />;
}
export function TextField({ label, hint, error, id: givenId, ...props }: InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: string; error?: string }) {
  const auto = useId(); const id = givenId ?? auto;
  return <div className="vl-field"><label htmlFor={id}>{label}</label><input id={id} aria-invalid={Boolean(error)} aria-describedby={hint || error ? `${id}-help` : undefined} {...props} />{(hint || error) && <p id={`${id}-help`} className={error ? 'vl-field-error' : 'vl-field-hint'}>{error || hint}</p>}</div>;
}
export function Notice({ title, children }: { title: string; children: ReactNode }) {
  return <aside className="vl-notice"><Icon name="info" size={20} /><div><strong>{title}</strong><p>{children}</p></div></aside>;
}
export function EmptyState({ title, children }: { title: string; children: ReactNode }) {
  return <div className="vl-empty"><Icon name="receipt" size={32} /><h3>{title}</h3><p>{children}</p></div>;
}
export function CopyButton({ text, label = 'Copy public receipt' }: { text: string; label?: string }) {
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  async function copy() {
    setBusy(true); setMessage('');
    try {
      if (!navigator.clipboard) throw new Error('Clipboard unavailable');
      await navigator.clipboard.writeText(text); setMessage('Copied.');
    } catch { setMessage('Clipboard unavailable. Select and copy the receipt text.'); }
    finally { setBusy(false); }
  }
  return <div className="vl-copy"><Button variant="quiet" disabled={busy} onClick={() => void copy()}><Icon name="copy" size={15} />{label}</Button><span role="status" aria-live="polite">{message}</span></div>;
}
