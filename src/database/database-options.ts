import type { DataSourceOptions } from 'typeorm';
import type { Environment } from '../config/environment';

export type DatabaseEnvironment = Pick<
  Environment,
  'DB_HOST' | 'DB_PORT' | 'DB_USER' | 'DB_PASSWORD' | 'DB_NAME' | 'DB_POOL_SIZE' | 'DB_SSL'
>;

/** Shared between Nest runtime and migration CLI. Never auto-sync schema. */
export function databaseOptions(config: DatabaseEnvironment): DataSourceOptions {
  return {
    type: 'postgres',
    host: config.DB_HOST,
    port: config.DB_PORT,
    username: config.DB_USER,
    password: config.DB_PASSWORD,
    database: config.DB_NAME,
    ssl: config.DB_SSL ? { rejectUnauthorized: true } : false,
    extra: { max: config.DB_POOL_SIZE, connectionTimeoutMillis: 5_000 },
    entities: [`${__dirname}/../**/*.entity.{ts,js}`],
    migrations: [`${__dirname}/migrations/*.{ts,js}`],
    migrationsTableName: 'typeorm_migrations',
    migrationsRun: false,
    synchronize: false,
    logging: ['error', 'warn'],
  };
}
