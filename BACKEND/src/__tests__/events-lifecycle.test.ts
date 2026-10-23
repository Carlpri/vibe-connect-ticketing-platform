import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  assertOrganizerMayPublish,
  managedEventFilter,
  publicUpcomingEventFilter,
} from '../modules/events/events.service';
import { AppError } from '../shared/errors/AppError';

describe('public event lifecycle filter', () => {
  it('includes published future and ongoing events, but excludes ended events at the exact boundary', () => {
    const now = new Date('2026-10-22T10:00:00.000Z');
    const filter = publicUpcomingEventFilter(now);
    const endsAtFilter = filter.endsAt as { gt: Date };

    assert.equal(filter.status, 'PUBLISHED');
    assert.equal(endsAtFilter.gt, now);
    assert.equal(new Date('2026-10-23T10:00:00.000Z') > endsAtFilter.gt, true);
    assert.equal(new Date('2026-10-22T10:30:00.000Z') > endsAtFilter.gt, true);
    assert.equal(new Date('2026-10-22T10:00:00.000Z') > endsAtFilter.gt, false);
    assert.equal(new Date('2026-10-22T09:59:59.999Z') > endsAtFilter.gt, false);
  });

  describe('organizer publishing approval', () => {
    it('allows organizers to save drafts while approval is pending', () => {
      assert.doesNotThrow(() => assertOrganizerMayPublish('ORGANIZER', 'PENDING', 'DRAFT'));
    });

    it('blocks publishing until an admin approves the organizer', () => {
      assert.throws(
        () => assertOrganizerMayPublish('ORGANIZER', 'PENDING', 'PUBLISHED'),
        (error: unknown) => error instanceof AppError && error.statusCode === 403
      );
      assert.throws(
        () => assertOrganizerMayPublish('ORGANIZER', 'REJECTED', 'PUBLISHED'),
        (error: unknown) => error instanceof AppError && error.statusCode === 403
      );
    });

    it('allows approved organizers and admins to publish', () => {
      assert.doesNotThrow(() => assertOrganizerMayPublish('ORGANIZER', 'APPROVED', 'PUBLISHED'));
      assert.doesNotThrow(() => assertOrganizerMayPublish('ADMIN', 'NONE', 'PUBLISHED'));
    });
  });

  it('scopes organizer history to its owner while allowing admins to view platform history', () => {
    const now = new Date('2026-10-22T10:00:00.000Z');
    const organizerFilter = managedEventFilter(
      { userId: 'organizer-a', role: 'ORGANIZER' },
      'past',
      now
    );
    const adminFilter = managedEventFilter(
      { userId: 'admin', role: 'ADMIN' },
      'past',
      now
    );

    assert.equal(organizerFilter.organizerId, 'organizer-a');
    assert.deepEqual(organizerFilter.endsAt, { lte: now });
    assert.equal(adminFilter.organizerId, undefined);
    assert.deepEqual(adminFilter.endsAt, { lte: now });
  });
});
