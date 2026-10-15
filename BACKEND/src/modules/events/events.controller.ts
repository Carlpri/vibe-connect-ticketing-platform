import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { EventsService } from './events.service';
import { sendSuccess } from '../../shared/utils/apiResponse';
import { AuthenticatedRequest, TokenPayload } from '../../shared/types';
import { env } from '../../config/env';

/**
 * Extracts authenticated user if token is present, but doesn't block unauthenticated callers.
 */
function tryExtractUser(req: AuthenticatedRequest): TokenPayload | undefined {
  if (req.user) return req.user;
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      const token = authHeader.split(' ')[1];
      const decoded = jwt.verify(token, env.JWT_SECRET) as TokenPayload;
      req.user = decoded;
      return decoded;
    } catch {
      return undefined;
    }
  }
  return undefined;
}

export class EventsController {
  /**
   * POST /api/events
   * Requires: authenticate + requireRole(ORGANIZER, ADMIN)
   */
  static async createEvent(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const organizerId = req.user!.userId;
      const event = await EventsService.createEvent(organizerId, req.body);
      sendSuccess(res, event, 'Event created successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/events
   * Public: Lists published events by default.
   */
  static async listEvents(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = tryExtractUser(req);
      const result = await EventsService.listEvents(req.query as any, user);
      
      res.setHeader('X-Total-Count', result.pagination.total.toString());
      res.setHeader('X-Page', result.pagination.page.toString());
      res.setHeader('X-Limit', result.pagination.limit.toString());
      res.setHeader('X-Total-Pages', result.pagination.totalPages.toString());

      sendSuccess(res, result.events, 'Events retrieved successfully', 200);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/events/:id
   * Public for published events, protected for drafts.
   */
  static async getEventById(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = tryExtractUser(req);
      const identifier = req.params.id as string;
      const event = await EventsService.getEventByIdOrSlug(identifier, user);
      sendSuccess(res, event, 'Event details retrieved successfully', 200);
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /api/events/:id or PUT /api/events/:id
   * Requires: authenticate + event owner or ADMIN
   */
  static async updateEvent(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id as string;
      const updated = await EventsService.updateEvent(id, req.user!, req.body);
      sendSuccess(res, updated, 'Event updated successfully', 200);
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/events/:id
   * Requires: authenticate + event owner or ADMIN
   */
  static async deleteEvent(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id as string;
      const result = await EventsService.deleteOrCancelEvent(id, req.user!);
      sendSuccess(res, result.event, result.message, 200);
    } catch (error) {
      next(error);
    }
  }
}
