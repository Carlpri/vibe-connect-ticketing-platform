import { Router } from 'express';
import { authenticate, requireRole } from '../auth/auth.middleware';
import { validateBody } from '../../shared/middleware/validate';
import { TicketsController } from './tickets.controller';
import { scanTicketSchema } from './tickets.schemas';

const router = Router();

router.get('/my', authenticate, TicketsController.getMyTickets);

// Retrieve tickets for a specific paid order (caller must own the order)
router.get('/order/:orderId', authenticate, TicketsController.getTicketsForOrder);

router.post(
  '/scan',
  authenticate,
  requireRole('ORGANIZER', 'ADMIN'),
  validateBody(scanTicketSchema),
  TicketsController.scanTicket
);

export default router;

