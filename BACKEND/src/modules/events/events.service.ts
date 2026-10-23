import { prisma } from '../../shared/utils/prisma';
import { AppError } from '../../shared/errors/AppError';
import { CreateEventInput, UpdateEventInput, ListEventsQuery } from './events.schemas';
import { TokenPayload, UserRole } from '../../shared/types';
import { Prisma } from '@prisma/client';

/**
 * Transforms a Prisma event (with nested organizer and sold counts) into the
 * flat shape the frontend expects: organizerName as a top-level string and
 * each ticketType gaining a computed `available` field.
 */
function formatEventForClient(event: any) {
  const { organizer, ticketTypes, ...rest } = event;
  return {
    ...rest,
    organizerName: organizer?.name ?? null,
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

    const event = await prisma.event.create({
      data: {
        organizerId,
        title: input.title,
        slug,
        description: input.description,
        category: input.category,
        coverImage: input.coverImage || null,
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
        onlineUrl: input.onlineUrl || null,
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

    const updated = await prisma.event.update({
      where: { id },
      data: {
        title: input.title,
        description: input.description,
        category: input.category,
        coverImage: input.coverImage === '' ? null : input.coverImage,
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
        onlineUrl: input.onlineUrl === '' ? null : input.onlineUrl,
      },
      include: {
        ticketTypes: true,
        organizer: {
          select: { id: true, name: true, email: true },
        },
      },
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
}
