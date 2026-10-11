import { Router } from 'express';
import { AuthController } from './auth.controller';
import { registerSchema, loginSchema } from './auth.schemas';
import { validateBody } from '../../shared/middleware/validate';
import { authenticate } from './auth.middleware';

const router = Router();

// Public routes
router.post('/register', validateBody(registerSchema), AuthController.register);
router.post('/login', validateBody(loginSchema), AuthController.login);

// Protected routes
router.get('/me', authenticate, AuthController.getMe);

export default router;
