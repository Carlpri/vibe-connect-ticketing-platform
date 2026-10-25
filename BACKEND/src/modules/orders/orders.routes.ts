import { Router } from 'express';
import { authenticate, requireAtLeastOneVerified, requireRole } from '../auth/auth.middleware';
import { validateBody, validateParams } from '../../shared/middleware/validate';
import { OrdersController } from './orders.controller';
import {
  createOrderSchema,
  orderIdParamSchema,
  initiatePaymentSchema,
  checkinTicketSchema,
} from './orders.schemas';

// ===========================================
// Orders Module — Routes (Freddy)
// ===========================================
// Domain: Orders, Payments, Digital Tickets, QR codes, Check-in
// Assigned Developer: Freddy
//
// Reserved Endpoints & Protection Rules:
// - POST /api/orders
//   PROTECTION: authenticate + requireAtLeastOneVerified
//   (Either email or phone verification is REQUIRED to create an order / purchase tickets)
// - GET  /api/orders/my               (get attendee orders - authenticate)
// - POST /api/orders/:id/pay          (Payment gateway checkout initialization)
// - POST /api/orders/:id/confirm-payment (disabled; client confirmation is never trusted)
// - POST /api/orders/checkin          (validate QR ticket code - authenticate)
// ===========================================

const router = Router();

// Create order (Reserved tickets for 15 minutes) — requires one verified contact method
router.post(
  '/',
  authenticate,
  requireAtLeastOneVerified,
  validateBody(createOrderSchema),
  OrdersController.createOrder
);

// Attendee order history
router.get('/my', authenticate, OrdersController.getMyOrders);

// Attendee order detail
router.get(
  '/:id',
  authenticate,
  validateParams(orderIdParamSchema),
  OrdersController.getOrderById
);

router.post(
  '/:id/pay',
  authenticate,
  validateParams(orderIdParamSchema),
  validateBody(initiatePaymentSchema),
  OrdersController.initiatePayment
);

router.post(
  '/:id/confirm-payment',
  authenticate,
  validateParams(orderIdParamSchema),
  OrdersController.confirmPayment
);

// Ticket Check-in Scanner
router.post(
  '/checkin',
  authenticate,
  requireRole('ORGANIZER', 'ADMIN'),
  validateBody(checkinTicketSchema),
  OrdersController.checkinTicket
);

export default router;
