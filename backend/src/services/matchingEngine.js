import { v4 as uuidv4 } from 'uuid';
import Order from '../models/Order.js';
import Trade from '../models/Trade.js';
import logger from '../utils/logger.js';
import { ordersMatchedTotal, tradesTotal, matchingLatency, orderbookDepth } from '../metrics/prometheus.js';
import mongoose from 'mongoose';

class MatchingEngine {
  constructor(instrument = 'BTC-USD') {
    this.instrument = instrument;
    // In-memory orderbook: price level -> array of orders
    this.bids = new Map(); // Buy orders: higher price first
    this.asks = new Map(); // Sell orders: lower price first
    this.orderQueue = [];
    this.isProcessing = false;
  }

  /**
   * Add order to matching queue
   */
  async submitOrder(order) {
    this.orderQueue.push(order);
    this.processQueue();
  }

  /**
   * Process orders from queue sequentially
   */
  async processQueue() {
    if (this.isProcessing || this.orderQueue.length === 0) {
      return;
    }

    this.isProcessing = true;

    while (this.orderQueue.length > 0) {
      const order = this.orderQueue.shift();
      const startTime = Date.now();

      try {
        await this.matchOrder(order);
        const duration = (Date.now() - startTime) / 1000;
        matchingLatency.observe(duration);
      } catch (error) {
        logger.error('Error matching order:', { order_id: order.order_id, error: error.message });
        await this.rejectOrder(order, error.message);
      }
    }

    this.isProcessing = false;
  }

  /**
   * Core matching logic
   */
  async matchOrder(order) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      let trades = [];

      if (order.type === 'market') {
        trades = await this.matchMarketOrder(order, session);
      } else if (order.type === 'limit') {
        trades = await this.matchLimitOrder(order, session);
      }

  // Update order status
      const remainingQuantity = order.quantity - order.filled_quantity;
      let status = 'open';

      if (order.filled_quantity === 0 && order.type === 'market') {
        status = 'rejected'; // Market order with no fills
      } else if (order.filled_quantity >= order.quantity) {
        status = 'filled';
      } else if (order.filled_quantity > 0) {
        status = 'partially_filled';
      }

      // Update order in DB
      await Order.findOneAndUpdate(
        { order_id: order.order_id },
        {
          filled_quantity: order.filled_quantity,
          status,
          updated_at: new Date(),
        },
        { session }
      );

      // Add to orderbook if not fully filled and is limit order
      if (status !== 'filled' && status !== 'rejected' && order.type === 'limit') {
        this.addToBook(order);
      }

      await session.commitTransaction();

      // Broadcast updates
      // 1) Always broadcast order status update (so UI sees open/partial/filled)
      this.broadcastOrderUpdate({
        order_id: order.order_id,
        client_id: order.client_id,
        side: order.side,
        type: order.type,
        price: order.price,
        quantity: order.quantity,
        filled_quantity: order.filled_quantity,
        status,
        idempotency_key: order.idempotency_key,
        timestamp: new Date().toISOString(),
      });

      // 2) If trades occurred, broadcast trades
      if (trades.length > 0) {
        ordersMatchedTotal.inc({ instrument: this.instrument });
        this.updateDepthMetrics();
        this.broadcastTrades(trades);
      }

      // 3) Always broadcast orderbook delta so bids/asks update even when no trades
      this.broadcastOrderbookDelta();

      logger.info('Order matched', {
        order_id: order.order_id,
        status,
        filled_quantity: order.filled_quantity,
        trades: trades.length,
      });
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  /**
   * Match market order - execute immediately at best available prices
   */
  async matchMarketOrder(order, session) {
    const trades = [];
    const oppositeBook = order.side === 'buy' ? this.asks : this.bids;
    const sortedPrices = this.getSortedPrices(oppositeBook, order.side === 'buy');

    for (const price of sortedPrices) {
      if (order.filled_quantity >= order.quantity) break;

      const ordersAtPrice = oppositeBook.get(price);
      if (!ordersAtPrice || ordersAtPrice.length === 0) continue;

      for (let i = 0; i < ordersAtPrice.length; i++) {
        if (order.filled_quantity >= order.quantity) break;

        const makerOrder = ordersAtPrice[i];
        const matchQuantity = Math.min(
          order.quantity - order.filled_quantity,
          makerOrder.quantity - makerOrder.filled_quantity
        );

        if (matchQuantity <= 0) continue;

        // Create trade
        const trade = await this.executeTrade(order, makerOrder, price, matchQuantity, session);
        trades.push(trade);

        // Update filled quantities
        order.filled_quantity += matchQuantity;
        makerOrder.filled_quantity += matchQuantity;

        // Update maker order in DB
        const makerStatus = makerOrder.filled_quantity >= makerOrder.quantity ? 'filled' : 'partially_filled';
        await Order.findOneAndUpdate(
          { order_id: makerOrder.order_id },
          {
            filled_quantity: makerOrder.filled_quantity,
            status: makerStatus,
            updated_at: new Date(),
          },
          { session }
        );

        // Broadcast maker order status update
        this.broadcastOrderUpdate({
          order_id: makerOrder.order_id,
          client_id: makerOrder.client_id,
          side: makerOrder.side,
          type: makerOrder.type,
          price: makerOrder.price,
          quantity: makerOrder.quantity,
          filled_quantity: makerOrder.filled_quantity,
          status: makerStatus,
          idempotency_key: makerOrder.idempotency_key,
          timestamp: new Date().toISOString(),
        });

        // Remove from book if fully filled
        if (makerStatus === 'filled') {
          ordersAtPrice.splice(i, 1);
          i--;
        }
      }

      // Remove price level if empty
      if (ordersAtPrice.length === 0) {
        oppositeBook.delete(price);
      }
    }

    return trades;
  }

  /**
   * Match limit order - match at better or equal prices, then add remainder to book
   */
  async matchLimitOrder(order, session) {
    const trades = [];
    const oppositeBook = order.side === 'buy' ? this.asks : this.bids;
    const sortedPrices = this.getSortedPrices(oppositeBook, order.side === 'buy');

    for (const price of sortedPrices) {
      // Check if price matches
      const canMatch = order.side === 'buy' ? price <= order.price : price >= order.price;
      if (!canMatch) break;

      if (order.filled_quantity >= order.quantity) break;

      const ordersAtPrice = oppositeBook.get(price);
      if (!ordersAtPrice || ordersAtPrice.length === 0) continue;

      for (let i = 0; i < ordersAtPrice.length; i++) {
        if (order.filled_quantity >= order.quantity) break;

        const makerOrder = ordersAtPrice[i];
        const matchQuantity = Math.min(
          order.quantity - order.filled_quantity,
          makerOrder.quantity - makerOrder.filled_quantity
        );

        if (matchQuantity <= 0) continue;

        // Execute at maker price (price-time priority)
        const trade = await this.executeTrade(order, makerOrder, price, matchQuantity, session);
        trades.push(trade);

        order.filled_quantity += matchQuantity;
        makerOrder.filled_quantity += matchQuantity;

        // Update maker order
        const makerStatus = makerOrder.filled_quantity >= makerOrder.quantity ? 'filled' : 'partially_filled';
        await Order.findOneAndUpdate(
          { order_id: makerOrder.order_id },
          {
            filled_quantity: makerOrder.filled_quantity,
            status: makerStatus,
            updated_at: new Date(),
          },
          { session }
        );

        // Broadcast maker order status update
        this.broadcastOrderUpdate({
          order_id: makerOrder.order_id,
          client_id: makerOrder.client_id,
          side: makerOrder.side,
          type: makerOrder.type,
          price: makerOrder.price,
          quantity: makerOrder.quantity,
          filled_quantity: makerOrder.filled_quantity,
          status: makerStatus,
          idempotency_key: makerOrder.idempotency_key,
          timestamp: new Date().toISOString(),
        });

        if (makerStatus === 'filled') {
          ordersAtPrice.splice(i, 1);
          i--;
        }
      }

      if (ordersAtPrice.length === 0) {
        oppositeBook.delete(price);
      }
    }

    return trades;
  }

  /**
   * Execute a trade between two orders
   */
  async executeTrade(takerOrder, makerOrder, price, quantity, session) {
    const trade = {
      trade_id: uuidv4(),
      instrument: this.instrument,
      buy_order_id: takerOrder.side === 'buy' ? takerOrder.order_id : makerOrder.order_id,
      sell_order_id: takerOrder.side === 'sell' ? takerOrder.order_id : makerOrder.order_id,
      price,
      quantity,
      timestamp: new Date(),
    };

    await Trade.create([trade], { session });
    tradesTotal.inc({ instrument: this.instrument });

    logger.info('Trade executed', {
      trade_id: trade.trade_id,
      price,
      quantity,
      buy_order_id: trade.buy_order_id,
      sell_order_id: trade.sell_order_id,
    });

    return trade;
  }

  /**
   * Add order to in-memory orderbook
   */
  addToBook(order) {
    const book = order.side === 'buy' ? this.bids : this.asks;
    
    if (!book.has(order.price)) {
      book.set(order.price, []);
    }

    book.get(order.price).push(order);
  }

  /**
   * Remove order from orderbook (for cancellation)
   */
  removeFromBook(order_id) {
    // Search in both books
    for (const [price, orders] of this.bids) {
      const index = orders.findIndex((o) => o.order_id === order_id);
      if (index !== -1) {
        orders.splice(index, 1);
        if (orders.length === 0) {
          this.bids.delete(price);
        }
        return true;
      }
    }

    for (const [price, orders] of this.asks) {
      const index = orders.findIndex((o) => o.order_id === order_id);
      if (index !== -1) {
        orders.splice(index, 1);
        if (orders.length === 0) {
          this.asks.delete(price);
        }
        return true;
      }
    }

    return false;
  }

  /**
   * Get sorted prices for matching
   */
  getSortedPrices(book, ascending = true) {
    const prices = Array.from(book.keys());
    return ascending ? prices.sort((a, b) => a - b) : prices.sort((a, b) => b - a);
  }

  /**
   * Reject order
   */
  async rejectOrder(order, reason) {
    await Order.findOneAndUpdate(
      { order_id: order.order_id },
      { status: 'rejected', updated_at: new Date() }
    );
    logger.warn('Order rejected', { order_id: order.order_id, reason });
  }

  /**
   * Get current orderbook snapshot
   */
  getOrderbook(levels = 20) {
    const formatLevel = (price, orders) => ({
      price,
      quantity: orders.reduce((sum, o) => sum + (o.quantity - o.filled_quantity), 0),
      orders: orders.length,
    });

    const bids = this.getSortedPrices(this.bids, false)
      .slice(0, levels)
      .map((price) => formatLevel(price, this.bids.get(price)));

    const asks = this.getSortedPrices(this.asks, true)
      .slice(0, levels)
      .map((price) => formatLevel(price, this.asks.get(price)));

    return {
      instrument: this.instrument,
      bids,
      asks,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Update depth metrics
   */
  updateDepthMetrics() {
    const bidDepth = Array.from(this.bids.values())
      .flat()
      .reduce((sum, o) => sum + (o.quantity - o.filled_quantity), 0);

    const askDepth = Array.from(this.asks.values())
      .flat()
      .reduce((sum, o) => sum + (o.quantity - o.filled_quantity), 0);

    orderbookDepth.set({ side: 'buy', instrument: this.instrument }, bidDepth);
    orderbookDepth.set({ side: 'sell', instrument: this.instrument }, askDepth);
  }

  /**
   * Broadcast methods (to be implemented by WebSocket broadcaster)
   */
  broadcastTrades(trades) {
    // Will be set by broadcaster
    if (this.onTrades) {
      this.onTrades(trades);
    }
  }

  broadcastOrderbookDelta() {
    if (this.onOrderbookUpdate) {
      this.onOrderbookUpdate(this.getOrderbook());
    }
  }

  /**
   * Broadcast a single order update (status/filled changes)
   */
  broadcastOrderUpdate(order) {
    if (this.onOrderUpdate) {
      this.onOrderUpdate(order);
    }
  }

  /**
   * Rebuild orderbook from database (recovery)
   */
  async rebuildFromDB() {
    logger.info('Rebuilding orderbook from database...');

    const openOrders = await Order.find({
      instrument: this.instrument,
      status: { $in: ['open', 'partially_filled'] },
    }).sort({ created_at: 1 });

    for (const order of openOrders) {
      this.addToBook(order);
    }

    this.updateDepthMetrics();
    logger.info(`Orderbook rebuilt: ${openOrders.length} orders loaded`);
  }
}

export default MatchingEngine;
