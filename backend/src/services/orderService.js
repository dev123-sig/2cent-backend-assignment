import { v4 as uuidv4 } from 'uuid';
import Order from '../models/Order.js';
import IdempotencyKey from '../models/IdempotencyKey.js';
import logger from '../utils/logger.js';
import { ordersReceivedTotal, ordersRejectedTotal } from '../metrics/prometheus.js';

class OrderService {
  constructor(matchingEngine, broadcaster = null) {
    this.matchingEngine = matchingEngine;
    this.broadcaster = broadcaster;
  }

  /**
   * Submit a new order
   */
  async submitOrder(orderData, idempotencyKey = null) {
    // Check idempotency
    if (idempotencyKey) {
      const existing = await this.checkIdempotency(idempotencyKey);
      if (existing) {
        // Explicitly block duplicate key reuse and guide the client
        const err = new Error(
          `Idempotency key already used for order ${existing.order_id}. Use a new unique key or omit the field to auto-generate.`
        );
        err.code = 'IDEMPOTENCY_CONFLICT';
        logger.warn('Idempotency key conflict', { idempotency_key: idempotencyKey, order_id: existing.order_id });
        throw err;
      }
    }

    // Validate order data
    this.validateOrder(orderData);

    // Generate order ID if not provided
    const order_id = orderData.order_id || uuidv4();

    // Create order object
    const order = {
      order_id,
      client_id: orderData.client_id,
      instrument: orderData.instrument || 'BTC-USD',
      side: orderData.side,
      type: orderData.type,
      price: orderData.price,
      quantity: orderData.quantity,
      filled_quantity: 0,
      status: 'pending',
      idempotency_key: idempotencyKey || undefined,
    };

    // Persist to database
    const savedOrder = await Order.create(order);

    // Record metrics
    ordersReceivedTotal.inc({
      type: order.type,
      side: order.side,
      instrument: order.instrument,
    });

    // Store idempotency key if provided
    if (idempotencyKey) {
      await this.storeIdempotencyKey(idempotencyKey, order_id, {
        order_id,
        status: 'pending',
        message: 'Order submitted successfully',
      });
    }

    // Submit to matching engine
    await this.matchingEngine.submitOrder(savedOrder.toObject());

    // Broadcast order update via WebSocket (include idempotency_key if provided)
    if (this.broadcaster) {
      this.broadcaster.broadcastOrderUpdate({
        order_id: savedOrder.order_id,
        client_id: savedOrder.client_id,
        side: savedOrder.side,
        type: savedOrder.type,
        price: savedOrder.price,
        quantity: savedOrder.quantity,
        filled_quantity: 0,
        status: 'open',
        idempotency_key: idempotencyKey || undefined,
      });
    }

    logger.info('Order submitted', {
      order_id,
      client_id: order.client_id,
      type: order.type,
      side: order.side,
      quantity: order.quantity,
    });

    return {
      order_id,
      status: 'pending',
      message: 'Order submitted successfully',
    };
  }

  /**
   * Cancel an order
   */
  async cancelOrder(order_id) {
    const order = await Order.findOne({ order_id });

    if (!order) {
      throw new Error('Order not found');
    }

    if (order.status === 'filled') {
      throw new Error('Cannot cancel a filled order');
    }

    if (order.status === 'cancelled') {
      return {
        order_id,
        status: 'cancelled',
        message: 'Order already cancelled',
      };
    }

    // Remove from matching engine book
    this.matchingEngine.removeFromBook(order_id);

    // Update status in DB
    order.status = 'cancelled';
    order.updated_at = new Date();
    await order.save();

    logger.info('Order cancelled', { order_id });

    return {
      order_id,
      status: 'cancelled',
      message: 'Order cancelled successfully',
      filled_quantity: order.filled_quantity,
    };
  }

  /**
   * Get order by ID
   */
  async getOrder(order_id) {
    const order = await Order.findOne({ order_id });
    if (!order) {
      throw new Error('Order not found');
    }
    return order;
  }

  /**
   * Validate order data
   */
  validateOrder(orderData) {
    const errors = [];

    if (!orderData.client_id) {
      errors.push('client_id is required');
    }

    if (!['buy', 'sell'].includes(orderData.side)) {
      errors.push('side must be "buy" or "sell"');
    }

    if (!['limit', 'market'].includes(orderData.type)) {
      errors.push('type must be "limit" or "market"');
    }

    if (orderData.type === 'limit' && (!orderData.price || orderData.price <= 0)) {
      errors.push('price must be positive for limit orders');
    }

    if (!orderData.quantity || orderData.quantity <= 0) {
      errors.push('quantity must be positive');
    }

    // Check precision (max 8 decimals)
    if (orderData.quantity && !this.isValidPrecision(orderData.quantity, 8)) {
      errors.push('quantity precision cannot exceed 8 decimal places');
    }

    if (orderData.price && !this.isValidPrecision(orderData.price, 2)) {
      errors.push('price precision cannot exceed 2 decimal places');
    }

    if (errors.length > 0) {
      ordersRejectedTotal.inc({ reason: 'validation_error' });
      throw new Error(`Validation failed: ${errors.join(', ')}`);
    }
  }

  /**
   * Check precision of a number
   */
  isValidPrecision(num, maxDecimals) {
    const str = num.toString();
    if (!str.includes('.')) return true;
    const decimals = str.split('.')[1].length;
    return decimals <= maxDecimals;
  }

  /**
   * Check idempotency key
   */
  async checkIdempotency(key) {
    const record = await IdempotencyKey.findOne({ key });
    if (record && record.expires_at > new Date()) {
      return record.response;
    }
    return null;
  }

  /**
   * Store idempotency key
   */
  async storeIdempotencyKey(key, order_id, response) {
    const ttlHours = parseInt(process.env.IDEMPOTENCY_TTL_HOURS || '24');
    const expires_at = new Date(Date.now() + ttlHours * 60 * 60 * 1000);

    try {
      await IdempotencyKey.create({
        key,
        order_id,
        response,
        created_at: new Date(),
        expires_at,
      });
    } catch (error) {
      // Ignore duplicate key errors (race condition)
      if (error.code !== 11000) {
        logger.error('Error storing idempotency key:', error);
      }
    }
  }
}

export default OrderService;
