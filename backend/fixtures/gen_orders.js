/**
 * Generate realistic order fixtures for testing
 * 
 * Usage: node fixtures/gen_orders.js
 */

import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';

const NUM_ORDERS = 100000;
const BASE_PRICE = 70000; // BTC-USD base price
const PRICE_RANGE = 5000; // +/- range around base price
const NUM_CLIENTS = 1000;

/**
 * Generate random price around base price
 */
function generatePrice(side) {
  const spread = Math.random() * PRICE_RANGE - PRICE_RANGE / 2;
  const price = BASE_PRICE + spread;
  
  // Round to 2 decimals
  return Math.round(price * 100) / 100;
}

/**
 * Generate random quantity
 */
function generateQuantity() {
  // Random between 0.001 and 10 BTC
  const qty = Math.random() * 10 + 0.001;
  // Round to 8 decimals
  return Math.round(qty * 100000000) / 100000000;
}

/**
 * Generate random client ID
 */
function generateClientId() {
  return `client-${Math.floor(Math.random() * NUM_CLIENTS) + 1}`;
}

/**
 * Generate limit order
 */
function generateLimitOrder() {
  const side = Math.random() > 0.5 ? 'buy' : 'sell';
  
  return {
    idempotency_key: uuidv4(),
    order_id: uuidv4(),
    client_id: generateClientId(),
    instrument: 'BTC-USD',
    side,
    type: 'limit',
    price: generatePrice(side),
    quantity: generateQuantity(),
  };
}

/**
 * Generate market order
 */
function generateMarketOrder() {
  return {
    idempotency_key: uuidv4(),
    order_id: uuidv4(),
    client_id: generateClientId(),
    instrument: 'BTC-USD',
    side: Math.random() > 0.5 ? 'buy' : 'sell',
    type: 'market',
    quantity: generateQuantity(),
  };
}

/**
 * Main generation function
 */
function generateOrders() {
  console.log(`Generating ${NUM_ORDERS} orders...`);
  
  const orders = [];
  
  // Generate limit orders (90% of total)
  const numLimitOrders = Math.floor(NUM_ORDERS * 0.9);
  for (let i = 0; i < numLimitOrders; i++) {
    orders.push(generateLimitOrder());
    
    if ((i + 1) % 10000 === 0) {
      console.log(`  Generated ${i + 1} limit orders...`);
    }
  }
  
  // Generate market orders (10% of total)
  const numMarketOrders = NUM_ORDERS - numLimitOrders;
  for (let i = 0; i < numMarketOrders; i++) {
    orders.push(generateMarketOrder());
  }
  
  console.log(`✅ Generated ${orders.length} orders total`);
  console.log(`   - ${numLimitOrders} limit orders`);
  console.log(`   - ${numMarketOrders} market orders`);
  
  return orders;
}

/**
 * Save orders to file
 */
function saveOrders(orders, filename = 'orders.json') {
  const filepath = `fixtures/${filename}`;
  
  console.log(`\nSaving orders to ${filepath}...`);
  fs.writeFileSync(filepath, JSON.stringify(orders, null, 2));
  
  const stats = fs.statSync(filepath);
  const fileSizeMB = (stats.size / (1024 * 1024)).toFixed(2);
  
  console.log(`✅ Saved ${orders.length} orders (${fileSizeMB} MB)`);
}

/**
 * Generate summary statistics
 */
function generateStats(orders) {
  const stats = {
    total: orders.length,
    limit: orders.filter(o => o.type === 'limit').length,
    market: orders.filter(o => o.type === 'market').length,
    buy: orders.filter(o => o.side === 'buy').length,
    sell: orders.filter(o => o.side === 'sell').length,
    unique_clients: new Set(orders.map(o => o.client_id)).size,
    price_range: {
      min: Math.min(...orders.filter(o => o.price).map(o => o.price)),
      max: Math.max(...orders.filter(o => o.price).map(o => o.price)),
    },
    quantity_range: {
      min: Math.min(...orders.map(o => o.quantity)),
      max: Math.max(...orders.map(o => o.quantity)),
      avg: orders.reduce((sum, o) => sum + o.quantity, 0) / orders.length,
    },
  };
  
  console.log('\n📊 Order Statistics:');
  console.log(`   Total: ${stats.total}`);
  console.log(`   Limit: ${stats.limit} (${(stats.limit / stats.total * 100).toFixed(1)}%)`);
  console.log(`   Market: ${stats.market} (${(stats.market / stats.total * 100).toFixed(1)}%)`);
  console.log(`   Buy: ${stats.buy} (${(stats.buy / stats.total * 100).toFixed(1)}%)`);
  console.log(`   Sell: ${stats.sell} (${(stats.sell / stats.total * 100).toFixed(1)}%)`);
  console.log(`   Unique clients: ${stats.unique_clients}`);
  console.log(`   Price range: $${stats.price_range.min.toFixed(2)} - $${stats.price_range.max.toFixed(2)}`);
  console.log(`   Quantity range: ${stats.quantity_range.min.toFixed(8)} - ${stats.quantity_range.max.toFixed(8)} BTC`);
  console.log(`   Avg quantity: ${stats.quantity_range.avg.toFixed(8)} BTC`);
  
  return stats;
}

// Main execution
console.log('🏭 Order Fixture Generator\n');

const orders = generateOrders();
saveOrders(orders);
generateStats(orders);

console.log('\n✨ Done! Use these fixtures for load testing.');
