import { prisma } from '../../shared/utils/prisma';
import { AppError } from '../../shared/errors/AppError';
import { CreateEventInput, UpdateEventInput, ListEventsQuery, ListAttendeesQuery } from './events.schemas';
import { TokenPayload, UserRole } from '../../shared/types';
import { Prisma } from '@prisma/client';
import { parseAndValidateBase64Image, saveImageToUploads } from '../../shared/utils/imageUpload';

/**
 * Transforms a Prisma event (with nested organizer and sold counts) into the
 * flat shape the frontend expects: organizerName as a top-level string and
 * each ticketType gaining a computed `available` field.
 */
function formatEventForClient(event: any) {
  const { organizer, ticketTypes, flyers, ...rest } = event;
  return {
    ...rest,
    organizerName: organizer?.name ?? null,
    flyers: (flyers ?? []).map((f: any) => ({
      id: f.id,
      url: f.url,
      order: f.order,
      createdAt: f.createdAt,
    })),
    ticketTypes: (ticketTypes ?? []).map((t: any) => ({
      ...t,
      available: Math.max(0, (t.capacity ?? 0) - (t.sold ?? 0)),
    })),
  };
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function publicUpcomingEventFilter(now: Date): Prisma.EventWhereInput {
  return {
    status: 'PUBLISHED',
    endsAt: { gt: now },
  };
}

export function managedEventFilter(
  user: Pick<TokenPayload, 'userId' | 'role'>,
  period: 'all' | 'upcoming' | 'past',
  now: Date
): Prisma.EventWhereInput {
  const where: Prisma.EventWhereInput = {};

  if (user.role !== 'ADMIN') {
    where.organizerId = user.userId;
  }

  if (period === 'upcoming') {
    where.endsAt = { gt: now };
  } else if (period === 'past') {
    where.endsAt = { lte: now };
  }

  return where;
}

export function assertOrganizerMayPublish(
  role: UserRole,
  applicationStatus: 'NONE' | 'PENDING' | 'APPROVED' | 'REJECTED',
  eventStatus: 'DRAFT' | 'PUBLISHED' | 'CANCELLED' | 'COMPLETED'
): void {
  if (eventStatus === 'PUBLISHED' && role !== 'ADMIN' && applicationStatus !== 'APPROVED') {
    throw new AppError('Admin approval is required before publishing events', 403);
  }
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export class EventsService {
  /**
   * Generates a unique slug for an event title.
   */
  private static async generateUniqueSlug(baseTitle: string, customSlug?: string): Promise<string> {
    const base = customSlug ? slugify(customSlug) : slugify(baseTitle);
    let candidate = base;
    let counter = 1;

    while (true) {
      const existing = await prisma.event.findUnique({
        where: { slug: candidate },
        select: { id: true },
      });
      if (!existing) return candidate;

      candidate = `${base}-${counter}`;
      counter++;
    }
  }

  /**
   * Create a new event with ticket types in an atomic transaction.
   */
  static async createEvent(user: TokenPayload, input: CreateEventInput) {
    const organizer = await prisma.user.findUnique({
      where: { id: user.userId },
      select: { role: true, organizerApplicationStatus: true },
    });
    if (!organizer) throw new AppError('Organizer account not found', 404);
    if (organizer.role !== user.role) {
      throw new AppError('Account permissions changed. Please sign in again.', 403);
    }
    assertOrganizerMayPublish(organizer.role, organizer.organizerApplicationStatus, input.status);

    const organizerId = user.userId;
    const slug = await this.generateUniqueSlug(input.title, input.slug);

    const initialCover = input.coverImage || (input.flyers && input.flyers[0]) || null;

    const event = await prisma.event.create({
      data: {
        organizerId,
        title: input.title,
        slug,
        description: input.description,
        category: input.category,
        coverImage: initialCover,
        format: input.format,
        status: input.status,
        startsAt: new Date(input.startsAt),
        endsAt: new Date(input.endsAt),
        venue: input.venue || null,
        city: input.city || null,
        county: input.county || null,
        address: input.address || null,
        latitude: input.latitude ?? null,
        longitude: input.longitude ?? null,
        placeId: input.placeId || null,
        directions: input.directions || null,
        onlineUrl: input.onlineUrl || null,
        theme: input.theme || null,
        bibleVerse: input.bibleVerse || null,
        dressCode: input.dressCode || null,
        edition: input.edition || null,
        flyers: input.flyers && input.flyers.length > 0 ? {
          create: input.flyers.slice(0, 10).map((url, idx) => ({
            url,
            order: idx,
          })),
        } : undefined,
        ticketTypes: {
          create: input.ticketTypes.map((ticket) => ({
            name: ticket.name,
            description: ticket.description || null,
            priceKes: ticket.priceKes,
            capacity: ticket.capacity,
            sold: 0,
            salesStart: ticket.salesStart ? new Date(ticket.salesStart) : null,
            salesEnd: ticket.salesEnd ? new Date(ticket.salesEnd) : null,
            isActive: ticket.isActive,
          })),
        },
      },
      include: {
        ticketTypes: {
          orderBy: { priceKes: 'asc' },
        },
        flyers: {
          orderBy: { order: 'asc' },
        },
        organizer: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return formatEventForClient(event);
  }

  /**
   * List events with filtering, search, and pagination.
   * Public visitors receive only PUBLISHED events.
   */
  static async listEvents(query: ListEventsQuery) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const where = publicUpcomingEventFilter(new Date());

    if (query.category && query.category !== 'All') {
      where.category = { equals: query.category, mode: 'insensitive' };
    }

    if (query.city && query.city !== 'All') {
      where.city = { equals: query.city, mode: 'insensitive' };
    }

    if (query.format) {
      where.format = query.format;
    }

    if (query.search && query.search.trim()) {
      const term = query.search.trim();
      where.OR = [
        { title: { contains: term, mode: 'insensitive' } },
        { description: { contains: term, mode: 'insensitive' } },
        { venue: { contains: term, mode: 'insensitive' } },
        { city: { contains: term, mode: 'insensitive' } },
      ];
    }

    const [events, total] = await Promise.all([
      prisma.event.findMany({
        where,
        skip,
        take: limit,
        orderBy: { startsAt: 'asc' },
        include: {
          ticketTypes: {
            where: { isActive: true },
            orderBy: { priceKes: 'asc' },
          },
          flyers: {
            orderBy: { order: 'asc' },
          },
          organizer: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      }),
      prisma.event.count({ where }),
    ]);

    return {
      events: events.map(formatEventForClient),
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  /**
   * List events for an authenticated organizer or administrator.
   * Organizers are always scoped to their own events; administrators may see all.
   */
  static async listManagedEvents(query: ListEventsQuery & { period: 'all' | 'upcoming' | 'past' }, user: TokenPayload) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;
    const now = new Date();
    const where = managedEventFilter(user, query.period, now);

    if (query.status) {
      where.status = query.status;
    }

    const [events, total] = await Promise.all([
      prisma.event.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ endsAt: query.period === 'past' ? 'desc' : 'asc' }, { startsAt: 'asc' }],
        include: {
          ticketTypes: {
            orderBy: { priceKes: 'asc' },
          },
          flyers: {
            orderBy: { order: 'asc' },
          },
          organizer: {
            select: { id: true, name: true },
          },
        },
      }),
      prisma.event.count({ where }),
    ]);

    return {
      events: events.map(formatEventForClient),
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  /**
   * Retrieve an event by its UUID or friendly slug.
   * Protects private draft and cancelled events from unauthorized visitors.
   */
  static async getEventByIdOrSlug(identifier: string, user?: TokenPayload) {
    const isUuid = UUID_REGEX.test(identifier);

    const event = await prisma.event.findUnique({
      where: isUuid ? { id: identifier } : { slug: identifier },
      include: {
        ticketTypes: {
          orderBy: { priceKes: 'asc' },
        },
        flyers: {
          orderBy: { order: 'asc' },
        },
        organizer: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!event) {
      throw new AppError('Event not found', 404);
    }

    // Access control: private / draft events only viewable by event owner or admin
    if (event.status !== 'PUBLISHED') {
      const isOwner = user && user.userId === event.organizerId;
      const isAdmin = user && user.role === 'ADMIN';
      if (!isOwner && !isAdmin) {
        throw new AppError('Event not found', 404);
      }
    }

    return formatEventForClient(event);
  }

  /**
   * Update an existing event. Only the organizer owner or ADMIN can update.
   */
  static async updateEvent(id: string, user: TokenPayload, input: UpdateEventInput) {
    const existing = await prisma.event.findUnique({
      where: { id },
      include: { ticketTypes: true },
    });

    if (!existing) {
      throw new AppError('Event not found', 404);
    }

    if (user.role !== 'ADMIN' && existing.organizerId !== user.userId) {
      throw new AppError('Forbidden: You do not have permission to update this event', 403);
    }
    if (user.role !== 'ADMIN') {
      const organizer = await prisma.user.findUnique({
        where: { id: user.userId },
        select: { role: true, organizerApplicationStatus: true },
      });
      if (!organizer) throw new AppError('Organizer account not found', 404);
      if (organizer.role !== user.role) {
        throw new AppError('Account permissions changed. Please sign in again.', 403);
      }
      assertOrganizerMayPublish(
        organizer.role,
        organizer.organizerApplicationStatus,
        input.status ?? existing.status
      );
    }

    // Validate dates if updated
    const startsAt = input.startsAt ? new Date(input.startsAt) : existing.startsAt;
    const endsAt = input.endsAt ? new Date(input.endsAt) : existing.endsAt;
    if (endsAt <= startsAt) {
      throw new AppError('Event end time must be after start time', 400);
    }

    if (input.flyers && input.flyers.length > 10) {
      throw new AppError('An event can have a maximum of 10 promotional flyers', 400);
    }

    const updatedCover =
      input.coverImage === ''
        ? null
        : input.coverImage ??
          (input.flyers !== undefined ? input.flyers[0] ?? null : existing.coverImage);

    const updated = await prisma.$transaction(async (tx) => {
      if (input.flyers !== undefined) {
        await tx.eventFlyer.deleteMany({ where: { eventId: id } });
        if (input.flyers.length > 0) {
          await tx.eventFlyer.createMany({
            data: input.flyers.map((url, idx) => ({
              eventId: id,
              url,
              order: idx,
            })),
          });
        }
      }

      return tx.event.update({
        where: { id },
        data: {
          title: input.title,
          description: input.description,
          category: input.category,
          coverImage: updatedCover,
          format: input.format,
          status: input.status,
          startsAt,
          endsAt,
          venue: input.venue,
          city: input.city,
          county: input.county,
          address: input.address,
          latitude: input.latitude,
          longitude: input.longitude,
          placeId: input.placeId,
          directions: input.directions,
          onlineUrl: input.onlineUrl === '' ? null : input.onlineUrl,
          theme: input.theme,
          bibleVerse: input.bibleVerse,
          dressCode: input.dressCode,
          edition: input.edition,
        },
        include: {
          ticketTypes: true,
          flyers: { orderBy: { order: 'asc' } },
          organizer: {
            select: { id: true, name: true, email: true },
          },
        },
      });
    });

    return formatEventForClient(updated);
  }

  /**
   * Cancel or delete an event safely.
   * If tickets have already been booked/sold, event status is updated to CANCELLED to preserve audit trail.
   */
  static async deleteOrCancelEvent(id: string, user: TokenPayload) {
    const event = await prisma.event.findUnique({
      where: { id },
      include: { ticketTypes: true },
    });

    if (!event) {
      throw new AppError('Event not found', 404);
    }

    if (user.role !== 'ADMIN' && event.organizerId !== user.userId) {
      throw new AppError('Forbidden: You do not have permission to cancel this event', 403);
    }

    const totalSold = event.ticketTypes.reduce((sum, t) => sum + t.sold, 0);

    if (totalSold > 0) {
      // Safe cancellation preserving audit history
      const cancelled = await prisma.event.update({
        where: { id },
        data: { status: 'CANCELLED' },
      });
      return {
        event: cancelled,
        action: 'CANCELLED',
        message: 'Event has active ticket sales and has been marked as CANCELLED to preserve audit history.',
      };
    }

    // If no tickets sold, update to CANCELLED or delete
    const cancelled = await prisma.event.update({
      where: { id },
      data: { status: 'CANCELLED' },
    });

    return {
      event: cancelled,
      action: 'CANCELLED',
      message: 'Event cancelled successfully.',
    };
  }

  /**
   * Uploads and saves a standalone flyer image (validating size and magic bytes).
   */
  static async uploadStandaloneFlyer(dataUrl: string) {
    const validatedImage = parseAndValidateBase64Image(dataUrl);
    const url = await saveImageToUploads(validatedImage, 'flyers');
    return { url };
  }

  /**
   * Uploads and attaches a flyer to a specific event.
   */
  static async uploadEventFlyer(
    eventId: string,
    user: TokenPayload,
    input: { dataUrl?: string; url?: string; order?: number }
  ) {
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: { flyers: true },
    });
    if (!event) throw new AppError('Event not found', 404);
    if (user.role !== 'ADMIN' && event.organizerId !== user.userId) {
      throw new AppError('Forbidden: You do not have permission to manage flyers for this event', 403);
    }
    if (event.flyers.length >= 10) {
      throw new AppError('Maximum limit of 10 flyers reached for this event', 400);
    }

    let flyerUrl = input.url;
    if (input.dataUrl) {
      const validatedImage = parseAndValidateBase64Image(input.dataUrl);
      flyerUrl = await saveImageToUploads(validatedImage, 'flyers');
    }
    if (!flyerUrl) {
      throw new AppError('Flyer image is required', 400);
    }

    const nextOrder =
      input.order ??
      (event.flyers.length > 0 ? Math.max(...event.flyers.map((f) => f.order)) + 1 : 0);

    const flyer = await prisma.eventFlyer.create({
      data: {
        eventId,
        url: flyerUrl,
        order: nextOrder,
      },
    });

    if (!event.coverImage) {
      await prisma.event.update({
        where: { id: eventId },
        data: { coverImage: flyerUrl },
      });
    }

    return flyer;
  }

  /**
   * Retrieves all flyers for an event ordered by priority.
   */
  static async getEventFlyers(eventId: string, user?: TokenPayload) {
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: {
        flyers: { orderBy: { order: 'asc' } },
      },
    });
    if (!event) throw new AppError('Event not found', 404);
    if (event.status !== 'PUBLISHED') {
      const isOwner = user && user.userId === event.organizerId;
      const isAdmin = user && user.role === 'ADMIN';
      if (!isOwner && !isAdmin) {
        throw new AppError('Event not found', 404);
      }
    }
    return event.flyers;
  }

  /**
   * Reorders flyers for an event.
   */
  static async reorderFlyers(eventId: string, user: TokenPayload, flyerIds: string[]) {
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: { flyers: true },
    });
    if (!event) throw new AppError('Event not found', 404);
    if (user.role !== 'ADMIN' && event.organizerId !== user.userId) {
      throw new AppError('Forbidden: You do not have permission to manage flyers for this event', 403);
    }

    const eventFlyerIds = new Set(event.flyers.map((f) => f.id));
    for (const id of flyerIds) {
      if (!eventFlyerIds.has(id)) {
        throw new AppError(`Flyer ${id} does not belong to this event`, 400);
      }
    }

    await prisma.$transaction(
      flyerIds.map((id, index) =>
        prisma.eventFlyer.update({
          where: { id },
          data: { order: index },
        })
      )
    );

    const firstFlyer = event.flyers.find((f) => f.id === flyerIds[0]);
    if (firstFlyer) {
      await prisma.event.update({
        where: { id: eventId },
        data: { coverImage: firstFlyer.url },
      });
    }

    return prisma.eventFlyer.findMany({
      where: { eventId },
      orderBy: { order: 'asc' },
    });
  }

  /**
   * Deletes a flyer from an event.
   */
  static async deleteFlyer(eventId: string, flyerId: string, user: TokenPayload) {
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: { flyers: { orderBy: { order: 'asc' } } },
    });
    if (!event) throw new AppError('Event not found', 404);
    if (user.role !== 'ADMIN' && event.organizerId !== user.userId) {
      throw new AppError('Forbidden: You do not have permission to manage flyers for this event', 403);
    }

    const flyer = event.flyers.find((f) => f.id === flyerId);
    if (!flyer) throw new AppError('Flyer not found', 404);

    await prisma.eventFlyer.delete({ where: { id: flyerId } });

    const remainingFlyers = event.flyers.filter((f) => f.id !== flyerId);
    if (event.coverImage === flyer.url) {
      await prisma.event.update({
        where: { id: eventId },
        data: { coverImage: remainingFlyers[0]?.url || null },
      });
    }

    return { message: 'Flyer deleted successfully', remainingCount: remainingFlyers.length };
  }

  /**
   * Retrieve registrations & attendees for an event.
   * Only accessible by authorized event organizer or ADMIN.
   */
  static async getEventAttendees(
    eventId: string,
    user: TokenPayload,
    query: ListAttendeesQuery
  ) {
    const isUuid = UUID_REGEX.test(eventId);
    const event = await prisma.event.findUnique({
      where: isUuid ? { id: eventId } : { slug: eventId },
      select: { id: true, title: true, organizerId: true, startsAt: true, venue: true },
    });

    if (!event) {
      throw new AppError('Event not found', 404);
    }

    if (user.role !== 'ADMIN' && event.organizerId !== user.userId) {
      throw new AppError('Forbidden: You do not have permission to view attendees for this event', 403);
    }

    const { search, status, page = 1, limit = 50 } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.TicketWhereInput = {
      eventId: event.id,
      order: { status: 'PAID' },
    };

    if (status === 'CHECKED_IN') {
      where.status = 'CHECKED_IN';
    } else if (status === 'NOT_CHECKED_IN') {
      where.status = 'ISSUED';
    } else if (status === 'VOID') {
      where.status = 'VOID';
    }

    if (search && search.trim()) {
      const s = search.trim();
      where.OR = [
        { user: { name: { contains: s, mode: 'insensitive' } } },
        { user: { email: { contains: s, mode: 'insensitive' } } },
        { user: { phone: { contains: s, mode: 'insensitive' } } },
        ...(UUID_REGEX.test(s) ? [{ id: { equals: s } }] : []),
      ];
    }

    const [total, tickets, stats] = await Promise.all([
      prisma.ticket.count({ where }),
      prisma.ticket.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
        include: {
          ticketType: { select: { id: true, name: true, priceKes: true } },
          user: { select: { id: true, name: true, email: true, phone: true } },
          order: { select: { id: true, status: true, paidAt: true, totalKes: true } },
        },
      }),
      prisma.ticket.groupBy({
        by: ['status'],
        where: { eventId: event.id, order: { status: 'PAID' } },
        _count: { id: true },
      }),
    ]);

    let totalIssued = 0;
    let checkedIn = 0;
    let notCheckedIn = 0;
    let voidCount = 0;

    for (const group of stats) {
      if (group.status === 'CHECKED_IN') {
        checkedIn += group._count.id;
        totalIssued += group._count.id;
      } else if (group.status === 'ISSUED') {
        notCheckedIn += group._count.id;
        totalIssued += group._count.id;
      } else if (group.status === 'VOID') {
        voidCount += group._count.id;
      }
    }

    return {
      event: {
        id: event.id,
        title: event.title,
        venue: event.venue,
        startsAt: event.startsAt,
      },
      counts: {
        totalIssued,
        checkedIn,
        notCheckedIn,
        void: voidCount,
        percentage: totalIssued > 0 ? Math.round((checkedIn / totalIssued) * 100) : 0,
      },
      attendees: tickets.map((t) => ({
        ticketId: t.id,
        serialNumber: t.serialNumber,
        ticketCode: `VC-${t.id.replace(/-/g, '').slice(0, 8).toUpperCase()}`,
        ticketType: t.ticketType.name,
        priceKes: t.ticketType.priceKes,
        attendeeName: t.user.name,
        attendeeEmail: t.user.email,
        attendeePhone: t.user.phone,
        status: t.status,
        checkedInAt: t.checkedInAt,
        registeredAt: t.createdAt,
        orderId: t.orderId,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }
}
