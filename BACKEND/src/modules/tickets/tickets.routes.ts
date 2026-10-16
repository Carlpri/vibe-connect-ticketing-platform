import { Router } from 'express';
import { authenticate, requireRole } from '../auth/auth.middleware';
import { validateBody } from '../../shared/middleware/validate';
import { TicketsController } from './tickets.controller';
import { scanTicketSchema } from './tickets.schemas';

const router = Router();

router.get('/my', authenticate, TicketsController.getMyTickets);

router.post(
  '/scan',
  authenticate,
  requireRole('ORGANIZER', 'ADMIN'),
  validateBody(scanTicketSchema),
  TicketsController.scanTicket
);

export default router;
