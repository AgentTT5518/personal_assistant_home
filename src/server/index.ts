import 'dotenv/config';
import { app } from './app.js';
import { createLogger } from './lib/logger.js';

const log = createLogger('server');

const PORT = parseInt(process.env.PORT || '3001', 10);
const HOST = '127.0.0.1';

app.listen(PORT, HOST, () => {
  log.info(`Server running at http://${HOST}:${PORT}`);
});
