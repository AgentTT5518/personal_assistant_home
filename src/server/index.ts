import 'dotenv/config';
import { app } from './app.js';
import { startCleanupService } from './features/document-processor/index.js';
import { sqlite } from './lib/db/index.js';
import { createLogger } from './lib/logger.js';

const log = createLogger('server');

const PORT = parseInt(process.env.PORT || '3001', 10);
const HOST = process.env.HOST || '127.0.0.1';

const server = app.listen(PORT, HOST, () => {
  log.info(`Server running at http://${HOST}:${PORT}`);
  startCleanupService();
});

function shutdown(signal: string) {
  log.info(`${signal} received, shutting down gracefully`);
  server.close(() => {
    sqlite.close();
    log.info('Server stopped');
    process.exit(0);
  });
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
