import client from 'prom-client';

// Create a Registry
const register = new client.Registry();

// Add default metrics
client.collectDefaultMetrics({ register });

// Custom metrics

// Counters
export const ordersReceivedTotal = new client.Counter({
  name: 'orders_received_total',
  help: 'Total number of orders received',
  labelNames: ['type', 'side', 'instrument'],
  registers: [register],
});

export const ordersMatchedTotal = new client.Counter({
  name: 'orders_matched_total',
  help: 'Total number of orders matched',
  labelNames: ['instrument'],
  registers: [register],
});

export const ordersRejectedTotal = new client.Counter({
  name: 'orders_rejected_total',
  help: 'Total number of orders rejected',
  labelNames: ['reason'],
  registers: [register],
});

export const tradesTotal = new client.Counter({
  name: 'trades_total',
  help: 'Total number of trades executed',
  labelNames: ['instrument'],
  registers: [register],
});

// Histograms
export const orderLatency = new client.Histogram({
  name: 'order_latency_seconds',
  help: 'Order processing latency in seconds',
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 5],
  registers: [register],
});

export const matchingLatency = new client.Histogram({
  name: 'matching_latency_seconds',
  help: 'Order matching latency in seconds',
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1],
  registers: [register],
});

// Gauges
export const orderbookDepth = new client.Gauge({
  name: 'orderbook_depth',
  help: 'Current orderbook depth (total quantity)',
  labelNames: ['side', 'instrument'],
  registers: [register],
});

export const ordersInQueue = new client.Gauge({
  name: 'orders_in_queue',
  help: 'Number of orders waiting in matching queue',
  registers: [register],
});

export { register };
