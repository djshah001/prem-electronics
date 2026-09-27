import './config/env.js'; // Validates environment variables — exits on failure
import app from './app';
import { pool } from './infrastructure/database/db';
import logger from './core/logger/logger';
import { env } from './config/env';

const startServer = async () => {
  // Test database connectivity
  try {
    const client = await pool.connect();
    client.release();
    logger.success('✅ PostgreSQL connected successfully.');
  } catch (err) {
    logger.error('❌ Failed to connect to PostgreSQL. Is your DATABASE_URL correct?', err);
    process.exit(1);
  }

  const server = app.listen(env.PORT, () => {
    logger.info(`🚀 Prem Electronics API running on http://localhost:${env.PORT}`);
    logger.info(`📡 Environment: ${env.NODE_ENV}`);
    logger.info(`🔗 CORS allowed from: ${env.CLIENT_URL}`);
  });

  // Graceful shutdown
  const gracefulShutdown = async (signal: string) => {
    logger.warn(`⚠️ Received ${signal}. Initiating graceful shutdown...`);
    server.close(async () => {
      await pool.end();
      logger.info('💤 Server and DB pool closed. Goodbye!');
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  process.on('unhandledRejection', (reason) => {
    logger.error('Unhandled Promise Rejection:', reason);
  });

  process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception:', error);
    process.exit(1);
  });
};

startServer();
