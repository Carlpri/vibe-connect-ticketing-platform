import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createOrderSchema } from '../modules/orders/orders.schemas';
import { AppError } from '../shared/errors/AppError';
import { OrdersService } from '../modules/orders/orders.service';

const eventId = '039ade48-d94f-4f0f-9bd0-102daf11303e';
const ticketTypeId = '8f238be6-d453-4629-8f96-8f1b057fd24b';

describe('booking input and payment safety', () => {
  it('ignores client-submitted ticket prices', () => {
    const result = createOrderSchema.parse({
      eventId,
      items: [{ ticketTypeId, quantity: 2, unitPriceKes: 1 }],
    });

    assert.deepEqual(result, {
      eventId,
      items: [{ ticketTypeId, quantity: 2 }],
    });
  });

  it('rejects malformed IDs and repeated ticket types', () => {
    assert.equal(createOrderSchema.safeParse({
      eventId: 'not-a-uuid',
      items: [{ ticketTypeId, quantity: 1 }],
    }).success, false);

    assert.equal(createOrderSchema.safeParse({
      eventId,
      items: [
        { ticketTypeId, quantity: 1 },
        { ticketTypeId, quantity: 1 },
      ],
    }).success, false);
  });

  it('does not allow client-side payment confirmation', async () => {
    await assert.rejects(OrdersService.confirmPayment(), (error: unknown) =>
      error instanceof AppError && error.statusCode === 501
    );
  });
});
