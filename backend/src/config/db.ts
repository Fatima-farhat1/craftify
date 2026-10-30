
import mysql, { PoolConnection } from 'mysql2/promise';
import { env } from './env';
import fs from 'fs';

export const pool = mysql.createPool({
  host: env.db.host,
  port: env.db.port,
  user: env.db.user,
  password: env.db.password,
  database: env.db.database,

  // SSL connection for Aiven MySQL
  ...(env.db.ssl
    ? {
        ssl: {
          ca: fs.readFileSync(env.db.sslCaPath, 'utf8'),
          rejectUnauthorized: true,
        },
      }
    : {}),

  waitForConnections: true,
  connectionLimit: 10,
  decimalNumbers: true,
  timezone: 'Z',
});

// Set database session timezone to UTC
pool.on('connection', conn => {
  conn.query("SET time_zone = '+00:00'");
});

export async function checkDbConnection(): Promise<void> {
  const conn = await pool.getConnection();
  try {
    await conn.ping();
  } finally {
    conn.release();
  }
}

/** Runs fn inside a transaction. */
export async function withTransaction<T>(
  fn: (conn: PoolConnection) => Promise<T>
): Promise<T> {
  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();
    const result = await fn(conn);
    await conn.commit();
    return result;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}
