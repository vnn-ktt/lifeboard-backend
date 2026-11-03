export type NodeEnvironment = 'development' | 'test' | 'production';

export type Environment = {
  NODE_ENV: NodeEnvironment;
  PORT: number;
  DB_HOST: string;
  DB_PORT: number;
  DB_USER: string;
  DB_PASSWORD: string;
  DB_NAME: string;
  DB_POOL_SIZE: number;
  DB_SSL: boolean;
};

/** One validation routine for NestJS startup and standalone TypeORM CLI. */
export function validateEnvironment(raw: Record<string, unknown>): Environment {
  function stringValue(key: string, fallback?: string): string {
    const value = raw[key] ?? fallback;
    if (typeof value !== 'string' || value.trim().length === 0) {
      throw new Error(`Missing or empty environment variable: ${key}`);
    }
    return value;
  }

  function integerValue(key: string, fallback: number, min: number, max: number): number {
    const input = raw[key] ?? fallback;
    if (typeof input === 'string' && input.trim() === '') {
      throw new Error(`Invalid integer environment variable: ${key}`);
    }
    const value = typeof input === 'number' ? input : Number(input);
    if (!Number.isSafeInteger(value) || value < min || value > max) {
      throw new Error(`Invalid integer environment variable: ${key}`);
    }
    return value;
  }

  function booleanValue(key: string, fallback: boolean): boolean {
    const value = raw[key];
    if (value === undefined) return fallback;
    if (value === true || value === 'true') return true;
    if (value === false || value === 'false') return false;
    throw new Error(`Invalid boolean environment variable: ${key} (expected true or false)`);
  }

  const nodeEnv = stringValue('NODE_ENV', 'development');
  if (nodeEnv !== 'development' && nodeEnv !== 'test' && nodeEnv !== 'production') {
    throw new Error('NODE_ENV must be development, test, or production');
  }

  return {
    NODE_ENV: nodeEnv,
    PORT: integerValue('PORT', 3000, 1, 65535),
    DB_HOST: stringValue('DB_HOST'),
    DB_PORT: integerValue('DB_PORT', 5432, 1, 65535),
    DB_USER: stringValue('DB_USER'),
    DB_PASSWORD: stringValue('DB_PASSWORD'),
    DB_NAME: stringValue('DB_NAME'),
    DB_POOL_SIZE: integerValue('DB_POOL_SIZE', 10, 1, 100),
    DB_SSL: booleanValue('DB_SSL', false),
  };
}
