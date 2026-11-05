import { isString, isBoolean, isSafeInteger } from '@/utils/type-guards';

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
  WEB_ORIGIN: string;
  COOKIE_SECURE: boolean;
  S3_ENDPOINT: string;
  S3_REGION: string;
  S3_BUCKET: string;
  S3_ACCESS_KEY_ID: string;
  S3_SECRET_ACCESS_KEY: string;
  S3_FORCE_PATH_STYLE: boolean;
};

/** One validation routine for NestJS startup and standalone TypeORM CLI. */
export function validateEnvironment(raw: Record<string, unknown>): Environment {
  function stringValue(key: string, fallback?: string): string {
    const value = raw[key] ?? fallback;
    if (!isString(value) || value.trim().length === 0) {
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
    if (!isSafeInteger(value) || value < min || value > max) {
      throw new Error(`Invalid integer environment variable: ${key}`);
    }
    return value;
  }

  function booleanValue(key: string, fallback: boolean): boolean {
    const value = raw[key];
    if (value === undefined) return fallback;
    if (isBoolean(value)) return value;
    if (value === 'true') return true;
    if (value === false || value === 'false') return false;
    throw new Error(`Invalid boolean environment variable: ${key} (expected true or false)`);
  }

  const nodeEnv = stringValue('NODE_ENV', 'development');
  if (nodeEnv !== 'development' && nodeEnv !== 'test' && nodeEnv !== 'production') {
    throw new Error('NODE_ENV must be development, test, or production');
  }

  function checkedOrigin(value: string): string {
    let url: URL;
    try { url = new URL(value); } catch { throw new Error('WEB_ORIGIN must be a valid URL origin'); }
    if (!['http:', 'https:'].includes(url.protocol) || url.origin !== value) {
      throw new Error('WEB_ORIGIN must be an exact http(s) origin without trailing slash/path');
    }
    return value;
  }

  const s3Endpoint = stringValue('S3_ENDPOINT', nodeEnv === 'production' ? undefined : 'http://127.0.0.1:8333');
  let s3Url: URL;
  try { s3Url = new URL(s3Endpoint); } catch { throw new Error('S3_ENDPOINT must be a valid URL'); }
  if (!['http:', 'https:'].includes(s3Url.protocol) || s3Url.username || s3Url.password ||
      s3Url.search || s3Url.hash || s3Url.pathname !== '/') {
    throw new Error('S3_ENDPOINT must be an http(s) origin without path, query or credentials');
  }
  if (nodeEnv === 'production' && s3Url.protocol !== 'https:') {
    throw new Error('Production S3_ENDPOINT must use HTTPS');
  }
  const s3Bucket = stringValue('S3_BUCKET', nodeEnv === 'production' ? undefined : 'lifeboard-dev');
  if (!/^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$/.test(s3Bucket)) {
    throw new Error('S3_BUCKET must be a DNS-style bucket name');
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
    WEB_ORIGIN: checkedOrigin(stringValue('WEB_ORIGIN', 'http://localhost:8080')),
    COOKIE_SECURE: booleanValue('COOKIE_SECURE', nodeEnv === 'production'),
    S3_ENDPOINT: s3Endpoint,
    S3_REGION: stringValue('S3_REGION', 'ru-central1'),
    S3_BUCKET: s3Bucket,
    S3_ACCESS_KEY_ID: stringValue('S3_ACCESS_KEY_ID', nodeEnv === 'production' ? undefined : 'lifeboard-dev'),
    S3_SECRET_ACCESS_KEY: stringValue('S3_SECRET_ACCESS_KEY', nodeEnv === 'production' ? undefined : 'lifeboard-local-secret'),
    S3_FORCE_PATH_STYLE: booleanValue('S3_FORCE_PATH_STYLE', true),
  };
}
