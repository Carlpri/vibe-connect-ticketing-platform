process.env.NODE_ENV = 'test';

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'http';
import jwt from 'jsonwebtoken';
import app from '../server';
import { prisma } from '../shared/utils/prisma';
import { env } from '../config/env';
import { parseAndVerifyTicketQrPayload } from '../shared/utils/ticketQr';

describe('Digital ticket QR flow', () => {
  let server: http.Server;
  let baseUrl: string;

  const runId = Date.now();
  const attendeeEmail = `ticket-flow-attendee-${runId}@example.com`;
  const organizerEmail = `ticket-flow-org-${runId}@example.com`;

  let attendeeId: string;
  let organizerId: string;
  let eventId: string;
  let ticketTypeId: string;
  let attendeeToken: string;
  let organizerToken: string;

  before(async () => {
    await new Promise<void>((resolve) => {
      server = app.listen(0, () => {
        const address = server.address() as { port: number };
        baseUrl = `http://127.0.0.1:${address.port}`;
        resolve();
      });
    });

    const organizer = await prisma.user.create({
      data: {
        email: organizerEmail,
        name: 'Gospel Mix Organizer',
        passwordHash: 'hash',
        phone: `254711${String(runId).slice(-6)}`,
        role: 'ORGANIZER',
        emailVerified: true,
        phoneVerified: true,
      },
    });
    organizerId = organizer.id;

    const attendee = await prisma.user.create({
      data: {
        email: attendeeEmail,
        name: 'Gospel Mix Attendee',
        passwordHash: 'hash',
        phone: `254712${String(runId).slice(-6)}`,
        role: 'ATTENDEE',
        emailVerified: true,
        phoneVerified: true,
      },
    });
    attendeeId = attendee.id;

    const event = await prisma.event.create({
      data: {
        organizerId,
        title: 'VIBE-CONNECT 001 GOSPEL MIX',
        slug: `vibe-connect-001-gospel-mix-${runId}`,
        description: 'Test event for signed ticket QR codes.',
        category: 'Music',
        status: 'PUBLISHED',
        startsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        endsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000 + 4 * 60 * 60 * 1000),
        venue: 'Kasarani Stadium',
        city: 'Nairobi',
        county: 'Nairobi',
      },
    });
    eventId = event.id;

    const ticketType = await prisma.ticketType.create({
      data: {
        eventId,
        name: 'General Admission',
        priceKes: 1500,
        capacity: 500,
        sold: 0,
        isActive: true,
      },
    });
    ticketTypeId = ticketType.id;

    attendeeToken = jwt.sign(
      { userId: attendeeId, email: attendeeEmail, role: 'ATTENDEE' },
      env.JWT_SECRET,
      { expiresIn: '1h' }
    );
    organizerToken = jwt.sign(
      { userId: organizerId, email: organizerEmail, role: 'ORGANIZER' },
      env.JWT_SECRET,
      { expiresIn: '1h' }
    );
  });

  after(async () => {
    await prisma.ticket.deleteMany({ where: { eventId } });
    await prisma.payment.deleteMany({ where: { order: { eventId } } });
    await prisma.orderItem.deleteMany({ where: { order: { eventId } } });
    await prisma.order.deleteMany({ where: { eventId } });
    await prisma.ticketType.deleteMany({ where: { eventId } });
    await prisma.event.deleteMany({ where: { id: eventId } });
    await prisma.user.deleteMany({ where: { id: { in: [attendeeId, organizerId] } } });

    await new Promise<void>((resolve) => {
      server.close(() => resolve());
    });
  });

  it('keeps orders unpaid until provider verification and validates tickets from a paid test fixture', async () => {
    const createRes = await fetch(`${baseUrl}/api/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${attendeeToken}`,
      },
      body: JSON.stringify({
        eventId,
        items: [{ ticketTypeId, quantity: 2, unitPriceKes: 1 }],
      }),
    });
    const createBody = (await createRes.json()) as any;
    assert.equal(createRes.status, 201);
    const pendingOrderId = createBody.data.id as string;
    assert.equal(createBody.data.items[0].unitPriceKes, 1500);
    assert.equal(createBody.data.totalKes, 3050);

    const confirmRes = await fetch(`${baseUrl}/api/orders/${pendingOrderId}/confirm-payment`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${attendeeToken}`,
      },
      body: JSON.stringify({ mpesaReceiptNumber: 'QRT1234567' }),
    });
    assert.equal(confirmRes.status, 501);
    assert.equal(
      (await prisma.order.findUnique({ where: { id: pendingOrderId } }))?.status,
      'PENDING'
    );

    const paidOrder = await prisma.order.create({
      data: {
        userId: attendeeId,
        eventId,
        totalKes: 3050,
        status: 'PAID',
        paidAt: new Date(),
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
        items: {
          create: [{ ticketTypeId, quantity: 2, unitPriceKes: 1500 }],
        },
      },
    });

    const myTicketsRes = await fetch(`${baseUrl}/api/tickets/my`, {
      headers: { Authorization: `Bearer ${attendeeToken}` },
    });
    const myTicketsBody = (await myTicketsRes.json()) as any;
    assert.equal(myTicketsRes.status, 200);
    assert.equal(myTicketsBody.data.verificationRequired, false);
    assert.equal(myTicketsBody.data.tickets.length, 2);
    assert.ok(myTicketsBody.data.tickets.every((ticket: { orderId: string }) => ticket.orderId === paidOrder.id));

    const qrPayloads = myTicketsBody.data.tickets.map((t: { qrPayload: string | null }) => t.qrPayload);
    assert.ok(qrPayloads.every((p: string | null) => typeof p === 'string' && p.startsWith('VC1:')));
    assert.equal(new Set(qrPayloads).size, 2);

    const firstTicketId = parseAndVerifyTicketQrPayload(qrPayloads[0]!);
    assert.ok(firstTicketId);

    const scanRes = await fetch(`${baseUrl}/api/tickets/scan`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${organizerToken}`,
      },
      body: JSON.stringify({ qrCode: qrPayloads[0] }),
    });
    const scanBody = (await scanRes.json()) as any;
    assert.equal(scanRes.status, 200);
    assert.equal(scanBody.data.valid, true);
    assert.equal(scanBody.data.alreadyCheckedIn, false);
    assert.match(scanBody.data.event.title, /GOSPEL MIX/i);

    const rescanRes = await fetch(`${baseUrl}/api/tickets/scan`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${organizerToken}`,
      },
      body: JSON.stringify({ qrCode: qrPayloads[0] }),
    });
    const rescanBody = (await rescanRes.json()) as any;
    assert.equal(rescanRes.status, 200);
    assert.equal(rescanBody.data.alreadyCheckedIn, true);
  });

  it('requires one verified contact method and reveals unique QR payloads for paid tickets', async () => {
    const unverified = await prisma.user.create({
      data: {
        email: `ticket-unverified-${runId}@example.com`,
        name: 'Unverified Buyer',
        passwordHash: 'hash',
        phone: `254713${String(runId).slice(-6)}`,
        emailVerified: false,
        phoneVerified: true,
      },
    });

    const token = jwt.sign(
      { userId: unverified.id, email: unverified.email, role: 'ATTENDEE' },
      env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    try {
      const createRes = await fetch(`${baseUrl}/api/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          eventId,
          items: [{ ticketTypeId, quantity: 1, unitPriceKes: 1500 }],
        }),
      });
      assert.equal(createRes.status, 201);

      await prisma.user.update({
        where: { id: unverified.id },
        data: { emailVerified: true, phoneVerified: false },
      });
      const emailVerifiedOrderRes = await fetch(`${baseUrl}/api/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          eventId,
          items: [{ ticketTypeId, quantity: 1 }],
        }),
      });
      assert.equal(emailVerifiedOrderRes.status, 201);

      await prisma.user.update({
        where: { id: unverified.id },
        data: { emailVerified: false, phoneVerified: false },
      });
      const noVerifiedContactOrderRes = await fetch(`${baseUrl}/api/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          eventId,
          items: [{ ticketTypeId, quantity: 1 }],
        }),
      });
      assert.equal(noVerifiedContactOrderRes.status, 403);

      const order = await prisma.order.create({
        data: {
          userId: unverified.id,
          eventId,
          totalKes: 1500,
          status: 'PAID',
          paidAt: new Date(),
          expiresAt: new Date(Date.now() + 15 * 60 * 1000),
          items: {
            create: [{ ticketTypeId, quantity: 2, unitPriceKes: 1500 }],
          },
        },
      });

      const orderItem = await prisma.orderItem.findFirstOrThrow({ where: { orderId: order.id } });
      await prisma.ticket.createMany({
        data: [1, 2].map((serialNumber) => ({
          orderId: order.id,
          orderItemId: orderItem.id,
          ticketTypeId,
          eventId,
          userId: unverified.id,
          serialNumber,
        })),
      });

      const myTicketsRes = await fetch(`${baseUrl}/api/tickets/my`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const myTicketsBody = (await myTicketsRes.json()) as any;
      assert.equal(myTicketsRes.status, 200);
      assert.equal(myTicketsBody.data.verificationRequired, true);
      assert.ok(myTicketsBody.data.tickets.every((ticket: { qrPayload: string | null }) => ticket.qrPayload === null));

      await prisma.user.update({
        where: { id: unverified.id },
        data: { phoneVerified: true },
      });
      const verifiedTicketsRes = await fetch(`${baseUrl}/api/tickets/my`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const verifiedTicketsBody = (await verifiedTicketsRes.json()) as any;
      assert.equal(verifiedTicketsBody.data.verificationRequired, false);
      const qrPayloads = verifiedTicketsBody.data.tickets.map((ticket: { qrPayload: string | null }) => ticket.qrPayload);
      assert.ok(qrPayloads.every((payload: string | null) => typeof payload === 'string' && payload.startsWith('VC1:')));
      assert.equal(new Set(qrPayloads).size, 2);
      assert.ok(qrPayloads.every((payload: string) => parseAndVerifyTicketQrPayload(payload)));
    } finally {
      await prisma.ticket.deleteMany({ where: { userId: unverified.id } });
      await prisma.payment.deleteMany({ where: { order: { userId: unverified.id } } });
      await prisma.orderItem.deleteMany({ where: { order: { userId: unverified.id } } });
      await prisma.order.deleteMany({ where: { userId: unverified.id } });
      await prisma.user.delete({ where: { id: unverified.id } });
    }
  });
});
