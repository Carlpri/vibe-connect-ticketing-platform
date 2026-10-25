import { Router } from 'express';
import { authenticate, requireRole } from '../auth/auth.middleware';
import { AnalyticsController } from './analytics.controller';

const router = Router();

// Organizer Dashboard Overview metrics
router.get(
  '/organizer',
  authenticate,
  requireRole('ORGANIZER', 'ADMIN'),
  AnalyticsController.getOrganizerDashboard
);

// Specific Event Analytics
router.get(
  '/events/:eventId',
  authenticate,
  requireRole('ORGANIZER', 'ADMIN'),
  AnalyticsController.getEventAnalytics
);

// Admin Platform Dashboard Overview
router.get(
  '/admin',
  authenticate,
  requireRole('ADMIN'),
  AnalyticsController.getAdminDashboard
);

export default router;
