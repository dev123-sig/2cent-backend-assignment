/**
 * Unit tests for matching engine
 */

import MatchingEngine from '../src/services/matchingEngine.js';

describe('MatchingEngine', () => {
  let engine;

  beforeEach(() => {
    engine = new MatchingEngine('BTC-USD');
  });

  describe('Order Book Management', () => {
    test('should add limit order to book', () => {
      const order = {
        order_id: 'test-1',
        side: 'buy',
        type: 'limit',
        price: 70000,
        quantity: 1,
        filled_quantity: 0,
      };

      engine.addToBook(order);
      const orderbook = engine.getOrderbook();

      expect(orderbook.bids.length).toBe(1);
      expect(orderbook.bids[0].price).toBe(70000);
      expect(orderbook.bids[0].quantity).toBe(1);
    });

    test('should remove order from book', () => {
      const order = {
        order_id: 'test-1',
        side: 'buy',
        type: 'limit',
        price: 70000,
        quantity: 1,
        filled_quantity: 0,
      };

      engine.addToBook(order);
      const removed = engine.removeFromBook('test-1');

      expect(removed).toBe(true);
      const orderbook = engine.getOrderbook();
      expect(orderbook.bids.length).toBe(0);
    });

    test('should maintain price-time priority for bids', () => {
      const order1 = {
        order_id: 'test-1',
        side: 'buy',
        type: 'limit',
        price: 70000,
        quantity: 1,
        filled_quantity: 0,
        created_at: new Date('2025-01-01T10:00:00Z'),
      };

      const order2 = {
        order_id: 'test-2',
        side: 'buy',
        type: 'limit',
        price: 70100,
        quantity: 1,
        filled_quantity: 0,
        created_at: new Date('2025-01-01T10:00:01Z'),
      };

      engine.addToBook(order1);
      engine.addToBook(order2);

      const orderbook = engine.getOrderbook();
      // Higher price should be first
      expect(orderbook.bids[0].price).toBe(70100);
      expect(orderbook.bids[1].price).toBe(70000);
    });

    test('should maintain price-time priority for asks', () => {
      const order1 = {
        order_id: 'test-1',
        side: 'sell',
        type: 'limit',
        price: 70100,
        quantity: 1,
        filled_quantity: 0,
        created_at: new Date('2025-01-01T10:00:00Z'),
      };

      const order2 = {
        order_id: 'test-2',
        side: 'sell',
        type: 'limit',
        price: 70000,
        quantity: 1,
        filled_quantity: 0,
        created_at: new Date('2025-01-01T10:00:01Z'),
      };

      engine.addToBook(order1);
      engine.addToBook(order2);

      const orderbook = engine.getOrderbook();
      // Lower price should be first
      expect(orderbook.asks[0].price).toBe(70000);
      expect(orderbook.asks[1].price).toBe(70100);
    });
  });

  describe('Price Sorting', () => {
    test('should sort bid prices descending', () => {
      const book = new Map([
        [70000, []],
        [70100, []],
        [69900, []],
      ]);

      const sorted = engine.getSortedPrices(book, false);
      expect(sorted).toEqual([70100, 70000, 69900]);
    });

    test('should sort ask prices ascending', () => {
      const book = new Map([
        [70000, []],
        [70100, []],
        [69900, []],
      ]);

      const sorted = engine.getSortedPrices(book, true);
      expect(sorted).toEqual([69900, 70000, 70100]);
    });
  });

  describe('Orderbook Snapshot', () => {
    test('should return correct orderbook structure', () => {
      const order1 = {
        order_id: 'test-1',
        side: 'buy',
        type: 'limit',
        price: 70000,
        quantity: 1.5,
        filled_quantity: 0,
      };

      const order2 = {
        order_id: 'test-2',
        side: 'sell',
        type: 'limit',
        price: 70100,
        quantity: 2.0,
        filled_quantity: 0,
      };

      engine.addToBook(order1);
      engine.addToBook(order2);

      const orderbook = engine.getOrderbook(10);

      expect(orderbook.instrument).toBe('BTC-USD');
      expect(orderbook.bids).toHaveLength(1);
      expect(orderbook.asks).toHaveLength(1);
      expect(orderbook.bids[0].price).toBe(70000);
      expect(orderbook.bids[0].quantity).toBe(1.5);
      expect(orderbook.asks[0].price).toBe(70100);
      expect(orderbook.asks[0].quantity).toBe(2.0);
    });

    test('should limit orderbook levels', () => {
      // Add multiple price levels
      for (let i = 0; i < 50; i++) {
        engine.addToBook({
          order_id: `buy-${i}`,
          side: 'buy',
          type: 'limit',
          price: 70000 - i * 10,
          quantity: 1,
          filled_quantity: 0,
        });
      }

      const orderbook = engine.getOrderbook(20);
      expect(orderbook.bids.length).toBe(20);
    });
  });
});
