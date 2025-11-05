import { body, param, query, validationResult } from 'express-validator';

export const validateOrder = [
  body('idempotency_key').optional().isString().trim().notEmpty(),
  body('order_id').optional().isUUID(),
  body('client_id').isString().trim().notEmpty().withMessage('client_id is required'),
  body('instrument').optional().isString().equals('BTC-USD'),
  body('side').isIn(['buy', 'sell']).withMessage('side must be buy or sell'),
  body('type').isIn(['limit', 'market']).withMessage('type must be limit or market'),
  body('price')
    .if(body('type').equals('limit'))
    .isFloat({ gt: 0 })
    .withMessage('price must be positive for limit orders'),
  body('quantity').isFloat({ gt: 0 }).withMessage('quantity must be positive'),
];

export const validateOrderId = [
  param('order_id').isString().trim().notEmpty().withMessage('order_id is required'),
];

export const validateOrderbookQuery = [
  query('instrument').optional().isString().equals('BTC-USD'),
  query('levels').optional().isInt({ min: 1, max: 100 }).withMessage('levels must be between 1 and 100'),
];

export const validateTradesQuery = [
  query('limit').optional().isInt({ min: 1, max: 1000 }).withMessage('limit must be between 1 and 1000'),
];

export const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors.array(),
    });
  }
  next();
};
