import type { Request } from 'express';
import type { PublicUser } from '../users/public-user';

export interface AuthenticatedRequest extends Request {
  auth: { user: PublicUser; sessionId: string };
}
