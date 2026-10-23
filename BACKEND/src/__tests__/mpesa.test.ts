import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { formatDarajaTimestamp } from '../modules/orders/mpesa.service';

describe('Daraja request formatting', () => {
  it('formats timestamps in East Africa Time for the STK password', () => {
    assert.equal(
      formatDarajaTimestamp(new Date('2026-10-23T05:00:00.000Z')),
      '20261023080000'
    );
  });
});
