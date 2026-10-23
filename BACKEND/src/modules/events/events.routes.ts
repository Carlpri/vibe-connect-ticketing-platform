import { Router } from 'express';
import { authenticate, requireRole } from '../auth/auth.middleware';
import { validateBody, validateParams, validateQuery } from '../../shared/middleware/validate';
import { EventsController } from './events.controller';
import {
  createEventSchema,
  updateEventSchema,
  listEventsQuerySchema,
  managedEventsQuerySchema,
  eventIdParamSchema,
} from './events.schemas';

// ===========================================
// Events Module — Routes
// ===========================================
// Domain: Events and Ticket Inventory
//
// Endpoints:
// - POST   /api/events         (create event — organizer / admin only)
// - GET    /api/events         (list/search events — public, draft protected)
// - GET    /api/events/:id     (get event details by id or slug — public, draft protected)
// - PATCH  /api/events/:id     (update event — event owner or admin)
// - PUT    /api/events/:id     (update event — event owner or admin)
// - DELETE /api/events/:id     (cancel/archive event — event owner or admin)
// ===========================================

const router = Router();

// Create new event with ticket types
router.post(
  '/',
  authenticate,
  requireRole('ORGANIZER', 'ADMIN'),
  validateBody(createEventSchema),
  EventsController.createEvent
);

// Organizer-owned events and administrator-wide event management.
router.get(
  '/mine',
  authenticate,
  requireRole('ORGANIZER', 'ADMIN'),
  validateQuery(managedEventsQuerySchema),
  EventsController.listManagedEvents
);

// List events (Public discovery)
router.get(
  '/',
  validateQuery(listEventsQuerySchema),
  EventsController.listEvents
);

// Get single event by UUID or slug
router.get(
  '/:id',
  validateParams(eventIdParamSchema),
  EventsController.getEventById
);

// Update event
router.patch(
  '/:id',
  authenticate,
  requireRole('ORGANIZER', 'ADMIN'),
  validateParams(eventIdParamSchema),
  validateBody(updateEventSchema),
  EventsController.updateEvent
);

router.put(
  '/:id',
  authenticate,
  requireRole('ORGANIZER', 'ADMIN'),
  validateParams(eventIdParamSchema),
  validateBody(updateEventSchema),
  EventsController.updateEvent
);

// Cancel / delete event
router.delete(
  '/:id',
  authenticate,
  requireRole('ORGANIZER', 'ADMIN'),
  validateParams(eventIdParamSchema),
  EventsController.deleteEvent
);

export default router;
