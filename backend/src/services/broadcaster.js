import { WebSocketServer } from 'ws';
import logger from '../utils/logger.js';

class Broadcaster {
  constructor(server) {
    this.wss = new WebSocketServer({ server, path: '/ws' });
    this.clients = new Set();

    this.wss.on('connection', (ws) => {
      this.handleConnection(ws);
    });

    logger.info('WebSocket broadcaster initialized');
  }

  handleConnection(ws) {
    this.clients.add(ws);
    logger.info('WebSocket client connected', { total_clients: this.clients.size });

    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message);
        this.handleMessage(ws, data);
      } catch (error) {
        logger.error('Error parsing WebSocket message:', error);
      }
    });

    ws.on('close', () => {
      this.clients.delete(ws);
      logger.info('WebSocket client disconnected', { total_clients: this.clients.size });
    });

    ws.on('error', (error) => {
      logger.error('WebSocket error:', error);
    });

    // Send welcome message
    this.sendToClient(ws, {
      type: 'connected',
      message: 'Connected to exchange WebSocket',
      timestamp: new Date().toISOString(),
    });
  }

  handleMessage(ws, data) {
    if (data.type === 'subscribe') {
      // Handle subscription
      logger.info('Client subscribed', { channels: data.channels });
      this.sendToClient(ws, {
        type: 'subscribed',
        channels: data.channels || ['orderbook', 'trades', 'orders'],
      });
    } else if (data.type === 'ping') {
      this.sendToClient(ws, { type: 'pong', timestamp: new Date().toISOString() });
    }
  }

  sendToClient(ws, data) {
    if (ws.readyState === 1) {
      // OPEN
      ws.send(JSON.stringify(data));
    }
  }

  broadcast(data) {
    const message = JSON.stringify(data);
    logger.info(`Broadcasting ${data.type} to ${this.clients.size} clients`);
    this.clients.forEach((client) => {
      if (client.readyState === 1) {
        client.send(message);
      }
    });
  }

  async broadcastTrades(trades) {
    // Import Order model to look up client_ids
    const { default: Order } = await import('../models/Order.js');
    
    for (const trade of trades) {
      // Enrich trade with buyer and seller client_ids
      const [buyOrder, sellOrder] = await Promise.all([
        Order.findOne({ order_id: trade.buy_order_id }).select('client_id').lean(),
        Order.findOne({ order_id: trade.sell_order_id }).select('client_id').lean(),
      ]);

      const enrichedTrade = {
        ...trade,
        buyer_id: buyOrder?.client_id || 'Unknown',
        seller_id: sellOrder?.client_id || 'Unknown',
      };

      this.broadcast({
        type: 'trade',
        data: enrichedTrade,
      });
    }
  }

  broadcastOrderbookDelta(orderbook) {
    this.broadcast({
      type: 'orderbook_delta',
      data: orderbook,
    });
  }

  broadcastOrderUpdate(order) {
    this.broadcast({
      type: 'order_update',
      data: {
        order_id: order.order_id,
        client_id: order.client_id,
        side: order.side,
        type: order.type,
        price: order.price,
        quantity: order.quantity,
        filled_quantity: order.filled_quantity || 0,
        status: order.status,
        timestamp: new Date().toISOString(),
      },
    });
  }
}

export default Broadcaster;
