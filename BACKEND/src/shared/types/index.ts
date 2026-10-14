import { Request } from 'express';

export type UserRole = 'ATTENDEE' | 'ORGANIZER' | 'ADMIN';

export interface TokenPayload {
  userId: string;
  email: string;
  role: UserRole;
}

export interface AuthenticatedRequest extends Request {
  user?: TokenPayload;
}
