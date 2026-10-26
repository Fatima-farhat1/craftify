import mysql, { PoolConnection } from 'mysql2/promise';
import { env } from './env';

export const pool = mysql.createPool({
  host: env.db.host,
  port: env.db.port,
  user: env.db.user,
  password: env.db.password,
  database: env.db.database,
  waitForConnections: true,
  connectionLimit: 10,
  decimalNumbers: true, // return DECIMAL as numbers, not strings
  timezone: 'Z',        // JS <-> MySQL dates as UTC
});

// Make NOW() / CURRENT_TIMESTAMP UTC too, so DB time comparisons match stored values.
pool.on('connection', conn => { conn.query("SET time_zone = '+00:00'"); });

export async function checkDbConnection(): Promise<void> {
  const conn = await pool.getConnection();
  await conn.ping();
  conn.release();
}

/** Runs fn inside a transaction: commit on success, rollback on any error. */
export async function withTransaction<T>(fn: (conn: PoolConnection) => Promise<T>): Promise<T> {
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
