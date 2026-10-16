import { PrismaClient } from '@prisma/client';
import { buildTicketQrPayload, parseAndVerifyTicketQrPayload } from '../dist/shared/utils/ticketQr.js';

const prisma = new PrismaClient();

async function main() {
  const events = await prisma.event.findMany({
    where: { title: { contains: 'GOSPEL', mode: 'insensitive' } },
    select: { id: true, title: true, slug: true },
  });
  console.log('Gospel events:', events);

  const paidOrders = await prisma.order.count({
    where: {
      status: 'PAID',
      event: { title: { contains: 'GOSPEL', mode: 'insensitive' } },
    },
  });
  console.log('Paid orders for gospel events:', paidOrders);

  const ticketCount = await prisma.ticket.count({
    where: { event: { title: { contains: 'GOSPEL', mode: 'insensitive' } } },
  });
  console.log('Digital tickets issued:', ticketCount);

  const sample = await prisma.ticket.findFirst({
    where: { event: { title: { contains: 'GOSPEL', mode: 'insensitive' } } },
    select: { id: true },
  });
  if (sample) {
    const payload = buildTicketQrPayload(sample.id);
    const ok = parseAndVerifyTicketQrPayload(payload) === sample.id;
    console.log('Sample QR round-trip:', ok ? 'OK' : 'FAIL', payload.slice(0, 48) + '…');
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
