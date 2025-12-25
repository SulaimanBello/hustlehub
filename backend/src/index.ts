import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import app from './app';
import config from './config';
import { testConnection, closePool } from './config/database';
import { initializeSocketService } from './services/socket.service';

// Create HTTP server
const server = http.createServer(app);

// Initialize Socket.IO
const io = new SocketIOServer(server, {
  cors: {
    origin: config.cors.origin,
    credentials: true,
  },
});

// Initialize Socket.IO service (chat, real-time updates)
initializeSocketService(io);

// Attach io to app for access in routes
app.set('io', io);

// Start server
async function startServer() {
  try {
    // Test database connection
    const dbConnected = await testConnection();
    if (!dbConnected) {
      throw new Error('Database connection failed');
    }

    // Start listening
    server.listen(config.port, () => {
      console.log('🚀 Server started successfully');
      console.log(`📍 Environment: ${config.env}`);
      console.log(`🌐 API URL: http://localhost:${config.port}/api/${config.apiVersion}`);
      console.log(`💰 Platform fee: ${config.business.platformFeePercent}%`);
      console.log(`📡 Socket.IO ready`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
async function gracefulShutdown(signal: string) {
  console.log(`\n${signal} received, shutting down gracefully...`);

  server.close(async () => {
    console.log('🛑 HTTP server closed');

    // Close database pool
    await closePool();

    // Close Socket.IO connections
    io.close(() => {
      console.log('🔌 Socket.IO closed');
      process.exit(0);
    });
  });

  // Force exit after 10 seconds
  setTimeout(() => {
    console.error('⚠️ Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
}

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Start the server
startServer();

export { io };
