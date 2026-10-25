import { Router } from 'express';
import { authenticate } from '../auth/auth.middleware';
import { PaymentsController } from './payments.controller';

const router = Router();

// Public / safe config
router.get('/config', PaymentsController.getConfig);

// Webhook endpoint (must accept raw body or parsed JSON with signature)
router.post('/webhook', PaymentsController.handleWebhook);

// Payment verification (called after Paystack redirects back with ?reference=...)
router.get('/verify/:reference', PaymentsController.verifyPayment);

// Payment initialization
router.post('/initialize/:orderId', authenticate, PaymentsController.initializePayment);
router.post('/initialize', authenticate, PaymentsController.initializePayment);

export default router;
