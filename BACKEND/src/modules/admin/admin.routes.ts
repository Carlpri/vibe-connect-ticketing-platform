import { Router } from 'express';
import { authenticate, requireRole } from '../auth/auth.middleware';
import { AdminController } from './admin.controller';

const router = Router();

// All admin routes require authentication and ADMIN role
router.use(authenticate, requireRole('ADMIN'));

router.get('/config', AdminController.getPlatformConfig);
router.put('/config', AdminController.updatePlatformConfig);
router.patch('/config', AdminController.updatePlatformConfig);
router.get('/users', AdminController.listUsers);

export default router;
