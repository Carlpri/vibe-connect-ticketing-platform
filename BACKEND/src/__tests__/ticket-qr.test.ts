import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildTicketQrPayload, parseAndVerifyTicketQrPayload } from '../shared/utils/ticketQr';

const SAMPLE_ID = '73744e61-2328-4e62-a036-c483ef009aff';

describe('ticket QR signing', () => {
  it('builds VC1 payload and verifies it', () => {
    const payload = buildTicketQrPayload(SAMPLE_ID);
    assert.equal(payload.startsWith('VC1:'), true);
    assert.equal(parseAndVerifyTicketQrPayload(payload), SAMPLE_ID);
  });

  it('creates distinct signed payloads for distinct ticket IDs', () => {
    const ticketIds = [
      SAMPLE_ID,
      '83744e61-2328-4e62-a036-c483ef009aff',
    ];
    const payloads = ticketIds.map(buildTicketQrPayload);

    assert.equal(new Set(payloads).size, ticketIds.length);
    assert.deepEqual(payloads.map(parseAndVerifyTicketQrPayload), ticketIds);
  });

  it('rejects tampered signature', () => {
    const payload = buildTicketQrPayload(SAMPLE_ID);
    const tampered = payload.slice(0, -3) + 'xxx';
    assert.equal(parseAndVerifyTicketQrPayload(tampered), null);
  });

  it('rejects legacy order-only codes', () => {
    assert.equal(parseAndVerifyTicketQrPayload('VIBE-CONNECT-ORD-123456'), null);
  });
});
