import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { User } from '@/users/entities/user.entity';

@Entity({ name: 'user_sessions' })
@Index('uq_sessions_token_hash', ['tokenHash'], { unique: true })
@Index('ix_sessions_user_id', ['userId'])
@Index('ix_sessions_expires_at', ['expiresAt'])
export class UserSession {
  @PrimaryColumn({ type: 'uuid' })
  id!: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id', foreignKeyConstraintName: 'fk_sessions_user' })
  user!: User;

  /** SHA-256 digest, never the raw cookie. */
  @Column({ name: 'token_hash', type: 'char', length: 64 })
  tokenHash!: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @Column({ name: 'expires_at', type: 'timestamptz' })
  expiresAt!: Date;

  @Column({ name: 'revoked_at', type: 'timestamptz', nullable: true })
  revokedAt!: Date | null;
}
