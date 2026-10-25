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
  const suffix = randomUUID().slice(0, 8);
  const ref1 = `pstk_${suffix}_1`;
  const ref2 = `pstk_${suffix}_2`;
  const ref3 = `pstk_${suffix}_3`;

  // 1. Pending payment with Paystack fields
  const pending = await prisma.payment.create({
    data: {
      orderId: order.id,
      amountKes: 600,
      provider: 'PAYSTACK',
      reference: ref1,
      customerEmail: user.email,
      currency: 'KES',
    },
  });
  console.log(pending.status === 'PENDING' ? 'PASS: new Paystack payment is PENDING' : 'FAIL: new payment status');
  console.log(pending.provider === 'PAYSTACK' ? 'PASS: default/assigned provider is PAYSTACK' : 'FAIL: provider mismatch');

  // 2. Failed attempt
  await prisma.payment.create({
    data: {
      orderId: order.id,
      status: 'FAILED',
      amountKes: 600,
      provider: 'PAYSTACK',
      reference: ref2,
      customerEmail: user.email,
      resultDesc: 'Payment declined by card issuer',
    },
  });
  console.log('PASS: a failed attempt can be followed by a retry');

  // 3. Successful payment with reference and channel
  const success = await prisma.payment.create({
    data: {
      orderId: order.id,
      status: 'SUCCESS',
      amountKes: 600,
      provider: 'PAYSTACK',
      reference: ref3,
      channel: 'card',
      customerEmail: user.email,
      paidAt: new Date(),
    },
  });
  console.log(success.status === 'SUCCESS' ? 'PASS: successful payment recorded' : 'FAIL: success payment');

  // 4. Amount of 0 must fail (pay_amount_positive constraint)
  await expectRejected('amount of 0', () =>
    prisma.payment.create({
      data: {
        orderId: otherOrder.id,
        amountKes: 0,
        provider: 'PAYSTACK',
        reference: `pstk_${suffix}_zero`,
      },
    })
  );

  // 5. Duplicate reference must fail (unique reference constraint)
  await expectRejected('duplicate reference', () =>
    prisma.payment.create({
      data: {
        orderId: otherOrder.id,
        amountKes: 600,
        provider: 'PAYSTACK',
        reference: ref1,
      },
    })
  );

  // 6. SUCCESS without reference or receipt must fail (pay_success_has_ref constraint)
  await expectRejected('SUCCESS without reference or receipt', () =>
    prisma.payment.create({
      data: {
        orderId: otherOrder.id,
        status: 'SUCCESS',
        amountKes: 600,
        provider: 'PAYSTACK',
        paidAt: new Date(),
      },
    })
  );

  // 7. Second SUCCESS on the same order must fail (unique_success_per_order index)
  await expectRejected('second SUCCESS on the same order', () =>
    prisma.payment.create({
      data: {
        orderId: order.id,
        status: 'SUCCESS',
        amountKes: 600,
        provider: 'PAYSTACK',
        reference: `pstk_${suffix}_duplicate_success`,
        paidAt: new Date(),
      },
    })
  );

  // 8. Payment for unknown order must fail (foreign key constraint)
  await expectRejected('payment for unknown order', () =>
    prisma.payment.create({
      data: {
        orderId: randomUUID(),
        amountKes: 600,
        provider: 'PAYSTACK',
        reference: `pstk_${suffix}_orphan`,
      },
    })
  );

  // Cleanup test data
  await prisma.payment.deleteMany({ where: { order: { userId: user.id } } });
  await prisma.order.deleteMany({ where: { userId: user.id } });
  await prisma.user.delete({ where: { id: user.id } });
  console.log('Test data removed cleanly');
}

main()
  .catch((err) => {
    console.error('Test execution error:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());