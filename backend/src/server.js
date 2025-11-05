import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import http from 'http';
import connectDB from './config/database.js';
import MatchingEngine from './services/matchingEngine.js';
import OrderService from './services/orderService.js';
import Broadcaster from './services/broadcaster.js';
import ordersRouter, { setOrderService } from './routes/orders.js';
import orderbookRouter, { setMatchingEngine } from './routes/orderbook.js';
import tradesRouter from './routes/trades.js';
import adminRouter from './routes/admin.js';
import logger from './utils/logger.js';

const app = express();
const server = http.createServer(app);

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`, {
    ip: req.ip,
    user_agent: req.get('user-agent'),
  });
  next();
});

// Initialize services
const matchingEngine = new MatchingEngine('BTC-USD');
const broadcaster = new Broadcaster(server);
const orderService = new OrderService(matchingEngine, broadcaster);

// Connect matching engine to broadcaster
matchingEngine.onTrades = (trades) => broadcaster.broadcastTrades(trades);
matchingEngine.onOrderbookUpdate = (orderbook) => broadcaster.broadcastOrderbookDelta(orderbook);
matchingEngine.onOrderUpdate = (order) => broadcaster.broadcastOrderUpdate(order);

// Inject dependencies into routes
setOrderService(orderService);
setMatchingEngine(matchingEngine);

// Routes
app.use('/orders', ordersRouter);
app.use('/orderbook', orderbookRouter);
app.use('/trades', tradesRouter);
app.use('/', adminRouter);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'Exchange Matching Engine API',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      orders: '/orders',
      orderbook: '/orderbook',
      trades: '/trades',
      health: '/healthz',
      metrics: '/metrics',
      websocket: '/ws',
    },
  });
});

// Error handling
app.use((err, req, res, next) => {
  logger.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong',
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not found',
    message: 'The requested resource was not found',
  });
});

// Start server
const PORT = process.env.PORT || 3000;

const startServer = async () => {
  try {
    // Connect to database
    await connectDB();

    // Rebuild orderbook from database
    await matchingEngine.rebuildFromDB();

    // Start HTTP server
    server.listen(PORT, () => {
      logger.info(`🚀 Exchange backend running on port ${PORT}`);
      logger.info(`📊 Metrics available at http://localhost:${PORT}/metrics`);
      logger.info(`🔌 WebSocket available at ws://localhost:${PORT}/ws`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully...');
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully...');
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

startServer();

export { app, server };
