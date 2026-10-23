import { Router } from 'express';
import { OrdersController } from './orders.controller';

const router = Router();

router.post('/mpesa/callback', OrdersController.mpesaCallback);

export default router;
