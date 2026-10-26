import app from './app';
import { checkDbConnection, pool } from './config/db';
import { env } from './config/env';
import { startAuctionScheduler, stopAuctionScheduler } from './services/auction.scheduler';

async function main() {
  await checkDbConnection();
  console.log('MySQL connected.');
  const server = app.listen(env.port, () => console.log(`Craftify API running on http://localhost:${env.port}/api`));
  startAuctionScheduler();

  const shutdown = () => {
    stopAuctionScheduler();
    server.close(() => pool.end().finally(() => process.exit(0)));
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch(err => {
  console.error('Failed to start server:', err.message);
  process.exit(1);
});
