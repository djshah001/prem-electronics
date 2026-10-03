import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import { env } from '../../config/env.js';
import * as schema from './schema/index.js';

const { Pool } = pg;

export const pool = new Pool({
  connectionString: env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

export const db = drizzle(pool, { schema });

export type DB = typeof db;
