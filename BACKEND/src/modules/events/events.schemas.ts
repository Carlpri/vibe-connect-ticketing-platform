import { z } from 'zod';

export const createEventSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  category: z.string().optional().default('Festivals'),
  date: z.string().optional().default(new Date().toISOString()),
  venue: z.string().min(1, 'Venue is required'),
  location: z.string().min(1, 'Location is required'),
  imageUrl: z.string().url().optional().or(z.literal('')),
  tickets: z.array(
    z.object({
      price: z.number().positive('Ticket price must be positive'),
      name: z.string().optional()
    })
  ).min(1, 'At least one ticket type is required')
});

export const eventParamsSchema = z.object({
  id: z.string().min(1, 'Event ID is required')
});

export type CreateEventInput = z.infer<typeof createEventSchema>;