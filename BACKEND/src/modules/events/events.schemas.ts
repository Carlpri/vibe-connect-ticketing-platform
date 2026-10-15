import { z } from 'zod';

export const eventFormatSchema = z.enum(['PHYSICAL', 'ONLINE', 'HYBRID']);
export const eventStatusSchema = z.enum(['DRAFT', 'PUBLISHED', 'CANCELLED', 'COMPLETED']);

export const createTicketTypeSchema = z.object({
  name: z.string().trim().min(1, 'Ticket name is required').max(100),
  description: z.string().trim().max(500).optional(),
  priceKes: z.number().int('Price must be an integer in KES').nonnegative('Price cannot be negative'),
  capacity: z.number().int('Capacity must be an integer').positive('Capacity must be greater than 0'),
  salesStart: z.string().datetime({ message: 'Invalid sales start datetime' }).optional(),
  salesEnd: z.string().datetime({ message: 'Invalid sales end datetime' }).optional(),
  isActive: z.boolean().default(true),
}).refine(
  (data) => {
    if (data.salesStart && data.salesEnd) {
      return new Date(data.salesEnd) >= new Date(data.salesStart);
    }
    return true;
  },
  {
    message: 'Ticket sales end time must be at or after sales start time',
    path: ['salesEnd'],
  }
);

export const createEventSchema = z.object({
  title: z.string().trim().min(3, 'Event title must be at least 3 characters').max(200),
  slug: z
    .string()
    .trim()
    .min(3)
    .max(220)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be lower-case alphanumeric characters separated by hyphens')
    .optional(),
  description: z.string().trim().min(10, 'Description must be at least 10 characters'),
  category: z.string().trim().min(2, 'Category is required'),
  coverImage: z.string().url('Cover image must be a valid URL').optional().or(z.literal('')),
  format: eventFormatSchema.default('PHYSICAL'),
  status: eventStatusSchema.default('PUBLISHED'),
  startsAt: z.string().datetime({ message: 'Valid startsAt ISO datetime is required' }),
  endsAt: z.string().datetime({ message: 'Valid endsAt ISO datetime is required' }),
  
  // Physical location details
  venue: z.string().trim().max(200).optional(),
  city: z.string().trim().max(100).optional(),
  county: z.string().trim().max(100).optional(),
  address: z.string().trim().max(300).optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),

  // Online location details
  onlineUrl: z.string().url('Online meeting link must be a valid URL').optional().or(z.literal('')),

  // Ticket types (at least 1 ticket type required)
  ticketTypes: z.array(createTicketTypeSchema).min(1, 'Event must have at least one ticket type'),
}).refine(
  (data) => new Date(data.endsAt) > new Date(data.startsAt),
  {
    message: 'Event end time must be after start time',
    path: ['endsAt'],
  }
).refine(
  (data) => {
    if (data.format === 'PHYSICAL' || data.format === 'HYBRID') {
      return Boolean(data.venue && data.venue.trim().length > 0);
    }
    return true;
  },
  {
    message: 'Physical and hybrid events require a venue name',
    path: ['venue'],
  }
);

export const updateEventSchema = z.object({
  title: z.string().trim().min(3).max(200).optional(),
  description: z.string().trim().min(10).optional(),
  category: z.string().trim().min(2).optional(),
  coverImage: z.string().url().optional().or(z.literal('')),
  format: eventFormatSchema.optional(),
  status: eventStatusSchema.optional(),
  startsAt: z.string().datetime().optional(),
  endsAt: z.string().datetime().optional(),
  venue: z.string().trim().max(200).optional(),
  city: z.string().trim().max(100).optional(),
  county: z.string().trim().max(100).optional(),
  address: z.string().trim().max(300).optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  onlineUrl: z.string().url().optional().or(z.literal('')),
});

export const listEventsQuerySchema = z.object({
  search: z.string().trim().optional(),
  category: z.string().trim().optional(),
  city: z.string().trim().optional(),
  format: eventFormatSchema.optional(),
  status: eventStatusSchema.optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export const eventIdParamSchema = z.object({
  id: z.string().trim().min(1, 'Event identifier is required'),
});

export type CreateEventInput = z.infer<typeof createEventSchema>;
export type UpdateEventInput = z.infer<typeof updateEventSchema>;
export type ListEventsQuery = z.infer<typeof listEventsQuerySchema>;
