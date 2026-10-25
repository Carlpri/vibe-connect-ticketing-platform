import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { env } from './config/env';
import { errorHandler } from './shared/middleware/errorHandler';
import { sendSuccess, sendError } from './shared/utils/apiResponse';

// Module Routes
import authRoutes from './modules/auth/auth.routes';
import eventsRoutes from './modules/events/events.routes';
import ordersRoutes from './modules/orders/orders.routes';
import ticketsRoutes from './modules/tickets/tickets.routes';
import paymentsRoutes from './modules/payments/payments.routes';
import promoCodesRoutes from './modules/promo-codes/promo-codes.routes';
import analyticsRoutes from './modules/analytics/analytics.routes';
import adminRoutes from './modules/admin/admin.routes';

import path from 'path';

const app = express();

// Security and utility middleware
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(
  cors({
    origin: '*',                                          // Allow all origins
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-paystack-signature'],
    credentials: false,                                   // Must be false when origin is '*'
  })
);
// Preserve rawBody buffer for payment webhook signature validation
app.use(
  express.json({
    limit: '15mb',
    verify: (req: any, _res, buf) => {
      req.rawBody = buf;
    },
  })
);

// Serve uploaded event media statically
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// API Root & Health Check
app.get('/', (_req, res) => {
  sendSuccess(res, {
    name: 'VIBE-CONNECT API',
    description: 'Kenyan Event Discovery & Digital Ticketing Platform',
    version: '1.0.0',
    documentation: {
      auth: '/api/auth',
      events: '/api/events',
      orders: '/api/orders',
      tickets: '/api/tickets',
      payments: '/api/payments',
    },
  });
});


app.get('/api/health', (_req, res) => {
  sendSuccess(res, {
    status: 'healthy',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

// Register Modular Monolith Routes
app.use('/api/auth', authRoutes);
app.use('/api/events', eventsRoutes);
app.use('/api/orders', ordersRoutes);
app.use('/api/tickets', ticketsRoutes);
app.use('/api/payments', paymentsRoutes);
app.use('/api/promo-codes', promoCodesRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/admin', adminRoutes);

// 404 Route Handler
app.use((req, res) => {
  sendError(res, `Endpoint not found: ${req.method} ${req.originalUrl}`, 404);
});

// Global Error Handler
app.use(errorHandler);

// Start Server
if (process.env.NODE_ENV !== 'test') {
  app.listen(env.PORT, () => {
    console.log(`🚀 VIBE-CONNECT server running on http://localhost:${env.PORT}`);
    console.log(`📡 Environment: ${env.NODE_ENV}`);
    console.log(`🔗 Supabase connection configured: ${env.DATABASE_URL ? 'YES' : 'NO'}`);
  });
}

export default app;
