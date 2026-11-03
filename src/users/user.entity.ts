import { Column, CreateDateColumn, Entity, Index, PrimaryColumn, UpdateDateColumn } from 'typeorm';

@Entity({ name: 'users' })
@Index('uq_users_email_lower', { synchronize: false })
export class User {
  @PrimaryColumn({ type: 'uuid' })
  id!: string;

  /** Email is always normalized to lower-case in the service. */
  @Column({ type: 'varchar', length: 254 })
  email!: string;

  @Column({ type: 'varchar', length: 60 })
  name!: string;

  @Column({ type: 'varchar', length: 24, nullable: true })
  nickname!: string | null;

  @Column({ type: 'varchar', length: 400, default: '' })
  about!: string;

  /** Never select password material by default. */
  @Column({ name: 'password_hash', type: 'varchar', length: 255, select: false })
  passwordHash!: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
