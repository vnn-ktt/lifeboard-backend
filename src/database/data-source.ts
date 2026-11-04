import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { validateEnvironment } from '@/config/environment';
import { databaseOptions } from '@/database/database-options';

/** TypeORM CLI runs outside Nest DI; environment is supplied by Node or Docker. */
const environment = validateEnvironment(process.env);
export default new DataSource(databaseOptions(environment));
