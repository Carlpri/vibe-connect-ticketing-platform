import { prisma } from '../../shared/utils/prisma';
import { AppError } from '../../shared/errors/AppError';

export class AnalyticsService {
  /**
   * Organizer Dashboard overview metrics.
   */
  static async getOrganizerDashboardOverview(organizerId: string) {
    // 1. Fetch all events belonging to the organizer
    const events = await prisma.event.findMany({
      where: { organizerId },
      include: {
        ticketTypes: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const eventIds = events.map((e) => e.id);

    // 2. Aggregate capacities and counts
    let totalCapacity = 0;
    let totalTicketsSold = 0;
    let soldOutEventsCount = 0;

    const eventPerformance = events.map((evt) => {
      const evtCapacity = evt.ticketTypes.reduce((sum, tt) => sum + tt.capacity, 0);
      const evtSold = evt.ticketTypes.reduce((sum, tt) => sum + tt.sold, 0);
      const isSoldOut = evtCapacity > 0 && evtSold >= evtCapacity;

      totalCapacity += evtCapacity;
      totalTicketsSold += evtSold;
      if (isSoldOut) soldOutEventsCount += 1;

      return {
        id: evt.id,
        title: evt.title,
        slug: evt.slug,
        status: evt.status,
        format: evt.format,
        city: evt.city,
        startsAt: evt.startsAt,
        capacity: evtCapacity,
        sold: evtSold,
        remaining: Math.max(0, evtCapacity - evtSold),
        soldPercentage: evtCapacity > 0 ? Math.round((evtSold / evtCapacity) * 100) : 0,
        isSoldOut,
      };
    });

    const remainingTickets = Math.max(0, totalCapacity - totalTicketsSold);

    // 3. Financial calculations from PAID orders belonging to organizer's events
    const paidOrders = await prisma.order.findMany({
      where: {
        eventId: { in: eventIds },
        status: 'PAID',
      },
      select: {
        id: true,
        eventId: true,
        totalKes: true,
        subtotalKes: true,
        discountKes: true,
        serviceFeeKes: true,
        createdAt: true,
        paidAt: true,
      },
    });

    const grossTicketSalesKes = paidOrders.reduce((sum, o) => sum + (o.subtotalKes || o.totalKes), 0);
    const totalDiscountsKes = paidOrders.reduce((sum, o) => sum + (o.discountKes || 0), 0);
    const totalServiceFeesKes = paidOrders.reduce((sum, o) => sum + (o.serviceFeeKes || 0), 0);
    const netOrganizerRevenueKes = Math.max(0, grossTicketSalesKes - totalDiscountsKes);

    // Attach gross revenue per event in performance table
    const revenueByEvent = new Map<string, number>();
    for (const o of paidOrders) {
      revenueByEvent.set(o.eventId, (revenueByEvent.get(o.eventId) ?? 0) + (o.subtotalKes - o.discountKes));
    }
    for (const p of eventPerformance) {
      (p as any).grossRevenueKes = revenueByEvent.get(p.id) ?? 0;
    }

    // 4. Recent orders for organizer events (last 15)
    const recentOrders = await prisma.order.findMany({
      where: {
        eventId: { in: eventIds },
      },
      include: {
        event: { select: { id: true, title: true, slug: true } },
        user: { select: { id: true, name: true, email: true, phone: true } },
        items: {
          select: {
            id: true,
            ticketTypeId: true,
            quantity: true,
            unitPriceKes: true,
          },
        },
        payments: {
          take: 1,
          orderBy: { createdAt: 'desc' },
          select: { reference: true, status: true, channel: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 15,
    });

    // 5. Daily sales trend (last 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const recentPaidOrders = paidOrders.filter((o) => o.createdAt >= thirtyDaysAgo);
    const salesByDayMap = new Map<string, { date: string; grossKes: number; ordersCount: number }>();

    for (const o of recentPaidOrders) {
      const dateKey = o.createdAt.toISOString().split('T')[0];
      const existing = salesByDayMap.get(dateKey) || { date: dateKey, grossKes: 0, ordersCount: 0 };
      existing.grossKes += (o.subtotalKes - o.discountKes);
      existing.ordersCount += 1;
      salesByDayMap.set(dateKey, existing);
    }

    const salesTrend = Array.from(salesByDayMap.values()).sort((a, b) => a.date.localeCompare(b.date));

    return {
      metrics: {
        totalEvents: events.length,
        publishedEvents: events.filter((e) => e.status === 'PUBLISHED').length,
        soldOutEventsCount,
        totalCapacity,
        totalTicketsSold,
        remainingTickets,
        soldPercentage: totalCapacity > 0 ? Math.round((totalTicketsSold / totalCapacity) * 100) : 0,
        grossTicketSalesKes,
        totalDiscountsKes,
        totalServiceFeesKes,
        netOrganizerRevenueKes,
        totalPaidOrders: paidOrders.length,
      },
      events: eventPerformance,
      recentOrders: recentOrders.map((o) => ({
        id: o.id,
        eventTitle: o.event.title,
        customerName: o.user.name,
        customerEmail: o.user.email,
        customerPhone: o.user.phone,
        status: o.status,
        subtotalKes: o.subtotalKes,
        discountKes: o.discountKes,
        serviceFeeKes: o.serviceFeeKes,
        totalKes: o.totalKes,
        promoCode: o.promoCodeSnapshot,
        ticketsCount: o.items.reduce((sum, item) => sum + item.quantity, 0),
        items: o.items.map((i) => ({
          ticketTypeId: i.ticketTypeId,
          quantity: i.quantity,
          unitPriceKes: i.unitPriceKes,
        })),
        createdAt: o.createdAt,
        paymentReference: o.payments[0]?.reference ?? null,
      })),
      salesTrend,
    };
  }

  /**
   * Detailed single-event analytics report.
   */
  static async getEventDetailedAnalytics(eventId: string, userId: string, role: string) {
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: {
        ticketTypes: true,
        promoCodes: {
          include: {
            usages: true,
          },
        },
      },
    });

    if (!event) {
      throw new AppError('Event not found', 404);
    }

    if (role !== 'ADMIN' && event.organizerId !== userId) {
      throw new AppError('Forbidden: Access denied to this event analytics', 403);
    }

    // Ticket sales per ticket type tier
    const tiers = event.ticketTypes.map((tt) => {
      const sold = tt.sold;
      const capacity = tt.capacity;
      const remaining = Math.max(0, capacity - sold);
      const revenueKes = sold * tt.priceKes;
      const percentage = capacity > 0 ? Math.round((sold / capacity) * 100) : 0;

      return {
        id: tt.id,
        name: tt.name,
        priceKes: tt.priceKes,
        capacity,
        sold,
        remaining,
        revenueKes,
        soldPercentage: percentage,
      };
    });

    // Check-in progress
    const ticketsIssued = await prisma.ticket.count({
      where: { eventId },
    });
    const ticketsCheckedIn = await prisma.ticket.count({
      where: { eventId, status: 'CHECKED_IN' },
    });

    // Event financial summary
    const paidOrders = await prisma.order.findMany({
      where: { eventId, status: 'PAID' },
      select: {
        totalKes: true,
        subtotalKes: true,
        discountKes: true,
        serviceFeeKes: true,
        createdAt: true,
      },
    });

    const grossSalesKes = paidOrders.reduce((sum, o) => sum + (o.subtotalKes || o.totalKes), 0);
    const discountTotalKes = paidOrders.reduce((sum, o) => sum + (o.discountKes || 0), 0);
    const serviceFeesTotalKes = paidOrders.reduce((sum, o) => sum + (o.serviceFeeKes || 0), 0);
    const netRevenueKes = Math.max(0, grossSalesKes - discountTotalKes);

    return {
      event: {
        id: event.id,
        title: event.title,
        slug: event.slug,
        status: event.status,
        startsAt: event.startsAt,
        venue: event.venue,
        city: event.city,
      },
      tiers,
      checkIn: {
        totalIssued: ticketsIssued,
        checkedIn: ticketsCheckedIn,
        pendingCheckIn: Math.max(0, ticketsIssued - ticketsCheckedIn),
        attendanceRate: ticketsIssued > 0 ? Math.round((ticketsCheckedIn / ticketsIssued) * 100) : 0,
      },
      financials: {
        grossSalesKes,
        discountTotalKes,
        serviceFeesTotalKes,
        netRevenueKes,
        ordersCount: paidOrders.length,
      },
      promoCodes: event.promoCodes.map((p) => ({
        code: p.code,
        influencerName: p.influencerName,
        discountType: p.discountType,
        discountValue: p.discountValue,
        currentUses: p.currentUses,
        totalDiscountGivenKes: p.usages.reduce((sum, u) => sum + u.discountKes, 0),
      })),
    };
  }

  /**
   * System-wide administrator metrics and KPIs.
   */
  static async getAdminDashboardOverview() {
    const [
      totalUsers,
      totalOrganizers,
      totalEvents,
      publishedEvents,
      totalTicketsSoldAgg,
      paidOrdersAgg,
      recentUsers,
      recentEvents,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { role: 'ORGANIZER' } }),
      prisma.event.count(),
      prisma.event.count({ where: { status: 'PUBLISHED' } }),
      prisma.ticketType.aggregate({ _sum: { sold: true, capacity: true } }),
      prisma.order.aggregate({
        where: { status: 'PAID' },
        _sum: { totalKes: true, subtotalKes: true, discountKes: true, serviceFeeKes: true },
        _count: { id: true },
      }),
      prisma.user.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: { id: true, name: true, email: true, role: true, createdAt: true },
      }),
      prisma.event.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: { id: true, title: true, city: true, status: true, startsAt: true, organizer: { select: { name: true } } },
      }),
    ]);

    const grossSalesKes = paidOrdersAgg._sum.subtotalKes ?? 0;
    const platformServiceFeesKes = paidOrdersAgg._sum.serviceFeeKes ?? 0;
    const totalDiscountsKes = paidOrdersAgg._sum.discountKes ?? 0;
    const totalPaidKes = paidOrdersAgg._sum.totalKes ?? 0;

    return {
      kpis: {
        totalUsers,
        totalOrganizers,
        totalEvents,
        publishedEvents,
        totalTicketsSold: totalTicketsSoldAgg._sum.sold ?? 0,
        totalPlatformCapacity: totalTicketsSoldAgg._sum.capacity ?? 0,
        paidOrdersCount: paidOrdersAgg._count.id,
        grossSalesKes,
        platformServiceFeesKes,
        totalDiscountsKes,
        totalPaidKes,
      },
      recentUsers,
      recentEvents,
    };
  }
}
