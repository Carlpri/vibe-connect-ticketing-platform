import { prisma } from '../../config/db';
import { CreateEventInput } from './events.schemas';

export const getAllEventsService = async () => {
  const events = await prisma.event.findMany({
    orderBy: { createdAt: 'desc' }
  });
  return events.map(e => ({
    ...e,
    tickets: [{ price: e.ticketPrice }]
  }));
};

export const getEventByIdService = async (id: string) => {
  const event = await prisma.event.findUnique({ where: { id } });
  if (!event) return null;
  return {
    ...event,
    tickets: [{ price: event.ticketPrice }]
  };
};

export const createEventService = async (data: CreateEventInput) => {
  const price = data.tickets && data.tickets.length > 0 ? Number(data.tickets[0].price) : 1000;
  
  const newEvent = await prisma.event.create({
    data: {
      title: data.title,
      category: data.category || 'Festivals',
      date: data.date || new Date().toISOString(),
      venue: data.venue,
      location: data.location,
      imageUrl: data.imageUrl || 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?q=80&w=400&auto=format&fit=crop',
      ticketPrice: price
    }
  });

  return {
    ...newEvent,
    tickets: [{ price: newEvent.ticketPrice }]
  };
};

export const deleteEventService = async (id: string) => {
  return await prisma.event.delete({ where: { id } });
};