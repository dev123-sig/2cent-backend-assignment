import rateLimit from 'express-rate-limit';
import logger from '../utils/logger.js';

// Rate limiter per client_id (simple in-memory implementation)
const clientLimiters = new Map();

export const rateLimiterMiddleware = (req, res, next) => {
  const client_id = req.body?.client_id || req.headers['x-client-id'] || 'anonymous';
  
  const windowMs = parseInt(process.env.RATE_LIMIT_WINDOW_MS || '1000');
  const maxRequests = parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100');

  if (!clientLimiters.has(client_id)) {
    const limiter = rateLimit({
      windowMs,
      max: maxRequests,
      message: {
        error: 'Too many requests',
        message: `Rate limit exceeded. Max ${maxRequests} requests per ${windowMs}ms`,
      },
      standardHeaders: true,
      legacyHeaders: false,
      handler: (req, res) => {
        logger.warn('Rate limit exceeded', { client_id, ip: req.ip });
        res.status(429).json({
          error: 'Too many requests',
          message: `Rate limit exceeded. Max ${maxRequests} requests per ${windowMs}ms`,
        });
      },
      keyGenerator: () => client_id,
    });

    clientLimiters.set(client_id, limiter);
  }

  const limiter = clientLimiters.get(client_id);
  limiter(req, res, next);
};

// Clean up old limiters periodically
setInterval(() => {
  if (clientLimiters.size > 10000) {
    logger.info('Cleaning up rate limiters', { count: clientLimiters.size });
    clientLimiters.clear();
  }
}, 60000); // Every minute
