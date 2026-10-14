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
    where: { email: 'order-items.test@example.com' },
    update: {},
    create: { email: 'order-items.test@example.com', passwordHash: 'x', name: 'Items Test' },
  });

  const regularId = randomUUID();
  const vipId = randomUUID();

  const order = await prisma.order.create({
    data: {
      userId: user.id,
      eventId: randomUUID(),
      totalKes: 1600,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000),
      items: {
        create: [
          { ticketTypeId: regularId, quantity: 2, unitPriceKes: 300 },
          { ticketTypeId: vipId, quantity: 1, unitPriceKes: 1000 },
        ],
      },
    },
    include: { items: true },
  });
  console.log(order.items.length === 2 ? 'PASS: order created with 2 lines' : 'FAIL: line count');

  const sum = order.items.reduce((total: number, i: any) => total + i.quantity * i.unitPriceKes, 0);
  console.log(sum === order.totalKes ? 'PASS: lines add up to order total' : 'FAIL: total mismatch');

  await expectRejected('quantity of 0', () =>
    prisma.orderItem.create({
      data: { orderId: order.id, ticketTypeId: randomUUID(), quantity: 0, unitPriceKes: 300 },
    }));

  await expectRejected('negative unit price', () =>
    prisma.orderItem.create({
      data: { orderId: order.id, ticketTypeId: randomUUID(), quantity: 1, unitPriceKes: -5 },
    }));

  await expectRejected('same ticket type twice in one order', () =>
    prisma.orderItem.create({
      data: { orderId: order.id, ticketTypeId: regularId, quantity: 1, unitPriceKes: 300 },
    }));

  await expectRejected('line for unknown order', () =>
    prisma.orderItem.create({
      data: { orderId: randomUUID(), ticketTypeId: randomUUID(), quantity: 1, unitPriceKes: 300 },
    }));

  await prisma.order.deleteMany({ where: { userId: user.id } });
  await prisma.user.delete({ where: { id: user.id } });
  console.log('Test data removed');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());