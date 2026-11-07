import type { User } from '@/users/entities/user.entity';

/** Explicit response DTO: never serialize entities containing credentials. */
export type PublicUser = {
  id: string;
  email: string;
  name: string;
  nickname: string;
  about: string;
  timezone: string;
  createdAt: string;
  updatedAt: string;
};

export function toPublicUser(user: User): PublicUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    nickname: user.nickname ?? '',
    about: user.about,
    timezone: user.timezone,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };
}
