import type { MigrationInterface, QueryRunner } from 'typeorm';

/** Baseline migration: establishes the migration ledger without domain tables. */
export class InitialInfrastructure1793760000000 implements MigrationInterface {
  name = 'InitialInfrastructure1793760000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('SELECT 1');
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {
    // No schema changes to revert in the infrastructure baseline.
  }
}
