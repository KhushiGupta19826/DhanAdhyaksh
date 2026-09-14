import app from './app';
import { config } from './utils/config';

const server = app.listen(config.port, () => {
  console.log(`========================================`);
  console.log(` Dhanadhyaksh Backend API`);
  console.log(` Running on: http://localhost:${config.port}`);
  console.log(` Health check: http://localhost:${config.port}/api/health`);
  console.log(` Database check: http://localhost:${config.port}/api/health/db`);
  console.log(` Environment: ${config.nodeEnv}`);
  console.log(`========================================`);
});

// Handle graceful termination
function handleShutdown(signal: string): void {
  console.log(`Received ${signal}, closing server gracefully...`);
  server.close(() => {
    console.log('Server closed. Process exiting.');
    process.exit(0);
  });
}

process.on('SIGINT', () => handleShutdown('SIGINT'));
process.on('SIGTERM', () => handleShutdown('SIGTERM'));

export default server;
