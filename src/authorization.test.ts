import { describe, expect, it } from 'vitest';
import { ACTION, createDemoSession, parseAge, TTL_MS } from './authorization';

describe('local authorization model (not cryptographic verification)', () => {
  it.each(['', ' ', '-1', '18.1', '1e2', '151', 'NaN'])('rejects invalid value %j', input => expect(() => parseAge(input)).toThrow());
  it.each([['0', false], ['17', false], ['18', true], ['150', true]])('checks boundary %s', (input, expected) => {
    expect(createDemoSession().evaluate(input).authorized).toBe(expected);
  });
  it('omits the witness from the receipt', () => {
    expect(Object.keys(createDemoSession().evaluate('27')).sort()).toEqual(['action', 'authorized', 'expiresAt', 'id', 'issuedAt', 'mode', 'policy']);
  });
  it('requires approval, binds scope and consumes only once', () => {
    const session = createDemoSession();
    expect(() => session.execute('missing', ACTION)).toThrow();
    const denied = session.evaluate('17');
    expect(() => session.execute(denied.id, ACTION)).toThrow();
    const granted = session.evaluate('27');
    expect(() => session.execute(granted.id, 'transfer-funds')).toThrow();
    expect(session.execute(granted.id, ACTION).status).toBe('simulated');
    expect(() => session.execute(granted.id, ACTION)).toThrow();
  });
  it('rejects expired receipts at the exact deadline', () => {
    let time = 100;
    const session = createDemoSession(() => time);
    const receipt = session.evaluate('18');
    time += TTL_MS;
    expect(() => session.execute(receipt.id, ACTION)).toThrow(/expired/);
  });
  it('invalidates on edit/reset and failed reevaluation', () => {
    const session = createDemoSession();
    const receipt = session.evaluate('27');
    session.invalidate();
    expect(() => session.execute(receipt.id, ACTION)).toThrow();
    const next = session.evaluate('27');
    expect(() => session.evaluate('bad')).toThrow();
    expect(() => session.execute(next.id, ACTION)).toThrow();
  });
  it('does not trust mutated or superseded public receipts', () => {
    const session = createDemoSession();
    const denied = session.evaluate('17');
    denied.authorized = true;
    expect(() => session.execute(denied.id, ACTION)).toThrow();
    const old = session.evaluate('27');
    session.evaluate('28');
    expect(() => session.execute(old.id, ACTION)).toThrow();
  });
});
