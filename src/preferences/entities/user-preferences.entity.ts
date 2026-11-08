import { Column, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

export type Theme = 'default' | 'dark' | 'orange';
export type Language = 'ru' | 'en' | 'de';
export type GoalEntryMode = 'wizard' | 'quick';

@Entity({ name: 'user_preferences' })
export class UserPreferences {
  @PrimaryColumn({ name: 'user_id', type: 'uuid' }) userId!: string;
  @Column({ type: 'varchar', length: 10, default: 'default' }) theme!: Theme;
  @Column({ type: 'varchar', length: 2, default: 'ru' }) language!: Language;
  @Column({ name: 'goal_entry_mode', type: 'varchar', length: 8, default: 'wizard' }) goalEntryMode!: GoalEntryMode;
  @Column({ name: 'show_helper', type: 'boolean', default: true }) showHelper!: boolean;
  @Column({ name: 'show_avatar', type: 'boolean', default: true }) showAvatar!: boolean;
  @Column({ name: 'mask_stats', type: 'boolean', default: false }) maskStats!: boolean;
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' }) updatedAt!: Date;
}
