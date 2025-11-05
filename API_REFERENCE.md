# API Reference

Complete API documentation for the Exchange Matching Engine.

**Base URL:** `http://localhost:3000`  
**WebSocket URL:** `ws://localhost:3000/ws`

---

## Table of Contents

- [Order Management](#order-management)
- [Market Data](#market-data)
- [Administration](#administration)
- [WebSocket Events](#websocket-events)
- [Error Codes](#error-codes)
- [Rate Limits](#rate-limits)

---

## Order Management

### Submit Order

Submit a new limit or market order.

**Endpoint:** `POST /orders`

**Request Body:**
```json
{
  "idempotency_key": "string (optional)",
  "order_id": "string (optional, UUID)",
  "client_id": "string (required)",
  "instrument": "string (default: BTC-USD)",
  "side": "buy | sell (required)",
  "type": "limit | market (required)",
  "price": "number (required for limit orders)",
  "quantity": "number (required)"
}
```

**Response:** `202 Accepted`
```json
{
  "order_id": "uuid",
  "status": "pending",
  "message": "Order submitted successfully"
}
```

**Example:**
```bash
curl -X POST http://localhost:3000/orders \
  -H "Content-Type: application/json" \
  -d '{
    "idempotency_key": "abc-123",
    "client_id": "alice",
    "side": "buy",
    "type": "limit",
    "price": 70000,
    "quantity": 1.5
  }'
```

---

### Get Order

Retrieve order details by ID.

**Endpoint:** `GET /orders/:order_id`

**Response:** `200 OK`
```json
{
  "order_id": "uuid",
  "client_id": "string",
  "instrument": "BTC-USD",
  "side": "buy | sell",
  "type": "limit | market",
  "price": "number",
  "quantity": "number",
  "filled_quantity": "number",
  "status": "open | partially_filled | filled | cancelled | rejected",
  "created_at": "ISO8601",
  "updated_at": "ISO8601"
}
```

**Example:**
```bash
curl http://localhost:3000/orders/550e8400-e29b-41d4-a716-446655440000
```

---

### Cancel Order

Cancel an existing order.

**Endpoint:** `POST /orders/:order_id/cancel`

**Response:** `200 OK`
```json
{
  "order_id": "uuid",
  "status": "cancelled",
  "message": "Order cancelled successfully",
  "filled_quantity": "number"
}
```

**Example:**
```bash
curl -X POST http://localhost:3000/orders/550e8400-e29b-41d4-a716-446655440000/cancel
```

**Errors:**
- `404`: Order not found
- `400`: Cannot cancel filled order

---

## Market Data

### Get Orderbook

Retrieve current orderbook snapshot.

**Endpoint:** `GET /orderbook`

**Query Parameters:**
- `instrument` (optional): Default `BTC-USD`
- `levels` (optional): Number of price levels (1-100), default 20

**Response:** `200 OK`
```json
{
  "instrument": "BTC-USD",
  "bids": [
    {
      "price": 70000,
      "quantity": 5.5,
      "orders": 3
    }
  ],
  "asks": [
    {
      "price": 70100,
      "quantity": 3.2,
      "orders": 2
    }
  ],
  "timestamp": "ISO8601"
}
```

**Example:**
```bash
curl http://localhost:3000/orderbook?levels=10
```

---

### Get Trades

Retrieve recent trades.

**Endpoint:** `GET /trades`

**Query Parameters:**
- `limit` (optional): Number of trades (1-1000), default 50

**Response:** `200 OK`
```json
[
  {
    "trade_id": "uuid",
    "instrument": "BTC-USD",
    "buy_order_id": "uuid",
    "sell_order_id": "uuid",
    "price": 70000,
    "quantity": 1.5,
    "timestamp": "ISO8601"
  }
]
```

**Example:**
```bash
curl http://localhost:3000/trades?limit=100
```

---

## Administration

### Health Check

Check system health and status.

**Endpoint:** `GET /healthz`

**Response:** `200 OK` (healthy) or `503 Service Unavailable` (unhealthy)
```json
{
  "status": "ok",
  "uptime": 12345.67,
  "timestamp": "ISO8601",
  "mongodb": "connected | disconnected"
}
```

**Example:**
```bash
curl http://localhost:3000/healthz
```

---

### Prometheus Metrics

Export Prometheus-compatible metrics.

**Endpoint:** `GET /metrics`

**Response:** `200 OK` (text/plain)
```
# HELP orders_received_total Total number of orders received
# TYPE orders_received_total counter
orders_received_total{type="limit",side="buy",instrument="BTC-USD"} 1234

# HELP order_latency_seconds Order processing latency in seconds
# TYPE order_latency_seconds histogram
order_latency_seconds_bucket{le="0.005"} 500
order_latency_seconds_bucket{le="0.01"} 950
...
```

**Example:**
```bash
curl http://localhost:3000/metrics
```

**Available Metrics:**
- `orders_received_total`: Counter by type, side, instrument
- `orders_matched_total`: Counter by instrument
- `orders_rejected_total`: Counter by reason
- `trades_total`: Counter by instrument
- `order_latency_seconds`: Histogram of submission latency
- `matching_latency_seconds`: Histogram of matching latency
- `orderbook_depth`: Gauge of current depth by side
- `orders_in_queue`: Gauge of pending orders

---

## WebSocket Events

### Connection

**URL:** `ws://localhost:3000/ws`

**JavaScript Example:**
```javascript
const ws = new WebSocket('ws://localhost:3000/ws');

ws.onopen = () => {
  console.log('Connected');
  
  // Subscribe to channels
  ws.send(JSON.stringify({
    type: 'subscribe',
    channels: ['orderbook', 'trades', 'orders']
  }));
};

ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  console.log(message.type, message.data);
};
```

---

### Client → Server Messages

#### Subscribe
```json
{
  "type": "subscribe",
  "channels": ["orderbook", "trades", "orders"]
}
```

#### Ping
```json
{
  "type": "ping"
}
```

---

### Server → Client Messages

#### Connected
```json
{
  "type": "connected",
  "message": "Connected to exchange WebSocket",
  "timestamp": "ISO8601"
}
```

#### Subscribed
```json
{
  "type": "subscribed",
  "channels": ["orderbook", "trades", "orders"]
}
```

#### Orderbook Delta
```json
{
  "type": "orderbook_delta",
  "data": {
    "instrument": "BTC-USD",
    "bids": [...],
    "asks": [...],
    "timestamp": "ISO8601"
  }
}
```

#### Trade
```json
{
  "type": "trade",
  "data": {
    "trade_id": "uuid",
    "instrument": "BTC-USD",
    "buy_order_id": "uuid",
    "sell_order_id": "uuid",
    "price": 70000,
    "quantity": 1.5,
    "timestamp": "ISO8601"
  }
}
```

#### Order Update
```json
{
  "type": "order_update",
  "data": {
    "order_id": "uuid",
    "status": "filled | partially_filled | cancelled",
    "filled_quantity": "number",
    "timestamp": "ISO8601"
  }
}
```

#### Pong
```json
{
  "type": "pong",
  "timestamp": "ISO8601"
}
```

---

## Error Codes

### HTTP Status Codes

| Code | Meaning | Example |
|------|---------|---------|
| 200 | OK | Successful GET request |
| 202 | Accepted | Order submitted |
| 400 | Bad Request | Validation error, invalid order |
| 404 | Not Found | Order not found |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Server error |
| 503 | Service Unavailable | Database disconnected |

### Error Response Format

```json
{
  "error": "Error category",
  "message": "Detailed error message",
  "details": []  // Optional validation errors
}
```

**Example:**
```json
{
  "error": "Validation failed",
  "message": "Invalid order parameters",
  "details": [
    {
      "field": "price",
      "message": "price must be positive for limit orders"
    }
  ]
}
```

---

## Rate Limits

### Per-Client Limits

**Default:** 100 requests per second per `client_id`

**Burst:** 200 requests

**Configuration:** Set via environment variables
```bash
RATE_LIMIT_WINDOW_MS=1000
RATE_LIMIT_MAX_REQUESTS=100
```

**Rate Limit Response:**
```json
{
  "error": "Too many requests",
  "message": "Rate limit exceeded. Max 100 requests per 1000ms"
}
```

**Headers:**
- `RateLimit-Limit`: Max requests per window
- `RateLimit-Remaining`: Requests remaining
- `RateLimit-Reset`: Time until reset (seconds)

---

## Data Types & Validation

### Order Types

**Limit Order:**
- Requires `price` field
- Enters orderbook if not fully matched
- Executes at limit price or better

**Market Order:**
- No `price` field
- Executes immediately at best available price
- Does not enter orderbook

### Field Constraints

| Field | Type | Min | Max | Precision |
|-------|------|-----|-----|-----------|
| `price` | number | >0 | - | 2 decimals |
| `quantity` | number | >0 | - | 8 decimals |
| `client_id` | string | 1 char | 50 chars | - |
| `idempotency_key` | string | 1 char | 100 chars | - |

### Order Status States

1. **pending**: Order received, awaiting matching
2. **open**: Limit order in orderbook, unfilled
3. **partially_filled**: Partial execution, remaining in book
4. **filled**: Fully executed
5. **cancelled**: Cancelled by client
6. **rejected**: Rejected due to validation or no liquidity

---

## Best Practices

### Idempotency

Always include `idempotency_key` to prevent duplicate submissions:

```javascript
const key = `${clientId}-${Date.now()}-${crypto.randomUUID()}`;

await fetch('/orders', {
  method: 'POST',
  body: JSON.stringify({
    idempotency_key: key,
    client_id: 'alice',
    // ... other fields
  })
});
```

### Error Handling

```javascript
try {
  const response = await fetch('/orders', {
    method: 'POST',
    body: JSON.stringify(orderData)
  });

  if (!response.ok) {
    const error = await response.json();
    console.error('Order failed:', error.message);
    
    if (response.status === 429) {
      // Rate limited - back off
      await sleep(1000);
      // Retry...
    }
  }
} catch (error) {
  console.error('Network error:', error);
}
```

### WebSocket Reconnection

```javascript
let ws;

function connect() {
  ws = new WebSocket('ws://localhost:3000/ws');
  
  ws.onclose = () => {
    console.log('Disconnected. Reconnecting in 3s...');
    setTimeout(connect, 3000);
  };
}

connect();
```

---

## Examples by Use Case

### Place Multiple Orders

```bash
# Buy orders at different prices
for price in 69500 69600 69700; do
  curl -X POST http://localhost:3000/orders \
    -H "Content-Type: application/json" \
    -d "{
      \"idempotency_key\": \"buy-$price-$(date +%s)\",
      \"client_id\": \"alice\",
      \"side\": \"buy\",
      \"type\": \"limit\",
      \"price\": $price,
      \"quantity\": 1.0
    }"
done
```

### Monitor Orderbook Changes

```javascript
const ws = new WebSocket('ws://localhost:3000/ws');

ws.onmessage = (event) => {
  const msg = JSON.parse(event.data);
  
  if (msg.type === 'orderbook_delta') {
    const { bids, asks } = msg.data;
    console.log('Best Bid:', bids[0]);
    console.log('Best Ask:', asks[0]);
    console.log('Spread:', asks[0].price - bids[0].price);
  }
};
```

### Track Order Lifecycle

```javascript
// 1. Submit order
const response = await fetch('/orders', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(orderData)
});

const { order_id } = await response.json();

// 2. Check status periodically
setInterval(async () => {
  const order = await fetch(`/orders/${order_id}`).then(r => r.json());
  console.log(`Status: ${order.status}, Filled: ${order.filled_quantity}`);
}, 1000);

// 3. Cancel if needed
setTimeout(async () => {
  await fetch(`/orders/${order_id}/cancel`, { method: 'POST' });
}, 30000); // Cancel after 30s
```

---

## Testing Endpoints

### Health Check Script

```bash
#!/bin/bash
while true; do
  curl -s http://localhost:3000/healthz | jq .
  sleep 5
done
```

### Orderbook Snapshot Loop

```bash
#!/bin/bash
watch -n 1 'curl -s http://localhost:3000/orderbook?levels=5 | jq .'
```

---

## Appendix: Full cURL Examples

### Complete Order Flow

```bash
# 1. Check health
curl http://localhost:3000/healthz

# 2. Submit buy order
ORDER_ID=$(curl -s -X POST http://localhost:3000/orders \
  -H "Content-Type: application/json" \
  -d '{
    "idempotency_key": "test-1",
    "client_id": "alice",
    "side": "buy",
    "type": "limit",
    "price": 70000,
    "quantity": 1.0
  }' | jq -r '.order_id')

echo "Order ID: $ORDER_ID"

# 3. Check order status
curl http://localhost:3000/orders/$ORDER_ID | jq .

# 4. View orderbook
curl http://localhost:3000/orderbook?levels=5 | jq .

# 5. Cancel order
curl -X POST http://localhost:3000/orders/$ORDER_ID/cancel | jq .
```

---

**API Version:** 1.0.0  
**Last Updated:** November 5, 2025
