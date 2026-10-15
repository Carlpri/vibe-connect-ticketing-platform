import { Request, Response } from 'express';
import { createEventSchema, eventParamsSchema } from './events.schemas';
import { 
  getAllEventsService, 
  getEventByIdService, 
  createEventService, 
  deleteEventService 
} from './events.service';

export const getEventsHandler = async (_req: Request, res: Response) => {
  try {
    const events = await getAllEventsService();
    res.json(events);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch events' });
  }
};

export const getEventByIdHandler = async (req: Request, res: Response) => {
  try {
    const parsedParams = eventParamsSchema.safeParse(req.params);
    if (!parsedParams.success) {
      return res.status(400).json({ error: parsedParams.error.errors });
    }

    const event = await getEventByIdService(parsedParams.data.id);
    if (!event) return res.status(404).json({ error: 'Event not found' });

    res.json(event);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch event details' });
  }
};

export const createEventHandler = async (req: Request, res: Response) => {
  try {
    const parsedBody = createEventSchema.safeParse(req.body);
    if (!parsedBody.success) {
      return res.status(400).json({ error: parsedBody.error.errors });
    }

    const newEvent = await createEventService(parsedBody.data);
    res.status(201).json(newEvent);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create event' });
  }
};

export const deleteEventHandler = async (req: Request, res: Response) => {
  try {
    const parsedParams = eventParamsSchema.safeParse(req.params);
    if (!parsedParams.success) {
      return res.status(400).json({ error: parsedParams.error.errors });
    }

    await deleteEventService(parsedParams.data.id);
    res.json({ message: 'Event deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete event' });
  }
};