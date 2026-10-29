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
  uploadFlyerSchema,
  reorderFlyersSchema,
  listAttendeesQuerySchema,
} from './events.schemas';
import { checkInTicketSchema } from '../tickets/tickets.schemas';

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

// Upload standalone flyer (before event creation)
router.post(
  '/upload-flyer',
  authenticate,
  requireRole('ORGANIZER', 'ADMIN'),
  validateBody(uploadFlyerSchema),
  EventsController.uploadStandaloneFlyer
);

// Get event flyers
router.get(
  '/:id/flyers',
  validateParams(eventIdParamSchema),
  EventsController.getEventFlyers
);

// Upload & attach flyer to existing event
router.post(
  '/:id/flyers',
  authenticate,
  requireRole('ORGANIZER', 'ADMIN'),
  validateParams(eventIdParamSchema),
  validateBody(uploadFlyerSchema),
  EventsController.uploadEventFlyer
);

// Reorder flyers for an event
router.put(
  '/:id/flyers/reorder',
  authenticate,
  requireRole('ORGANIZER', 'ADMIN'),
  validateParams(eventIdParamSchema),
  validateBody(reorderFlyersSchema),
  EventsController.reorderFlyers
);

// Delete flyer from an event
router.delete(
  '/:id/flyers/:flyerId',
  authenticate,
  requireRole('ORGANIZER', 'ADMIN'),
  EventsController.deleteFlyer
);

// Cancel / delete event
router.delete(
  '/:id',
  authenticate,
  requireRole('ORGANIZER', 'ADMIN'),
  validateParams(eventIdParamSchema),
  EventsController.deleteEvent
);

// Gate Admission & Ticket Check-In
router.post(
  '/:id/check-in',
  authenticate,
  requireRole('ORGANIZER', 'ADMIN'),
  validateParams(eventIdParamSchema),
  validateBody(checkInTicketSchema),
  EventsController.checkInTicket
);

// Gate Attendance Stats & History
router.get(
  '/:id/check-in/stats',
  authenticate,
  requireRole('ORGANIZER', 'ADMIN'),
  validateParams(eventIdParamSchema),
  EventsController.getCheckInStats
);

// Attendee & Registration List for Organizers & Administrators
router.get(
  '/:id/attendees',
  authenticate,
  requireRole('ORGANIZER', 'ADMIN'),
  validateParams(eventIdParamSchema),
  validateQuery(listAttendeesQuerySchema),
  EventsController.getEventAttendees
);

export default router;
