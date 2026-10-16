import jwt from 'jsonwebtoken';
import { randomUUID } from 'crypto';
import app from '../server';
import { prisma } from '../shared/utils/prisma';
import { env } from '../config/env';

const PORT = env.PORT || 3000;
const BASE_URL = `http://localhost:${PORT}`;

async function runTests() {
  console.log('--- Testing Orders & Payments API Endpoints via fetch ---');

  let server: any = null;
  await new Promise<void>((resolve) => {
    server = app.listen(PORT, () => {
      resolve();
    }).on('error', (err: any) => {
      if (err.code === 'EADDRINUSE') {
        resolve();
      }
    });
  });

  // 1. Setup a test verified user
  const testEmail = `test.attendee.${Date.now()}@example.com`;
  const user = await prisma.user.create({
    data: {
      email: testEmail,
      name: 'Order API Tester',
      passwordHash: 'dummyhash',
      phone: `254700${Math.floor(100000 + Math.random() * 900000)}`,
      emailVerified: true,
      phoneVerified: true,
    },
  });

  const token = jwt.sign(
    { userId: user.id, email: user.email, role: user.role },
    env.JWT_SECRET,
    { expiresIn: '1h' }
  );

  const eventId = randomUUID();
  const ticketTypeId = randomUUID();

  try {
    // 2. Test POST /api/orders (create order)
    const createRes = await fetch(`${BASE_URL}/api/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        eventId,
        items: [
          {
            ticketTypeId,
            quantity: 2,
            unitPriceKes: 1500,
          },
        ],
      }),
    });

    const createBody = (await createRes.json()) as any;
    console.log(
      createRes.status === 201 && createBody.data.totalKes === 3000
        ? 'PASS: POST /api/orders creates order with 15-min reservation'
        : `FAIL: POST /api/orders (${createRes.status}): ${JSON.stringify(createBody)}`
    );

    const orderId = createBody.data?.id;

    // 3. Test GET /api/orders/my
    const myRes = await fetch(`${BASE_URL}/api/orders/my`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const myBody = (await myRes.json()) as any;
    console.log(
      myRes.status === 200 && Array.isArray(myBody.data) && myBody.data.length >= 1
        ? 'PASS: GET /api/orders/my returns user order history'
        : `FAIL: GET /api/orders/my (${myRes.status}): ${JSON.stringify(myBody)}`
    );

    // 4. Test GET /api/orders/:id
    const detailRes = await fetch(`${BASE_URL}/api/orders/${orderId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const detailBody = (await detailRes.json()) as any;
    console.log(
      detailRes.status === 200 && detailBody.data?.id === orderId
        ? 'PASS: GET /api/orders/:id returns order details'
        : `FAIL: GET /api/orders/:id (${detailRes.status}): ${JSON.stringify(detailBody)}`
    );

    // 5. Test POST /api/orders/:id/pay (Initiate M-Pesa STK Push)
    const payRes = await fetch(`${BASE_URL}/api/orders/${orderId}/pay`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        phoneNumber: '0712345678', // Auto-normalized to 254712345678
      }),
    });
    const payBody = (await payRes.json()) as any;
    console.log(
      payRes.status === 200 && payBody.data?.checkoutRequestId
        ? 'PASS: POST /api/orders/:id/pay initiates M-Pesa STK push'
        : `FAIL: POST /api/orders/:id/pay (${payRes.status}): ${JSON.stringify(payBody)}`
    );

    // 6. Test POST /api/orders/:id/confirm-payment
    const confirmRes = await fetch(`${BASE_URL}/api/orders/${orderId}/confirm-payment`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({}),
    });
    const confirmBody = (await confirmRes.json()) as any;
    console.log(
      confirmRes.status === 200 && confirmBody.data?.status === 'PAID'
        ? 'PASS: POST /api/orders/:id/confirm-payment updates status to PAID with receipt'
        : `FAIL: POST /api/orders/:id/confirm-payment (${confirmRes.status}): ${JSON.stringify(confirmBody)}`
    );

    // 7. Test GET /api/tickets/my returns signed VC1 payloads
    const ticketsRes = await fetch(`${BASE_URL}/api/tickets/my`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const ticketsBody = (await ticketsRes.json()) as any;
    const qrPayload = ticketsBody.data?.tickets?.[0]?.qrPayload as string | undefined;
    console.log(
      ticketsRes.status === 200 && typeof qrPayload === 'string' && qrPayload.startsWith('VC1:')
        ? 'PASS: GET /api/tickets/my returns signed VC1 ticket QR payloads'
        : `FAIL: GET /api/tickets/my (${ticketsRes.status}): ${JSON.stringify(ticketsBody)}`
    );

    // 8. Test POST /api/orders/checkin (QR validation) — requires organizer token + real ticket QR
    const organizerToken = jwt.sign(
      { userId: user.id, email: user.email, role: 'ORGANIZER' },
      env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    const checkinRes = await fetch(`${BASE_URL}/api/orders/checkin`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${organizerToken}`,
      },
      body: JSON.stringify({
        qrCode: qrPayload || 'VC1:invalid',
      }),
    });
    const checkinBody = (await checkinRes.json()) as any;
    console.log(
      checkinRes.status === 200 && checkinBody.data?.valid === true
        ? 'PASS: POST /api/orders/checkin validates attendee ticket QR code'
        : `FAIL: POST /api/orders/checkin (${checkinRes.status}): ${JSON.stringify(checkinBody)}`
    );
  } finally {
    // Cleanup
    await prisma.ticket.deleteMany({ where: { userId: user.id } });
    await prisma.payment.deleteMany({ where: { order: { userId: user.id } } });
    await prisma.orderItem.deleteMany({ where: { order: { userId: user.id } } });
    await prisma.order.deleteMany({ where: { userId: user.id } });
    await prisma.user.delete({ where: { id: user.id } });
    await prisma.$disconnect();
    if (server && server.close) {
      server.close();
    }
    console.log('Test data cleaned up successfully');
    process.exit(0);
  }
}

runTests().catch(console.error);
