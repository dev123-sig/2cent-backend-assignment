import express from 'express';
import { validateOrder, validateOrderId, handleValidationErrors } from '../middleware/validation.js';
import { rateLimiterMiddleware } from '../middleware/rateLimiter.js';
import logger from '../utils/logger.js';
import { orderLatency } from '../metrics/prometheus.js';

const router = express.Router();

let orderService; // Will be injected

export const setOrderService = (service) => {
  orderService = service;
};

/**
 * POST /orders - Submit new order
 */
router.post(
  '/',
  rateLimiterMiddleware,
  validateOrder,
  handleValidationErrors,
  async (req, res) => {
    const startTime = Date.now();

    try {
      const { idempotency_key, ...orderData } = req.body;
      const result = await orderService.submitOrder(orderData, idempotency_key);

      const duration = (Date.now() - startTime) / 1000;
      orderLatency.observe(duration);

      res.status(202).json(result);
    } catch (error) {
      logger.error('Error submitting order:', error);
      if (error.code === 'IDEMPOTENCY_CONFLICT') {
        return res.status(409).json({
          error: 'Idempotency key conflict',
          message: error.message,
          hint: 'Generate a new unique idempotency_key for a new order or omit it to auto-generate.'
        });
      }
      res.status(400).json({
        error: 'Order submission failed',
        message: error.message,
      });
    }
  }
);

/**
 * GET /orders/:order_id - Get order details
 */
router.get(
  '/:order_id',
  validateOrderId,
  handleValidationErrors,
  async (req, res) => {
    try {
      const order = await orderService.getOrder(req.params.order_id);
      res.json(order);
    } catch (error) {
      logger.error('Error fetching order:', error);
      res.status(404).json({
        error: 'Order not found',
        message: error.message,
      });
    }
  }
);

/**
 * POST /orders/:order_id/cancel - Cancel order
 */
router.post(
  '/:order_id/cancel',
  validateOrderId,
  handleValidationErrors,
  async (req, res) => {
    try {
      const result = await orderService.cancelOrder(req.params.order_id);
      res.json(result);
    } catch (error) {
      logger.error('Error cancelling order:', error);
      res.status(400).json({
        error: 'Order cancellation failed',
        message: error.message,
      });
    }
  }
);

export default router;
