import type { Request } from 'express';
import type { PublicUser } from '@/users/dto/public-user.dto';

export interface AuthenticatedRequest extends Request {
  auth: { user: PublicUser; sessionId: string };
}
