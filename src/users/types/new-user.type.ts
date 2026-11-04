export interface NewUser {
  email: string;
  name: string;
  nickname: string | null;
  passwordHash: string;
}
