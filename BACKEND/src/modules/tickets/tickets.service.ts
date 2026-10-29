import { TicketStatus, CheckInOutcome } from '@prisma/client';
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

  /**
   * Retrieve all tickets for a specific paid order.
   * Enforces ownership: the requesting userId must own the order.
   * Used by the Paystack callback page to display freshly-issued tickets.
   */
  static async getTicketsForOrder(orderId: string, userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { emailVerified: true, phoneVerified: true, name: true, email: true, phone: true },
    });

    if (!user) {
      throw new AppError('User not found', 404);
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: { userId: true, status: true },
    });

    if (!order) {
      throw new AppError('Order not found', 404);
    }
    if (order.userId !== userId) {
      throw new AppError('Forbidden: You do not have access to this order', 403);
    }
    if (order.status !== 'PAID') {
      throw new AppError('Tickets are only available after payment is confirmed', 400);
    }

    const canRevealQr = user.emailVerified || user.phoneVerified;

    // Ensure tickets are issued (idempotent)
    await TicketsService.issueTicketsForPaidOrder(orderId);

    const tickets = await prisma.ticket.findMany({
      where: { orderId },
      include: {
        ticketType: { select: { id: true, name: true, priceKes: true } },
        event: {
          select: {
            id: true,
            title: true,
            slug: true,
            startsAt: true,
            endsAt: true,
            venue: true,
            city: true,
            coverImage: true,
            theme: true,
            bibleVerse: true,
            dressCode: true,
            edition: true,
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
              select: { reference: true, mpesaReceiptNumber: true, phoneNumber: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    const hasPaidTickets = tickets.some((t) => t.ticketType.priceKes > 0);

    return {
      verificationRequired: !canRevealQr && hasPaidTickets,
      emailVerified: user.emailVerified,
      phoneVerified: user.phoneVerified,
      tickets: tickets.map((t) => {
        const canUnlock = canRevealQr || t.ticketType.priceKes === 0;
        return {
          id: t.id,
          orderId: t.orderId,
          serialNumber: t.serialNumber,
          status: t.status,
          checkedInAt: t.checkedInAt,
          ticketType: t.ticketType,
          event: t.event,
          paidAt: t.order.paidAt,
          paymentRef: t.order.payments[0]?.reference ?? t.order.payments[0]?.mpesaReceiptNumber ?? null,
          attendeePhone: t.order.payments[0]?.phoneNumber ?? user.phone,
          holderName: user.name,
          holderEmail: user.email,
          qrPayload: canUnlock && t.status !== TicketStatus.VOID ? buildTicketQrPayload(t.id) : null,
        };
      }),
    };
  }

  static async getMyTickets(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { emailVerified: true, phoneVerified: true, name: true, email: true, phone: true },
    });

    if (!user) {
      throw new AppError('User not found', 404);
    }

    const canRevealQr = user.emailVerified || user.phoneVerified;

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
            endsAt: true,
            venue: true,
            city: true,
            coverImage: true,
            theme: true,
            bibleVerse: true,
            dressCode: true,
            edition: true,
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
              select: { reference: true, mpesaReceiptNumber: true, phoneNumber: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const hasPaidTickets = tickets.some((t) => t.ticketType.priceKes > 0);

    return {
      verificationRequired: !canRevealQr && hasPaidTickets,
      emailVerified: user.emailVerified,
      phoneVerified: user.phoneVerified,
      tickets: tickets.map((t) => {
        const canUnlock = canRevealQr || t.ticketType.priceKes === 0;
        return {
          id: t.id,
          orderId: t.orderId,
          serialNumber: t.serialNumber,
          status: t.status,
          checkedInAt: t.checkedInAt,
          ticketType: t.ticketType,
          event: t.event,
          paidAt: t.order.paidAt,
          paymentRef: t.order.payments[0]?.reference ?? t.order.payments[0]?.mpesaReceiptNumber ?? null,
          attendeePhone: t.order.payments[0]?.phoneNumber ?? user.phone,
          holderName: user.name,
          holderEmail: user.email,
          qrPayload: canUnlock && t.status !== TicketStatus.VOID ? buildTicketQrPayload(t.id) : null,
        };
      }),
    };
  }

  /**
   * Helper: Mask email address for privacy on gate display.
   */
  private static maskEmail(email?: string | null): string | null {
    if (!email) return null;
    const [local, domain] = email.split('@');
    if (!domain) return email;
    if (local.length <= 2) return `${local[0]}***@${domain}`;
    return `${local[0]}***${local[local.length - 1]}@${domain}`;
  }

  /**
   * Helper: Human-readable ticket reference code (e.g. VC-1A2B3C4D).
   */
  private static formatTicketCode(id: string): string {
    return `VC-${id.replace(/-/g, '').slice(0, 8).toUpperCase()}`;
  }

  /**
   * Helper: Record scan attempt into audit log table without throwing.
   */
  private static async logCheckIn(data: {
    eventId: string;
    ticketId?: string | null;
    scannedById: string;
    outcome: CheckInOutcome;
    ticketCode?: string | null;
    notes?: string | null;
  }) {
    try {
      await prisma.checkInLog.create({
        data: {
          eventId: data.eventId,
          ticketId: data.ticketId || null,
          scannedById: data.scannedById,
          outcome: data.outcome,
          ticketCode: data.ticketCode || null,
          notes: data.notes || null,
        },
      });
    } catch (err) {
      console.error('[CheckInLog] Failed to persist scan audit log:', err);
    }
  }

  /**
   * Production Check-in Validation:
   * Validates submitted identifier against a specific event with atomic state transitions,
   * server-side UTC window enforcement, and tamper-resistant cryptographic verification.
   */
  static async checkInTicketForEvent({
    eventId,
    identifier,
    scannedByUserId,
    userRole,
  }: {
    eventId: string;
    identifier: string;
    scannedByUserId: string;
    userRole?: string;
  }) {
    // 1. Verify Event exists
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: {
        id: true,
        title: true,
        status: true,
        organizerId: true,
        startsAt: true,
        endsAt: true,
        venue: true,
        city: true,
      },
    });

    if (!event) {
      throw new AppError('Event not found', 404);
    }

    // 2. Permission Check: ADMIN or APPROVED ORGANIZER who owns the event
    if (userRole !== 'ADMIN') {
      const scanner = await prisma.user.findUnique({
        where: { id: scannedByUserId },
        select: { role: true, organizerApplicationStatus: true },
      });

      if (
        !scanner ||
        (scanner.role !== 'ORGANIZER' && scanner.role !== 'ADMIN') ||
        (scanner.role === 'ORGANIZER' &&
          (scanner.organizerApplicationStatus !== 'APPROVED' || event.organizerId !== scannedByUserId))
      ) {
        await TicketsService.logCheckIn({
          eventId,
          scannedById: scannedByUserId,
          outcome: CheckInOutcome.UNAUTHORIZED,
          notes: 'Forbidden: Scanner account not authorized for this event',
        });
        return {
          outcome: CheckInOutcome.UNAUTHORIZED,
          valid: false,
          alreadyCheckedIn: false,
          message: 'Forbidden: You do not have permission to scan tickets for this event.',
        };
      }
    }

    // Check if event is cancelled
    if (event.status === 'CANCELLED') {
      await TicketsService.logCheckIn({
        eventId,
        scannedById: scannedByUserId,
        outcome: CheckInOutcome.CANCELLED,
        notes: 'Event is cancelled',
      });
      return {
        outcome: CheckInOutcome.CANCELLED,
        valid: false,
        alreadyCheckedIn: false,
        message: 'Admission denied: This event has been cancelled.',
      };
    }

    // 3. Extract & Validate Ticket Identifier
    const raw = (identifier || '').trim();
    if (!raw) {
      await TicketsService.logCheckIn({
        eventId,
        scannedById: scannedByUserId,
        outcome: CheckInOutcome.INVALID,
        notes: 'Empty ticket identifier provided',
      });
      return {
        outcome: CheckInOutcome.INVALID,
        valid: false,
        alreadyCheckedIn: false,
        message: 'Ticket identifier or QR code payload is required.',
      };
    }

    let ticketId: string | null = null;

    if (raw.startsWith('VC1:')) {
      ticketId = parseAndVerifyTicketQrPayload(raw);
      if (!ticketId) {
        await TicketsService.logCheckIn({
          eventId,
          scannedById: scannedByUserId,
          outcome: CheckInOutcome.INVALID,
          notes: 'Tampered or invalid QR HMAC signature',
        });
        return {
          outcome: CheckInOutcome.INVALID,
          valid: false,
          alreadyCheckedIn: false,
          message: 'Invalid or forged ticket QR signature.',
        };
      }
    } else {
      // Manual entry: Support raw UUID or short reference code
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (uuidRegex.test(raw)) {
        ticketId = raw;
      } else if (raw.toUpperCase().startsWith('VC-')) {
        const prefix = raw.slice(3).toLowerCase();
        const candidates = await prisma.$queryRaw<Array<{ id: string }>>`
          SELECT id FROM tickets 
          WHERE "eventId" = ${eventId}::uuid 
            AND replace(id::text, '-', '') ILIKE ${prefix + '%'}
          LIMIT 1
        `;
        if (candidates.length > 0) {
          ticketId = candidates[0].id;
        }
      }
    }

    if (!ticketId) {
      await TicketsService.logCheckIn({
        eventId,
        scannedById: scannedByUserId,
        outcome: CheckInOutcome.INVALID,
        notes: 'Unrecognized ticket identifier format',
      });
      return {
        outcome: CheckInOutcome.INVALID,
        valid: false,
        alreadyCheckedIn: false,
        message: 'Unrecognized ticket identifier or QR code format.',
      };
    }

    // 4. Locate Ticket
    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      include: {
        ticketType: { select: { id: true, name: true, priceKes: true } },
        event: {
          select: {
            id: true,
            title: true,
            startsAt: true,
            endsAt: true,
            venue: true,
            city: true,
            status: true,
            organizerId: true,
          },
        },
        user: { select: { id: true, name: true, email: true, phone: true } },
        order: { select: { id: true, status: true, paidAt: true } },
      },
    });

    if (!ticket) {
      await TicketsService.logCheckIn({
        eventId,
        scannedById: scannedByUserId,
        outcome: CheckInOutcome.INVALID,
        ticketCode: TicketsService.formatTicketCode(ticketId),
        notes: 'Ticket not found in database',
      });
      return {
        outcome: CheckInOutcome.INVALID,
        valid: false,
        alreadyCheckedIn: false,
        message: 'Ticket not found in system.',
      };
    }

    const ticketCode = TicketsService.formatTicketCode(ticket.id);

    // 5. Verify Event Match
    if (ticket.eventId !== eventId) {
      await TicketsService.logCheckIn({
        eventId,
        ticketId: ticket.id,
        scannedById: scannedByUserId,
        outcome: CheckInOutcome.INVALID,
        ticketCode,
        notes: `Ticket belongs to event ${ticket.eventId} ("${ticket.event.title}"), but scan requested for ${eventId}`,
      });
      return {
        outcome: CheckInOutcome.INVALID,
        isWrongEvent: true,
        valid: false,
        alreadyCheckedIn: false,
        message: `This ticket was issued for a different event: "${ticket.event.title}".`,
        ticketId: ticket.id,
        ticketCode,
      };
    }

    // 6. Verify Payment is confirmed
    if (ticket.order.status !== 'PAID') {
      await TicketsService.logCheckIn({
        eventId,
        ticketId: ticket.id,
        scannedById: scannedByUserId,
        outcome: CheckInOutcome.PAYMENT_PENDING,
        ticketCode,
        notes: `Order status is ${ticket.order.status}`,
      });
      return {
        outcome: CheckInOutcome.PAYMENT_PENDING,
        valid: false,
        alreadyCheckedIn: false,
        message: 'Admission denied: Ticket payment has not been confirmed.',
        ticketId: ticket.id,
        ticketCode,
        ticketType: ticket.ticketType,
      };
    }

    // 7. Verify not Cancelled, Refunded, or Void
    if (ticket.status === TicketStatus.VOID || ticket.event.status === 'CANCELLED') {
      await TicketsService.logCheckIn({
        eventId,
        ticketId: ticket.id,
        scannedById: scannedByUserId,
        outcome: CheckInOutcome.CANCELLED,
        ticketCode,
        notes: `Ticket status: ${ticket.status}, Order status: ${ticket.order.status}`,
      });
      return {
        outcome: CheckInOutcome.CANCELLED,
        valid: false,
        alreadyCheckedIn: false,
        message: 'Admission denied: This ticket has been cancelled or refunded.',
        ticketId: ticket.id,
        ticketCode,
        ticketType: ticket.ticketType,
      };
    }

    // 8. Server-side UTC Validity Window
    const now = new Date();
    // End grace window: 12 hours after event.endsAt
    const admissionEndWindow = new Date(ticket.event.endsAt.getTime() + 12 * 60 * 60 * 1000);
    if (now.getTime() > admissionEndWindow.getTime()) {
      await TicketsService.logCheckIn({
        eventId,
        ticketId: ticket.id,
        scannedById: scannedByUserId,
        outcome: CheckInOutcome.EXPIRED,
        ticketCode,
        notes: `Event endsAt was ${ticket.event.endsAt.toISOString()}, current time is ${now.toISOString()}`,
      });
      return {
        outcome: CheckInOutcome.EXPIRED,
        valid: false,
        alreadyCheckedIn: false,
        message: 'Admission closed: Event admission window has expired.',
        ticketId: ticket.id,
        ticketCode,
        ticketType: ticket.ticketType,
      };
    }

    // 9. Check if already checked in
    if (ticket.status === TicketStatus.CHECKED_IN) {
      await TicketsService.logCheckIn({
        eventId,
        ticketId: ticket.id,
        scannedById: scannedByUserId,
        outcome: CheckInOutcome.ALREADY_USED,
        ticketCode,
        notes: `Previously admitted on ${ticket.checkedInAt?.toISOString()}`,
      });
      return {
        outcome: CheckInOutcome.ALREADY_USED,
        valid: true,
        alreadyCheckedIn: true,
        message: 'Ticket already scanned — attendee was previously admitted.',
        ticketId: ticket.id,
        ticketCode,
        serialNumber: ticket.serialNumber,
        previousCheckInAt: ticket.checkedInAt,
        ticketType: ticket.ticketType,
        event: ticket.event,
        attendee: {
          name: ticket.user.name,
          emailMasked: TicketsService.maskEmail(ticket.user.email),
        },
      };
    }

    // 10. Atomic Admission Update (Concurrency & duplicate scan safe)
    const checkIn = await prisma.ticket.updateMany({
      where: {
        id: ticket.id,
        status: TicketStatus.ISSUED,
        order: { is: { status: 'PAID' } },
      },
      data: {
        status: TicketStatus.CHECKED_IN,
        checkedInAt: now,
        checkedInById: scannedByUserId,
      },
    });

    if (checkIn.count === 0) {
      // Race condition caught: another concurrent request just admitted this ticket
      const current = await prisma.ticket.findUnique({
        where: { id: ticket.id },
        select: { status: true, checkedInAt: true },
      });

      if (current?.status === TicketStatus.CHECKED_IN) {
        await TicketsService.logCheckIn({
          eventId,
          ticketId: ticket.id,
          scannedById: scannedByUserId,
          outcome: CheckInOutcome.ALREADY_USED,
          ticketCode,
          notes: 'Simultaneous duplicate scan detected and rejected.',
        });
        return {
          outcome: CheckInOutcome.ALREADY_USED,
          valid: true,
          alreadyCheckedIn: true,
          message: 'Ticket already scanned — attendee was previously admitted.',
          ticketId: ticket.id,
          ticketCode,
          serialNumber: ticket.serialNumber,
          previousCheckInAt: current.checkedInAt,
          ticketType: ticket.ticketType,
          event: ticket.event,
          attendee: {
            name: ticket.user.name,
            emailMasked: TicketsService.maskEmail(ticket.user.email),
          },
        };
      }

      return {
        outcome: CheckInOutcome.INVALID,
        valid: false,
        alreadyCheckedIn: false,
        message: 'Ticket is no longer valid for admission.',
        ticketId: ticket.id,
        ticketCode,
      };
    }

    // 11. Success! Record audit log
    await TicketsService.logCheckIn({
      eventId,
      ticketId: ticket.id,
      scannedById: scannedByUserId,
      outcome: CheckInOutcome.VALID,
      ticketCode,
      notes: `Admitted attendee ${ticket.user.name}`,
    });

    return {
      outcome: CheckInOutcome.VALID,
      valid: true,
      alreadyCheckedIn: false,
      message: 'Ticket validated successfully! Attendee admitted.',
      ticketId: ticket.id,
      ticketCode,
      serialNumber: ticket.serialNumber,
      checkedInAt: now,
      ticketType: ticket.ticketType,
      event: ticket.event,
      attendee: {
        name: ticket.user.name,
        emailMasked: TicketsService.maskEmail(ticket.user.email),
      },
    };
  }

  /**
   * Check-in Attendance Statistics & Audit History for an Event.
   */
  static async getEventCheckInStats({
    eventId,
    userId,
    userRole,
  }: {
    eventId: string;
    userId: string;
    userRole?: string;
  }) {
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: {
        id: true,
        title: true,
        organizerId: true,
        startsAt: true,
        endsAt: true,
        status: true,
        venue: true,
        city: true,
      },
    });

    if (!event) {
      throw new AppError('Event not found', 404);
    }

    if (userRole !== 'ADMIN' && event.organizerId !== userId) {
      throw new AppError('Forbidden: You do not have permission to view stats for this event', 403);
    }

    const [totalTickets, checkedInTickets, ticketTypes, recentLogs] = await Promise.all([
      prisma.ticket.count({
        where: {
          eventId,
          order: { status: 'PAID' },
          status: { in: [TicketStatus.ISSUED, TicketStatus.CHECKED_IN] },
        },
      }),
      prisma.ticket.count({
        where: {
          eventId,
          status: TicketStatus.CHECKED_IN,
        },
      }),
      prisma.ticketType.findMany({
        where: { eventId },
        select: {
          id: true,
          name: true,
          capacity: true,
          sold: true,
          _count: {
            select: {
              tickets: {
                where: { status: TicketStatus.CHECKED_IN },
              },
            },
          },
        },
        orderBy: { priceKes: 'asc' },
      }),
      prisma.checkInLog.findMany({
        where: { eventId },
        orderBy: { scannedAt: 'desc' },
        take: 20,
        include: {
          ticket: {
            select: {
              id: true,
              serialNumber: true,
              ticketType: { select: { name: true } },
              user: { select: { name: true, email: true } },
            },
          },
          scannedBy: { select: { id: true, name: true } },
        },
      }),
    ]);

    const percentage = totalTickets > 0 ? Math.round((checkedInTickets / totalTickets) * 100) : 0;

    return {
      event: {
        id: event.id,
        title: event.title,
        startsAt: event.startsAt,
        endsAt: event.endsAt,
        status: event.status,
        venue: event.venue,
        city: event.city,
      },
      counts: {
        total: totalTickets,
        checkedIn: checkedInTickets,
        remaining: Math.max(0, totalTickets - checkedInTickets),
        percentage,
      },
      ticketTypes: ticketTypes.map((tt) => ({
        id: tt.id,
        name: tt.name,
        sold: tt.sold,
        checkedIn: tt._count.tickets,
        remaining: Math.max(0, tt.sold - tt._count.tickets),
      })),
      recentScans: recentLogs.map((log) => ({
        id: log.id,
        outcome: log.outcome,
        ticketCode: log.ticketCode,
        serialNumber: log.ticket?.serialNumber ?? null,
        ticketTypeName: log.ticket?.ticketType?.name ?? null,
        attendeeName: log.ticket?.user?.name ?? null,
        attendeeEmailMasked: TicketsService.maskEmail(log.ticket?.user?.email),
        scannedByName: log.scannedBy.name,
        notes: log.notes,
        scannedAt: log.scannedAt,
      })),
    };
  }

  /**
   * Backwards-compatible verifyAndCheckIn for existing callers and tests.
   */
  static async verifyAndCheckIn(qrCode: string, scannedByUserId: string) {
    const ticketId = parseAndVerifyTicketQrPayload(qrCode);
    if (!ticketId) {
      throw new AppError('Invalid or tampered ticket QR code', 400);
    }

    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      select: { eventId: true },
    });

    if (!ticket) {
      throw new AppError('Ticket not found', 404);
    }

    const scanner = await prisma.user.findUnique({
      where: { id: scannedByUserId },
      select: { role: true },
    });

    const result = await TicketsService.checkInTicketForEvent({
      eventId: ticket.eventId,
      identifier: qrCode,
      scannedByUserId,
      userRole: scanner?.role ?? 'ORGANIZER',
    });

    if (result.outcome === CheckInOutcome.UNAUTHORIZED) {
      throw new AppError(result.message, 403);
    }
    if (!result.valid && !result.alreadyCheckedIn) {
      throw new AppError(result.message, 400);
    }

    return result;
  }
}
