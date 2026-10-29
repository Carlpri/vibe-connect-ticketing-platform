process.env.NODE_ENV = 'test';
import dotenv from 'dotenv';
dotenv.config();

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'http';
import jwt from 'jsonwebtoken';
import app from '../server';
import { prisma } from '../shared/utils/prisma';
import { env } from '../config/env';
import { parseAndVerifyTicketQrPayload } from '../shared/utils/ticketQr';
import { TicketStatus, CheckInOutcome } from '@prisma/client';

describe('VIBE-CONNECT Free Ticketing & Gate Admission Suite', () => {
  let server: http.Server;
  let baseUrl: string;

  const runId = Date.now();
  const organizerEmail = `free-org-${runId}@example.com`;
  const attendee1Email = `free-attendee1-${runId}@example.com`;
  const attendee2Email = `free-attendee2-${runId}@example.com`;
  const otherOrganizerEmail = `free-other-org-${runId}@example.com`;

  let organizerId: string;
  let attendee1Id: string;
  let attendee2Id: string;
  let otherOrganizerId: string;

  let organizerToken: string;
  let attendee1Token: string;
  let attendee2Token: string;
  let otherOrganizerToken: string;

  let eventId: string;
  let otherEventId: string;
  let freeTicketTypeId: string;
  let limitedFreeTicketTypeId: string;
  let otherEventTicketTypeId: string;

  let issuedTicketId: string;
  let issuedTicketQr: string;

  before(async () => {
    await new Promise<void>((resolve) => {
      server = app.listen(0, () => {
        const address = server.address() as { port: number };
        baseUrl = `http://127.0.0.1:${address.port}`;
        resolve();
      });
    });

    // 1. Create Users
    const org = await prisma.user.create({
      data: {
        email: organizerEmail,
        name: 'Jesus Party Organizer',
        passwordHash: 'hash',
        phone: `254722${String(runId).slice(-6)}`,
        role: 'ORGANIZER',
        organizerApplicationStatus: 'APPROVED',
        emailVerified: true,
        phoneVerified: true,
      },
    });
    organizerId = org.id;

    const otherOrg = await prisma.user.create({
      data: {
        email: otherOrganizerEmail,
        name: 'Unrelated Organizer',
        passwordHash: 'hash',
        phone: `254723${String(runId).slice(-6)}`,
        role: 'ORGANIZER',
        organizerApplicationStatus: 'APPROVED',
        emailVerified: true,
        phoneVerified: true,
      },
    });
    otherOrganizerId = otherOrg.id;

    const att1 = await prisma.user.create({
      data: {
        email: attendee1Email,
        name: 'Grace Wanjiru',
        passwordHash: 'hash',
        phone: `254724${String(runId).slice(-6)}`,
        role: 'ATTENDEE',
        emailVerified: true,
        phoneVerified: false,
      },
    });
    attendee1Id = att1.id;

    const att2 = await prisma.user.create({
      data: {
        email: attendee2Email,
        name: 'David Kamau',
        passwordHash: 'hash',
        phone: `254725${String(runId).slice(-6)}`,
        role: 'ATTENDEE',
        emailVerified: false,
        phoneVerified: false,
      },
    });
    attendee2Id = att2.id;

    // JWT tokens
    organizerToken = jwt.sign(
      { userId: organizerId, email: organizerEmail, role: 'ORGANIZER' },
      env.JWT_SECRET,
      { expiresIn: '1h' }
    );
    otherOrganizerToken = jwt.sign(
      { userId: otherOrganizerId, email: otherOrganizerEmail, role: 'ORGANIZER' },
      env.JWT_SECRET,
      { expiresIn: '1h' }
    );
    attendee1Token = jwt.sign(
      { userId: attendee1Id, email: attendee1Email, role: 'ATTENDEE' },
      env.JWT_SECRET,
      { expiresIn: '1h' }
    );
    attendee2Token = jwt.sign(
      { userId: attendee2Id, email: attendee2Email, role: 'ATTENDEE' },
      env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    // 2. Create JESUS PARTY Event
    const event = await prisma.event.create({
      data: {
        organizerId,
        title: 'JESUS PARTY',
        edition: 'VIBE-CONNECT 002',
        slug: `jesus-party-free-${runId}`,
        description: 'A Celebration of Gratitude with praise, worship and fellowship.',
        theme: 'A Celebration of Gratitude',
        bibleVerse: 'Psalm 107:1',
        dressCode: 'Church Wear',
        venue: 'WANJOYA POOL AREA',
        city: "Murang'a",
        county: "Murang'a County",
        category: 'Music',
        format: 'PHYSICAL',
        status: 'PUBLISHED',
        startsAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
        endsAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000 + 4 * 60 * 60 * 1000),
      },
    });
    eventId = event.id;

    const freeType = await prisma.ticketType.create({
      data: {
        eventId,
        name: 'REGULAR (FREE)',
        description: 'Free entrance to Jesus Party',
        priceKes: 0,
        capacity: 100,
        sold: 0,
        isActive: true,
      },
    });
    freeTicketTypeId = freeType.id;

    const limitedType = await prisma.ticketType.create({
      data: {
        eventId,
        name: 'LIMITED FREE',
        description: 'Limited spot',
        priceKes: 0,
        capacity: 1, // Only 1 spot to test capacity enforcement
        sold: 0,
        isActive: true,
      },
    });
    limitedFreeTicketTypeId = limitedType.id;

    // Other event to test wrong event gate rejection
    const otherEvent = await prisma.event.create({
      data: {
        organizerId: otherOrganizerId,
        title: 'UNRELATED GIG',
        slug: `unrelated-gig-${runId}`,
        description: 'Another event',
        category: 'Parties',
        status: 'PUBLISHED',
        startsAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
        endsAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000 + 4 * 60 * 60 * 1000),
        venue: 'The Alchemist',
      },
    });
    otherEventId = otherEvent.id;

    const otherTicketType = await prisma.ticketType.create({
      data: {
        eventId: otherEventId,
        name: 'Standard',
        priceKes: 0,
        capacity: 50,
        sold: 0,
        isActive: true,
      },
    });
    otherEventTicketTypeId = otherTicketType.id;
  });

  after(async () => {
    await prisma.checkInLog.deleteMany({ where: { eventId: { in: [eventId, otherEventId] } } });
    await prisma.ticket.deleteMany({ where: { eventId: { in: [eventId, otherEventId] } } });
    await prisma.orderItem.deleteMany({
      where: { ticketTypeId: { in: [freeTicketTypeId, limitedFreeTicketTypeId, otherEventTicketTypeId] } },
    });
    await prisma.order.deleteMany({ where: { eventId: { in: [eventId, otherEventId] } } });
    await prisma.ticketType.deleteMany({ where: { eventId: { in: [eventId, otherEventId] } } });
    await prisma.event.deleteMany({ where: { id: { in: [eventId, otherEventId] } } });
    await prisma.user.deleteMany({
      where: { id: { in: [organizerId, attendee1Id, attendee2Id, otherOrganizerId] } },
    });

    await new Promise<void>((resolve) => {
      server.close(() => resolve());
    });
  });

  it('1. Event creation stores theme, edition, bibleVerse, and dressCode correctly', async () => {
    const res = await fetch(`${baseUrl}/api/events/${eventId}`);
    assert.equal(res.status, 200);
    const body: any = await res.json();
    assert.equal(body.success, true);
    assert.equal(body.data.title, 'JESUS PARTY');
    assert.equal(body.data.edition, 'VIBE-CONNECT 002');
    assert.equal(body.data.theme, 'A Celebration of Gratitude');
    assert.equal(body.data.bibleVerse, 'Psalm 107:1');
    assert.equal(body.data.dressCode, 'Church Wear');
    assert.equal(body.data.venue, 'WANJOYA POOL AREA');
    assert.equal(body.data.ticketTypes[0].priceKes, 0);
  });

  it('2. Attendee completes free registration without payment initialization', async () => {
    const res = await fetch(`${baseUrl}/api/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${attendee1Token}`,
      },
      body: JSON.stringify({
        eventId,
        items: [{ ticketTypeId: freeTicketTypeId, quantity: 1 }],
      }),
    });

    assert.equal(res.status, 201);
    const body: any = await res.json();
    assert.equal(body.success, true);
    assert.equal(body.data.status, 'PAID');
    assert.equal(body.data.totalKes, 0);
    assert.equal(body.data.subtotalKes, 0);
    assert.equal(body.data.serviceFeeKes, 0);
    assert.ok(body.data.paidAt, 'paidAt should be set immediately');

    // Tickets should be issued atomically
    assert.ok(Array.isArray(body.data.tickets));
    assert.equal(body.data.tickets.length, 1);
    assert.equal(body.data.tickets[0].status, TicketStatus.ISSUED);
    issuedTicketId = body.data.tickets[0].id;
  });

  it('3. Prevents duplicate free registration for the same attendee', async () => {
    const res = await fetch(`${baseUrl}/api/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${attendee1Token}`,
      },
      body: JSON.stringify({
        eventId,
        items: [{ ticketTypeId: freeTicketTypeId, quantity: 1 }],
      }),
    });

    assert.equal(res.status, 409);
    const body: any = await res.json();
    assert.equal(body.success, false);
    assert.match(body.message, /already registered/i);
  });

  it('4. Free ticket generates valid, signed QR payload and displays thematic metadata', async () => {
    const res = await fetch(`${baseUrl}/api/tickets/my`, {
      headers: {
        Authorization: `Bearer ${attendee1Token}`,
      },
    });

    assert.equal(res.status, 200);
    const body: any = await res.json();
    assert.equal(body.success, true);
    assert.ok(body.data.tickets.length > 0);

    const ticket = body.data.tickets.find((t: any) => t.id === issuedTicketId);
    assert.ok(ticket);
    assert.equal(ticket.status, TicketStatus.ISSUED);
    assert.equal(ticket.event.theme, 'A Celebration of Gratitude');
    assert.equal(ticket.event.dressCode, 'Church Wear');
    assert.equal(ticket.event.edition, 'VIBE-CONNECT 002');
    assert.equal(ticket.event.venue, 'WANJOYA POOL AREA');

    // The QR payload must be non-null and cryptographically valid
    assert.ok(ticket.qrPayload, 'QR payload must be present for free ticket');
    issuedTicketQr = ticket.qrPayload;
    const verifiedId = parseAndVerifyTicketQrPayload(issuedTicketQr);
    assert.equal(verifiedId, issuedTicketId);
  });

  it('5. Enforces capacity limit on free ticket types', async () => {
    // Limited ticket type has capacity = 1
    // Attendee 2 claims the 1 spot
    const res1 = await fetch(`${baseUrl}/api/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${attendee2Token}`,
      },
      body: JSON.stringify({
        eventId,
        items: [{ ticketTypeId: limitedFreeTicketTypeId, quantity: 1 }],
      }),
    });
    assert.equal(res1.status, 201);

    // Create a 3rd user to attempt booking the now-exhausted limited spot
    const att3 = await prisma.user.create({
      data: {
        email: `free-att3-${runId}@example.com`,
        name: 'Third Attendee',
        passwordHash: 'hash',
        role: 'ATTENDEE',
        emailVerified: true,
      },
    });
    const att3Token = jwt.sign(
      { userId: att3.id, email: att3.email, role: 'ATTENDEE' },
      env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    const res2 = await fetch(`${baseUrl}/api/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${att3Token}`,
      },
      body: JSON.stringify({
        eventId,
        items: [{ ticketTypeId: limitedFreeTicketTypeId, quantity: 1 }],
      }),
    });

    assert.equal(res2.status, 409);
    const body2: any = await res2.json();
    assert.match(body2.message, /not enough tickets available/i);

    await prisma.user.delete({ where: { id: att3.id } });
  });

  it('6. Gate Scanner admits valid ticket (outcome: VALID)', async () => {
    const res = await fetch(`${baseUrl}/api/events/${eventId}/check-in`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${organizerToken}`,
      },
      body: JSON.stringify({
        qrCode: issuedTicketQr,
      }),
    });

    assert.equal(res.status, 200);
    const body: any = await res.json();
    assert.equal(body.success, true);
    assert.equal(body.data.outcome, CheckInOutcome.VALID);
    assert.equal(body.data.valid, true);
    assert.equal(body.data.alreadyCheckedIn, false);
    assert.equal(body.data.attendee.name, 'Grace Wanjiru');

    // Confirm persisted state
    const dbTicket = await prisma.ticket.findUnique({ where: { id: issuedTicketId } });
    assert.equal(dbTicket?.status, TicketStatus.CHECKED_IN);
    assert.ok(dbTicket?.checkedInAt);
  });

  it('7. Gate Scanner rejects second scan (outcome: ALREADY_USED)', async () => {
    const res = await fetch(`${baseUrl}/api/events/${eventId}/check-in`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${organizerToken}`,
      },
      body: JSON.stringify({
        qrCode: issuedTicketQr,
      }),
    });

    assert.equal(res.status, 200);
    const body: any = await res.json();
    assert.equal(body.success, true);
    assert.equal(body.data.outcome, CheckInOutcome.ALREADY_USED);
    assert.equal(body.data.valid, true);
    assert.equal(body.data.alreadyCheckedIn, true);
    assert.ok(body.data.previousCheckInAt);
  });

  it('8. Gate Scanner rejects tickets belonging to another event (wrong event check)', async () => {
    // Attendee 2 has a ticket for otherEvent
    const otherOrderRes = await fetch(`${baseUrl}/api/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${otherOrganizerToken}`,
      },
      body: JSON.stringify({
        eventId: otherEventId,
        items: [{ ticketTypeId: otherEventTicketTypeId, quantity: 1 }],
      }),
    });
    const otherOrderBody: any = await otherOrderRes.json();
    const otherTicketId = otherOrderBody.data.tickets[0].id;

    // Fetch its QR
    const myTicketsRes = await fetch(`${baseUrl}/api/tickets/my`, {
      headers: { Authorization: `Bearer ${otherOrganizerToken}` },
    });
    const myTicketsBody: any = await myTicketsRes.json();
    const otherTicket = myTicketsBody.data.tickets.find((t: any) => t.id === otherTicketId);
    assert.ok(otherTicket.qrPayload);

    // Now try scanning that ticket at JESUS PARTY gate
    const scanRes = await fetch(`${baseUrl}/api/events/${eventId}/check-in`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${organizerToken}`,
      },
      body: JSON.stringify({
        qrCode: otherTicket.qrPayload,
      }),
    });

    assert.equal(scanRes.status, 200);
    const scanBody: any = await scanRes.json();
    assert.equal(scanBody.data.outcome, CheckInOutcome.INVALID);
    assert.equal(scanBody.data.valid, false);
    assert.equal(scanBody.data.isWrongEvent, true);
    assert.match(scanBody.data.message, /different event/i);
  });

  it('9. GET /api/events/:id/attendees returns accurate roster and counts for authorized organizer', async () => {
    const res = await fetch(`${baseUrl}/api/events/${eventId}/attendees?status=ALL`, {
      headers: {
        Authorization: `Bearer ${organizerToken}`,
      },
    });

    assert.equal(res.status, 200);
    const body: any = await res.json();
    assert.equal(body.success, true);
    assert.ok(body.data.counts.totalIssued >= 2);
    assert.equal(body.data.counts.checkedIn, 1);
    assert.ok(body.data.counts.notCheckedIn >= 1);

    const grace = body.data.attendees.find((a: any) => a.attendeeName === 'Grace Wanjiru');
    assert.ok(grace);
    assert.equal(grace.status, TicketStatus.CHECKED_IN);
    assert.equal(grace.priceKes, 0);
  });

  it('10. GET /api/events/:id/attendees supports search by attendee name or email', async () => {
    const res = await fetch(`${baseUrl}/api/events/${eventId}/attendees?search=Grace`, {
      headers: {
        Authorization: `Bearer ${organizerToken}`,
      },
    });

    assert.equal(res.status, 200);
    const body: any = await res.json();
    assert.equal(body.success, true);
    assert.equal(body.data.attendees.length, 1);
    assert.equal(body.data.attendees[0].attendeeName, 'Grace Wanjiru');
  });

  it('11. GET /api/events/:id/attendees forbids unauthorized organizers from other events', async () => {
    const res = await fetch(`${baseUrl}/api/events/${eventId}/attendees`, {
      headers: {
        Authorization: `Bearer ${otherOrganizerToken}`,
      },
    });

    assert.equal(res.status, 403);
  });
});
