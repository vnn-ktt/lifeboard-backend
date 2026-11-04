import type { PublicUser } from '@/users/dto/public-user.dto';
export interface AuthResult { user: PublicUser; token: string }
