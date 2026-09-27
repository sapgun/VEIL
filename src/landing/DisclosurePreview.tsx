import { useId, useRef, useState, type KeyboardEvent } from 'react';
import { AppLink, Icon } from './primitives';
import { contexts } from './content';

/** Fictional UI exercise only. Does not generate a proof, call a wallet, or change app state.
 * Tabs composition follows shadcn's documented tab/list/trigger/panel model.
 * Arrow/Home/End focus management is local; no dependency on Radix/Base UI.
 */
export function DisclosurePreview() {
  const [selected, setSelected] = useState(0);
  const [consent, setConsent] = useState(false);
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const id = useId().replace(/:/g, '');
  const context = contexts[selected];
  function select(index: number) { setSelected(index); setConsent(false); }
  function onKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    let next = index;
    if (event.key === 'ArrowRight') next = (index + 1) % contexts.length;
    else if (event.key === 'ArrowLeft') next = (index + contexts.length - 1) % contexts.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = contexts.length - 1;
    else return;
    event.preventDefault(); select(next); refs.current[next]?.focus();
  }
  return <div className="vl-preview">
    <div className="vl-preview-top"><span className="vl-micro">A MOMENT, NOT YOUR WHOLE IDENTITY.</span><span className="vl-preview-label">INTERFACE PREVIEW</span></div>
    <div role="tablist" aria-label="Example interaction context" className="vl-tabs">
      {contexts.map((item, index) => <button type="button" role="tab" id={`${id}-tab-${index}`} aria-selected={selected === index} aria-controls={`${id}-panel-${index}`} tabIndex={selected === index ? 0 : -1} key={item.key} ref={node => { refs.current[index] = node; }} onKeyDown={event => onKeyDown(event, index)} onClick={() => select(index)}><Icon name={item.icon} size={20} />{item.label}<span className="vl-tab-audience">{item.audience}</span></button>)}
    </div>
    {contexts.map((item, index) => <div role="tabpanel" id={`${id}-panel-${index}`} aria-labelledby={`${id}-tab-${index}`} hidden={selected !== index} tabIndex={0} key={item.key}>
      {selected === index && <div className="vl-preview-body">
        <div className="vl-preview-private">
          <span className="vl-micro">01 / YOUR SIDE</span><h3>{context.purpose}</h3>
          <p>Your root and other contexts are not part of this example disclosure.</p>
          <div className="vl-private-field"><span><Icon name="lock" size={15} />Private root</span><span className="vl-redaction" aria-label="Not disclosed" /></div>
          <div className="vl-private-field"><span><Icon name="eye-off" size={15} />Other personas</span><span className="vl-redaction vl-redaction--short" aria-label="Not disclosed" /></div>
          <label className="vl-consent"><input type="checkbox" checked={consent} onChange={event => setConsent(event.target.checked)} /><span className="vl-switch" aria-hidden="true" /><span>{context.consent}<small>Optional. Off until you choose.</small></span></label>
        </div>
        <div className="vl-preview-transfer" aria-hidden="true"><span /><Icon name="arrow-right" size={22} /><span /></div>
        <div className="vl-preview-receipt">
          <div className="vl-receipt-head"><span className="vl-micro">02 / COUNTERPARTY VIEW</span><Icon name="receipt" size={24} /></div>
          <h3>Only this context.</h3>
          <dl><div><dt>Context persona</dt><dd>{context.subject}</dd></div><div><dt>Permitted action</dt><dd>{context.action}</dd></div><div><dt>Amount</dt><dd>{context.amount}</dd></div><div><dt>Illustrative lifetime</dt><dd>60 seconds · one use</dd></div><div className="vl-optional-row"><dt>{context.optional}</dt><dd>{consent ? context.value : 'Not disclosed'}</dd></div></dl>
          <p className="vl-receipt-note"><Icon name="info" size={14} />Fictional example. No proof has been generated.</p>
        </div>
      </div>}
    </div>)}
    <div className="vl-preview-bottom"><p aria-live="polite" role="status">{consent ? `${context.optional} included by your choice.` : 'Optional detail stays private. Nothing is transmitted.'}</p><AppLink compact>Try the app</AppLink></div>
  </div>;
}
