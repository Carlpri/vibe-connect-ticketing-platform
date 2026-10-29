import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createEventSchema, flyerUrlSchema, updateEventSchema } from '../modules/events/events.schemas';

describe('event flyer URL validation', () => {
  const storedFlyerPath = '/uploads/flyers/6e9301d6-7a2c-4e29-9f62-241f485182fe.webp';

  it('accepts stored upload paths for event cover images and flyers', () => {
    const result = createEventSchema.safeParse({
      title: 'Flyer Test Event',
      description: 'A sufficiently long event description for validation.',
      category: 'Music',
      coverImage: storedFlyerPath,
      flyers: [storedFlyerPath],
      format: 'PHYSICAL',
      status: 'DRAFT',
      startsAt: '2026-11-01T10:00:00.000Z',
      endsAt: '2026-11-01T12:00:00.000Z',
      venue: 'Test Venue',
      ticketTypes: [{ name: 'Free', priceKes: 0, capacity: 100 }],
    });

    assert.equal(result.success, true);
    assert.equal(updateEventSchema.safeParse({
      coverImage: storedFlyerPath,
      flyers: [storedFlyerPath],
    }).success, true);
  });

  it('rejects unsupported paths and non-HTTP external URLs', () => {
    assert.equal(updateEventSchema.safeParse({ coverImage: '/uploads/other/image.webp' }).success, false);
    assert.equal(updateEventSchema.safeParse({ flyers: ['javascript:alert(1)'] }).success, false);
  });

  it('rejects malformed cover image data instead of exposing it as a flyer URL', () => {
    assert.equal(
      flyerUrlSchema.safeParse('{email: "organizer@example.com", callbackUrl: "https://example.com"}').success,
      false
    );
    assert.equal(flyerUrlSchema.safeParse(storedFlyerPath).success, true);
  });
});
