import express from 'express';
import Trade from '../models/Trade.js';
import Order from '../models/Order.js';
import { validateTradesQuery, handleValidationErrors } from '../middleware/validation.js';

const router = express.Router();

/**
 * GET /trades - Get recent trades
 */
router.get(
  '/',
  validateTradesQuery,
  handleValidationErrors,
  async (req, res) => {
    try {
      const limit = parseInt(req.query.limit || '50');
      const trades = await Trade.find()
        .sort({ timestamp: -1 })
        .limit(limit)
        .lean();

      // Populate buyer and seller client_ids
      const enrichedTrades = await Promise.all(
        trades.map(async (trade) => {
          const [buyOrder, sellOrder] = await Promise.all([
            Order.findOne({ order_id: trade.buy_order_id }).select('client_id').lean(),
            Order.findOne({ order_id: trade.sell_order_id }).select('client_id').lean(),
          ]);

          return {
            ...trade,
            buyer_id: buyOrder?.client_id || 'Unknown',
            seller_id: sellOrder?.client_id || 'Unknown',
          };
        })
      );

      res.json(enrichedTrades);
    } catch (error) {
      res.status(500).json({
        error: 'Failed to fetch trades',
        message: error.message,
      });
    }
  }
);

export default router;
