import express from 'express';
import { validateOrderbookQuery, handleValidationErrors } from '../middleware/validation.js';

const router = express.Router();

let matchingEngine; // Will be injected

export const setMatchingEngine = (engine) => {
  matchingEngine = engine;
};

/**
 * GET /orderbook - Get current orderbook
 */
router.get(
  '/',
  validateOrderbookQuery,
  handleValidationErrors,
  async (req, res) => {
    try {
      const levels = parseInt(req.query.levels || '20');
      const orderbook = matchingEngine.getOrderbook(levels);
      res.json(orderbook);
    } catch (error) {
      res.status(500).json({
        error: 'Failed to fetch orderbook',
        message: error.message,
      });
    }
  }
);

export default router;
