import { Router } from 'express';
import { authenticate, requireRole } from '../auth/auth.middleware';
import { OrdersController } from './orders.controller';

const router = Router();

router.post('/mpesa/callback', OrdersController.mpesaCallback);
router.post(
  '/mpesa/sandbox/diagnostics',
  authenticate,
  requireRole('ADMIN'),
  OrdersController.verifyMpesaSandbox
);

export default router;
