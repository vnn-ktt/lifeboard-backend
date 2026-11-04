import { Module } from '@nestjs/common';
import { UserWriteLock } from './user-write-lock.service';

@Module({ providers: [UserWriteLock], exports: [UserWriteLock] })
export class UserWriteLockModule {}
