import express from 'express';
import mongoose from 'mongoose';
import { register } from '../metrics/prometheus.js';
import logger from '../utils/logger.js';

const router = express.Router();

/**
 * GET /healthz - Health check
 */
router.get('/healthz', (req, res) => {
  const health = {
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
  };

  const statusCode = health.mongodb === 'connected' ? 200 : 503;
  res.status(statusCode).json(health);
});

/**
 * GET /metrics - Prometheus metrics
 */
router.get('/metrics', async (req, res) => {
  try {
    res.set('Content-Type', register.contentType);
    const metrics = await register.metrics();
    res.send(metrics);
  } catch (error) {
    logger.error('Error generating metrics:', error);
    res.status(500).send('Error generating metrics');
  }
});

export default router;
