import { TicketStatus } from '@prisma/client';
import { prisma } from '../../shared/utils/prisma';
import { AppError } from '../../shared/errors/AppError';
import { buildTicketQrPayload, parseAndVerifyTicketQrPayload } from '../../shared/utils/ticketQr';

export class TicketsService {
  /**
   * Create one digital ticket row per seat after an order is PAID (idempotent).
   */
  static async issueTicketsForPaidOrder(orderId: string) {
    return prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id: orderId },
        include: { items: true, tickets: true },
      });

      if (!order || order.status !== 'PAID') {
        return [];
      }

      if (order.tickets.length > 0) {
        return order.tickets;
      }

      const createdTickets = [];

      for (const item of order.items) {
        const ticketType = await tx.ticketType.findUnique({ where: { id: item.ticketTypeId } });
        if (!ticketType) {
          throw new AppError(`Ticket type ${item.ticketTypeId} not found`, 400);
        }

        const remaining = ticketType.capacity - ticketType.sold;
        if (remaining < item.quantity) {
          throw new AppError(`Not enough tickets available for ${ticketType.name}`, 400);
        }

        for (let serial = 1; serial <= item.quantity; serial += 1) {
          const ticket = await tx.ticket.create({
            data: {
              orderId: order.id,
              orderItemId: item.id,
              ticketTypeId: item.ticketTypeId,
              eventId: order.eventId,
              userId: order.userId,
              serialNumber: serial,
              status: TicketStatus.ISSUED,
            },
          });
          createdTickets.push(ticket);
        }

        await tx.ticketType.update({
          where: { id: item.ticketTypeId },
          data: { sold: { increment: item.quantity } },
        });
      }

      return createdTickets;
    });
  }

  static async getMyTickets(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { emailVerified: true, phoneVerified: true, name: true, email: true, phone: true },
    });

    if (!user) {
      throw new AppError('User not found', 404);
    }

    const canRevealQr = user.emailVerified && user.phoneVerified;

    const paidOrdersMissingTickets = await prisma.order.findMany({
      where: {
        userId,
        status: 'PAID',
        tickets: { none: {} },
      },
      select: { id: true },
    });

    for (const order of paidOrdersMissingTickets) {
      await TicketsService.issueTicketsForPaidOrder(order.id);
    }

    const tickets = await prisma.ticket.findMany({
      where: {
        userId,
        order: { status: 'PAID' },
      },
      include: {
        ticketType: { select: { id: true, name: true, priceKes: true } },
        event: {
          select: {
            id: true,
            title: true,
            slug: true,
            startsAt: true,
            venue: true,
            city: true,
            coverImage: true,
          },
        },
        order: {
          select: {
            id: true,
            paidAt: true,
            payments: {
              where: { status: 'SUCCESS' },
              orderBy: { createdAt: 'desc' },
              take: 1,
              select: { mpesaReceiptNumber: true, phoneNumber: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return {
      verificationRequired: !canRevealQr,
      emailVerified: user.emailVerified,
      phoneVerified: user.phoneVerified,
      tickets: tickets.map((t) => ({
        id: t.id,
        orderId: t.orderId,
        serialNumber: t.serialNumber,
        status: t.status,
        checkedInAt: t.checkedInAt,
        ticketType: t.ticketType,
        event: t.event,
        paidAt: t.order.paidAt,
        paymentRef: t.order.payments[0]?.mpesaReceiptNumber ?? null,
        attendeePhone: t.order.payments[0]?.phoneNumber ?? user.phone,
        holderName: user.name,
        holderEmail: user.email,
        qrPayload: canRevealQr && t.status !== TicketStatus.VOID ? buildTicketQrPayload(t.id) : null,
      })),
    };
  }

  /**
   * Gate scan: validates signed QR and marks ticket CHECKED_IN once.
   */
  static async verifyAndCheckIn(qrCode: string, scannedByUserId: string) {
    const ticketId = parseAndVerifyTicketQrPayload(qrCode);
    if (!ticketId) {
      throw new AppError('Invalid or tampered ticket QR code', 400);
    }

    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      include: {
        ticketType: { select: { name: true, priceKes: true } },
        event: {
          select: {
            id: true,
            title: true,
            startsAt: true,
            venue: true,
            city: true,
            organizerId: true,
          },
        },
        user: { select: { id: true, name: true, email: true, phone: true } },
        order: { select: { id: true, status: true, paidAt: true } },
      },
    });

    if (!ticket) {
      throw new AppError('Ticket not found', 404);
    }

    if (ticket.order.status !== 'PAID') {
      throw new AppError('Ticket is not valid: payment incomplete', 400);
    }

    const scanner = await prisma.user.findUnique({
      where: { id: scannedByUserId },
      select: { role: true },
    });

    if (!scanner) {
      throw new AppError('Scanner account not found', 404);
    }

    if (
      scanner.role !== 'ADMIN' &&
      ticket.event.organizerId !== scannedByUserId
    ) {
      throw new AppError('Forbidden: you can only scan tickets for your own events', 403);
    }

    if (ticket.status === TicketStatus.VOID) {
      throw new AppError('Ticket has been voided', 400);
    }

    if (ticket.status === TicketStatus.CHECKED_IN) {
      return {
        valid: true,
        alreadyCheckedIn: true,
        ticketId: ticket.id,
        event: ticket.event,
        ticketType: ticket.ticketType,
        attendee: ticket.user,
        checkedInAt: ticket.checkedInAt,
        message: 'Ticket already scanned — attendee was previously admitted.',
      };
    }

    const updated = await prisma.ticket.update({
      where: { id: ticket.id },
      data: {
        status: TicketStatus.CHECKED_IN,
        checkedInAt: new Date(),
        checkedInById: scannedByUserId,
      },
    });

    return {
      valid: true,
      alreadyCheckedIn: false,
      ticketId: updated.id,
      event: ticket.event,
      ticketType: ticket.ticketType,
      attendee: ticket.user,
      checkedInAt: updated.checkedInAt,
      message: 'Ticket validated successfully! Attendee admitted.',
    };
  }
}
