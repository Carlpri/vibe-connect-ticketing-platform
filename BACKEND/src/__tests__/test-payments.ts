import { randomUUID } from 'crypto';
import { prisma } from '../shared/utils/prisma';

async function expectRejected(label: string, action: () => Promise<unknown>) {
  try {
    await action();
    console.log(`FAIL: ${label} (was allowed)`);
  } catch {
    console.log(`PASS: ${label} (rejected)`);
  }
}

async function main() {
  const user = await prisma.user.upsert({
    where: { email: 'payments.test@example.com' },
    update: {},
    create: { email: 'payments.test@example.com', passwordHash: 'x', name: 'Payments Test' },
  });

  const newOrder = () =>
    prisma.order.create({
      data: {
        userId: user.id,
        eventId: randomUUID(),
        totalKes: 600,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
      },
    });

  const order = await newOrder();
  const otherOrder = await newOrder();
  const phone = '254712345678';
  const suffix = randomUUID().slice(0, 8);

  const pending = await prisma.payment.create({
    data: { orderId: order.id, amountKes: 600, phoneNumber: phone, checkoutRequestId: `ws_CO_${suffix}_1` },
  });
  console.log(pending.status === 'PENDING' ? 'PASS: new payment is PENDING' : 'FAIL: new payment status');

  await prisma.payment.create({
    data: {
      orderId: order.id,
      status: 'FAILED',
      amountKes: 600,
      phoneNumber: phone,
      checkoutRequestId: `ws_CO_${suffix}_2`,
      resultCode: 1032,
      resultDesc: 'Request cancelled by user',
    },
  });
  console.log('PASS: a failed attempt can be followed by a retry');

  const success = await prisma.payment.create({
    data: {
      orderId: order.id,
      status: 'SUCCESS',
      amountKes: 600,
      phoneNumber: phone,
      checkoutRequestId: `ws_CO_${suffix}_3`,
      mpesaReceiptNumber: `RCP${suffix}A`,
      resultCode: 0,
      paidAt: new Date(),
    },
  });
  console.log(success.status === 'SUCCESS' ? 'PASS: successful payment recorded' : 'FAIL: success payment');

  await expectRejected('amount of 0', () =>
    prisma.payment.create({ data: { orderId: order.id, amountKes: 0, phoneNumber: phone } }));

  await expectRejected('phone number in wrong format', () =>
    prisma.payment.create({ data: { orderId: order.id, amountKes: 600, phoneNumber: '0712345678' } }));

  await expectRejected('duplicate checkoutRequestId', () =>
    prisma.payment.create({
      data: { orderId: order.id, amountKes: 600, phoneNumber: phone, checkoutRequestId: `ws_CO_${suffix}_1` },
    }));

  await expectRejected('SUCCESS without receipt number', () =>
    prisma.payment.create({
      data: { orderId: otherOrder.id, status: 'SUCCESS', amountKes: 600, phoneNumber: phone, paidAt: new Date() },
    }));

  await expectRejected('second SUCCESS on the same order', () =>
    prisma.payment.create({
      data: {
        orderId: order.id,
        status: 'SUCCESS',
        amountKes: 600,
        phoneNumber: phone,
        mpesaReceiptNumber: `RCP${suffix}B`,
        paidAt: new Date(),
      },
    }));

  await expectRejected('same receipt number on another order', () =>
    prisma.payment.create({
      data: {
        orderId: otherOrder.id,
        status: 'SUCCESS',
        amountKes: 600,
        phoneNumber: phone,
        mpesaReceiptNumber: `RCP${suffix}A`,
        paidAt: new Date(),
      },
    }));

  await expectRejected('payment for unknown order', () =>
    prisma.payment.create({ data: { orderId: randomUUID(), amountKes: 600, phoneNumber: phone } }));

  await prisma.payment.deleteMany({ where: { order: { userId: user.id } } });
  await prisma.order.deleteMany({ where: { userId: user.id } });
  await prisma.user.delete({ where: { id: user.id } });
  console.log('Test data removed');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());