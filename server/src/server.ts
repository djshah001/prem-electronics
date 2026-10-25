import './config/env.js'; // Validates environment variables — exits on failure
import app from './app.js';
import { pool } from './infrastructure/database/db.js';
import logger from './core/logger/logger.js';
import { env } from './config/env.js';
import { paymentsService } from './modules/payments/payments.service.js';
import { ordersRepository } from './modules/orders/orders.repository.js';
import { emailMasterService } from './modules/communications/email.service.js';
import { campaignService } from './modules/communications/campaign.service.js';
import { messageService } from './modules/communications/message.service.js';

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

  // Retry durable post-commit email jobs without affecting successful payments.
  void paymentsService.processEmailOutbox().catch((error) => {
    logger.error('Initial email outbox processing failed.', error);
  });
  const maintenanceTimer = setInterval(() => {
    void paymentsService.processEmailOutbox().catch((error) => {
      logger.error('Email outbox processing failed.', error);
    });
    void ordersRepository.releaseExpiredReservations().catch((error) => {
      logger.error('Expired inventory reservation cleanup failed.', error);
    });
    void campaignService.processScheduled().catch((error) => logger.error('Scheduled campaign processing failed.', error));
    void emailMasterService.processQueue().catch((error) => logger.error('Email delivery queue processing failed.', error));
    void messageService.processQueue().catch((error) => logger.error('Mobile message delivery queue processing failed.', error));
  }, 60_000);
  maintenanceTimer.unref();

  // Graceful shutdown
  const gracefulShutdown = async (signal: string) => {
    logger.warn(`⚠️ Received ${signal}. Initiating graceful shutdown...`);
    clearInterval(maintenanceTimer);
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
