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
    where: { email: 'orders.test@example.com' },
    update: {},
    create: { email: 'orders.test@example.com', passwordHash: 'x', name: 'Orders Test' },
  });

  const order = await prisma.order.create({
    data: {
      userId: user.id,
      eventId: randomUUID(),
      totalKes: 600,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000),
    },
  });
  console.log(order.status === 'PENDING' ? 'PASS: new order is PENDING' : 'FAIL: new order status');

  const paid = await prisma.order.update({
    where: { id: order.id },
    data: { status: 'PAID', paidAt: new Date() },
  });
  console.log(paid.status === 'PAID' && paid.paidAt ? 'PASS: order marked PAID with paidAt' : 'FAIL: mark paid');

  const history = await prisma.order.findMany({ where: { userId: user.id } });
  console.log(history.length === 1 ? 'PASS: order history returns 1 order' : 'FAIL: order history');

  await expectRejected('negative total', () =>
    prisma.order.create({
      data: { userId: user.id, eventId: randomUUID(), totalKes: -50, expiresAt: new Date() },
    }));

  const pending = await prisma.order.create({
    data: { userId: user.id, eventId: randomUUID(), totalKes: 300, expiresAt: new Date() },
  });
  await expectRejected('PAID without paidAt', () =>
    prisma.order.update({ where: { id: pending.id }, data: { status: 'PAID' } }));

  await expectRejected('unknown user', () =>
    prisma.order.create({
      data: { userId: randomUUID(), eventId: randomUUID(), totalKes: 100, expiresAt: new Date() },
    }));

  await prisma.order.deleteMany({ where: { userId: user.id } });
  await prisma.user.delete({ where: { id: user.id } });
  console.log('Test data removed');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());