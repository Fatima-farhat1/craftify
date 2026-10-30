import dotenv from 'dotenv';
import path from 'path';
dotenv.config();

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

export const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT) || 3000,
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:4200',
  uploadDir: path.resolve(process.env.UPLOAD_DIR || 'uploads'),
  auctionPollMs: Number(process.env.AUCTION_POLL_MS) || 15000,
  db: {
    host: required('DB_HOST'),
    port: Number(process.env.DB_PORT) || 3306,
    user: required('DB_USER'),
    password: process.env.DB_PASSWORD ?? '',
    database: required('DB_NAME'),
    // SSL configuration for Aiven
    ssl: process.env.DB_SSL === 'true',
    sslCaPath: process.env.DB_SSL_CA_PATH || '',
  },
  jwt: {
    secret: required('JWT_SECRET'),
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },
};
