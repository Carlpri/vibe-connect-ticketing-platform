import jwt from 'jsonwebtoken';
import app from '../server';
import { prisma } from '../shared/utils/prisma';
import { env } from '../config/env';

const PORT = env.PORT || 3000;
const BASE_URL = `http://localhost:${PORT}`;

async function runTests() {
  console.log('====================================================');
  console.log('🧪 RUNNING EVENTS & TICKET TYPES COMPREHENSIVE TESTS');
  console.log('====================================================\n');

  // Ensure server is listening
  let server: any = null;
  await new Promise<void>((resolve) => {
    server = app.listen(PORT, () => {
      resolve();
    }).on('error', (err: any) => {
      if (err.code === 'EADDRINUSE') {
        // Already listening
        resolve();
      }
    });
  });

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: any) {
    if (condition) {
      console.log(`✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`❌ FAIL: ${testName}`);
      if (detail) console.error('   Details:', detail);
      failed++;
    }
  }

  // 1. Setup test users
  const organizer1 = await prisma.user.create({
    data: {
      email: `org1.${Date.now()}@vibeconnect.test`,
      name: 'Nairobi Beats Org',
      passwordHash: 'dummy',
      role: 'ORGANIZER',
      emailVerified: true,
      phoneVerified: true,
    },
  });

  const organizer2 = await prisma.user.create({
    data: {
      email: `org2.${Date.now()}@vibeconnect.test`,
      name: 'Rift Valley Events',
      passwordHash: 'dummy',
      role: 'ORGANIZER',
      emailVerified: true,
      phoneVerified: true,
    },
  });

  const attendee = await prisma.user.create({
    data: {
      email: `att.${Date.now()}@vibeconnect.test`,
      name: 'Kenyan Raver',
      passwordHash: 'dummy',
      role: 'ATTENDEE',
      emailVerified: true,
      phoneVerified: true,
    },
  });

  const org1Token = jwt.sign(
    { userId: organizer1.id, email: organizer1.email, role: organizer1.role },
    env.JWT_SECRET,
    { expiresIn: '1h' }
  );

  const org2Token = jwt.sign(
    { userId: organizer2.id, email: organizer2.email, role: organizer2.role },
    env.JWT_SECRET,
    { expiresIn: '1h' }
  );

  const attendeeToken = jwt.sign(
    { userId: attendee.id, email: attendee.email, role: attendee.role },
    env.JWT_SECRET,
    { expiresIn: '1h' }
  );

  let createdEventId: string = '';
  let createdEventSlug: string = '';
  let draftEventId: string = '';

  try {
    // ----------------------------------------------------
    // Section A: Security & Authorization Enforcement
    // ----------------------------------------------------

    // 1. Unauthenticated creation is rejected (401)
    const unauthRes = await fetch(`${BASE_URL}/api/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Unauthorized Event' }),
    });
    assert(unauthRes.status === 401, 'Unauthenticated event creation is rejected (401)');

    // 2. User without organizer role (ATTENDEE) is rejected (403)
    const forbiddenRes = await fetch(`${BASE_URL}/api/events`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${attendeeToken}`,
      },
      body: JSON.stringify({
        title: 'Hacked Event',
        description: 'Should be rejected',
        category: 'Music',
        startsAt: new Date(Date.now() + 86400000).toISOString(),
        endsAt: new Date(Date.now() + 172800000).toISOString(),
        venue: 'Carnivore',
        ticketTypes: [{ name: 'Regular', priceKes: 1000, capacity: 100 }],
      }),
    });
    assert(forbiddenRes.status === 403, 'Attendee without event-management role is forbidden (403)');

    // ----------------------------------------------------
    // Section B: Input & Business Logic Validation
    // ----------------------------------------------------

    // 3. Invalid dates rejected (endsAt <= startsAt)
    const badDatesRes = await fetch(`${BASE_URL}/api/events`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${org1Token}`,
      },
      body: JSON.stringify({
        title: 'Time Travel Fest',
        description: 'Ends before it starts',
        category: 'Music',
        startsAt: new Date(Date.now() + 172800000).toISOString(),
        endsAt: new Date(Date.now() + 86400000).toISOString(),
        venue: 'Ngong Racecourse',
        ticketTypes: [{ name: 'Regular', priceKes: 1000, capacity: 100 }],
      }),
    });
    assert(badDatesRes.status === 400, 'Invalid dates (endsAt <= startsAt) are rejected (400)');

    // 4. Invalid ticket price (negative) rejected
    const badPriceRes = await fetch(`${BASE_URL}/api/events`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${org1Token}`,
      },
      body: JSON.stringify({
        title: 'Negative Price Gig',
        description: 'Should fail validation',
        category: 'Music',
        startsAt: new Date(Date.now() + 86400000).toISOString(),
        endsAt: new Date(Date.now() + 172800000).toISOString(),
        venue: 'Alchemist Bar',
        ticketTypes: [{ name: 'Regular', priceKes: -500, capacity: 100 }],
      }),
    });
    assert(badPriceRes.status === 400, 'Negative ticket price is rejected by validation (400)');

    // 5. Physical event without venue name is rejected
    const noVenueRes = await fetch(`${BASE_URL}/api/events`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${org1Token}`,
      },
      body: JSON.stringify({
        title: 'Ghost Concert',
        description: 'No venue provided for physical event',
        category: 'Music',
        format: 'PHYSICAL',
        startsAt: new Date(Date.now() + 86400000).toISOString(),
        endsAt: new Date(Date.now() + 172800000).toISOString(),
        ticketTypes: [{ name: 'Regular', priceKes: 1500, capacity: 100 }],
      }),
    });
    assert(noVenueRes.status === 400, 'Physical event without venue name is rejected (400)');

    // ----------------------------------------------------
    // Section C: Event Creation & Persistence in PostgreSQL
    // ----------------------------------------------------

    // 6. Authorized organizer creates valid PUBLISHED event with multiple ticket tiers
    const validCreateRes = await fetch(`${BASE_URL}/api/events`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${org1Token}`,
      },
      body: JSON.stringify({
        title: 'Nairobi Sundowner Live 2026',
        description: 'A vibrant outdoor Afro-fusion and live percussion sunset festival in Nairobi.',
        category: 'Music',
        format: 'PHYSICAL',
        status: 'PUBLISHED',
        startsAt: new Date(Date.now() + 86400000 * 5).toISOString(),
        endsAt: new Date(Date.now() + 86400000 * 5 + 36000000).toISOString(),
        venue: 'Kenyatta International Convention Centre (KICC)',
        city: 'Nairobi',
        county: 'Nairobi',
        address: 'Harambee Avenue',
        latitude: -1.2884,
        longitude: 36.8233,
        ticketTypes: [
          {
            name: 'Early Bird',
            description: 'Limited early entrance',
            priceKes: 1200,
            capacity: 250,
          },
          {
            name: 'VIP Experience',
            description: 'Lounge seating + welcome drinks',
            priceKes: 4500,
            capacity: 75,
          },
        ],
      }),
    });

    const validCreateBody = (await validCreateRes.json()) as any;
    assert(
      validCreateRes.status === 201 && validCreateBody.success === true,
      'Authorized organizer creates valid published event (201)',
      validCreateBody
    );

    createdEventId = validCreateBody.data?.id;
    createdEventSlug = validCreateBody.data?.slug;

    // 7. Verify PostgreSQL persistence & foreign key relationship
    const dbEvent = await prisma.event.findUnique({
      where: { id: createdEventId },
      include: { ticketTypes: true, organizer: true },
    });
    assert(
      dbEvent !== null &&
        dbEvent.ticketTypes.length === 2 &&
        dbEvent.organizerId === organizer1.id &&
        dbEvent.organizer.email === organizer1.email,
      'Event and ticket types correctly persisted in PostgreSQL with foreign keys'
    );

    // 8. Organizer creates a DRAFT event (Private)
    const draftRes = await fetch(`${BASE_URL}/api/events`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${org1Token}`,
      },
      body: JSON.stringify({
        title: 'Secret Underground Acoustic Session',
        description: 'Work in progress event not yet ready for public discovery.',
        category: 'Acoustic',
        status: 'DRAFT',
        startsAt: new Date(Date.now() + 86400000 * 10).toISOString(),
        endsAt: new Date(Date.now() + 86400000 * 10 + 20000000).toISOString(),
        venue: 'Tree House Nairobi',
        city: 'Nairobi',
        ticketTypes: [{ name: 'Guest Pass', priceKes: 2000, capacity: 50 }],
      }),
    });
    const draftBody = (await draftRes.json()) as any;
    draftEventId = draftBody.data?.id;
    assert(draftRes.status === 201 && draftBody.data?.status === 'DRAFT', 'Organizer can create DRAFT event');

    // ----------------------------------------------------
    // Section D: Public Listing & Detail Fetching
    // ----------------------------------------------------

    // 9. Public visitor lists published events
    const publicListRes = await fetch(`${BASE_URL}/api/events`);
    const publicListBody = (await publicListRes.json()) as any;
    const foundPublished = publicListBody.data.some((e: any) => e.id === createdEventId);
    const foundDraft = publicListBody.data.some((e: any) => e.id === draftEventId);

    assert(
      publicListRes.status === 200 && foundPublished && !foundDraft,
      'Public listing includes PUBLISHED events and hides DRAFT events'
    );

    // 10. Fetch published event by slug returns details and ticket types
    const slugDetailRes = await fetch(`${BASE_URL}/api/events/${createdEventSlug}`);
    const slugDetailBody = (await slugDetailRes.json()) as any;
    assert(
      slugDetailRes.status === 200 &&
        slugDetailBody.data?.slug === createdEventSlug &&
        slugDetailBody.data?.ticketTypes?.length === 2,
      'Fetching event by slug returns complete event details and ticket types'
    );

    // 11. Public visitor accessing private DRAFT event returns 404
    const publicDraftRes = await fetch(`${BASE_URL}/api/events/${draftEventId}`);
    assert(publicDraftRes.status === 404, 'Public user fetching DRAFT event receives 404 (private draft protected)');

    // 12. Event owner organizer accessing their own DRAFT returns 200
    const ownerDraftRes = await fetch(`${BASE_URL}/api/events/${draftEventId}`, {
      headers: { Authorization: `Bearer ${org1Token}` },
    });
    const ownerDraftBody = (await ownerDraftRes.json()) as any;
    assert(
      ownerDraftRes.status === 200 && ownerDraftBody.data?.id === draftEventId,
      'Owner organizer can fetch their own private DRAFT event (200)'
    );

    // 13. Nonexistent event returns 404
    const notFoundRes = await fetch(`${BASE_URL}/api/events/00000000-0000-0000-0000-000000000000`);
    assert(notFoundRes.status === 404, 'Fetching non-existent event returns 404');

    // ----------------------------------------------------
    // Section E: Update & Cancellation Access Control
    // ----------------------------------------------------

    // 14. Another organizer cannot modify first organizer's event (403)
    const unauthorizedPatchRes = await fetch(`${BASE_URL}/api/events/${createdEventId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${org2Token}`,
      },
      body: JSON.stringify({ title: 'Hijacked Title' }),
    });
    assert(unauthorizedPatchRes.status === 403, 'Organizer cannot modify another organizer’s event (403)');

    // 15. Event owner organizer successfully updates event (200)
    const ownerPatchRes = await fetch(`${BASE_URL}/api/events/${createdEventId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${org1Token}`,
      },
      body: JSON.stringify({
        title: 'Nairobi Sundowner Live 2026 — Official Edition',
        category: 'Festivals',
      }),
    });
    const ownerPatchBody = (await ownerPatchRes.json()) as any;
    assert(
      ownerPatchRes.status === 200 &&
        ownerPatchBody.data?.title === 'Nairobi Sundowner Live 2026 — Official Edition',
      'Event owner can successfully update event details (200)'
    );

    // 16. Safe cancellation marks status as CANCELLED
    const cancelRes = await fetch(`${BASE_URL}/api/events/${createdEventId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${org1Token}` },
    });
    const cancelBody = (await cancelRes.json()) as any;
    assert(
      cancelRes.status === 200 && cancelBody.data?.status === 'CANCELLED',
      'Safe cancellation marks event status as CANCELLED'
    );
  } finally {
    // ----------------------------------------------------
    // Cleanup fixtures safely
    // ----------------------------------------------------
    console.log('\n🧹 Cleaning up test fixtures from PostgreSQL...');
    await prisma.ticketType.deleteMany({
      where: { event: { organizerId: { in: [organizer1.id, organizer2.id] } } },
    });
    await prisma.event.deleteMany({
      where: { organizerId: { in: [organizer1.id, organizer2.id] } },
    });
    await prisma.user.deleteMany({
      where: { id: { in: [organizer1.id, organizer2.id, attendee.id] } },
    });
    await prisma.$disconnect();
    if (server && server.close) {
      server.close();
    }
  }

  console.log('\n====================================================');
  console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================');

  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch((err) => {
  console.error('Test runner fatal error:', err);
  process.exit(1);
});
