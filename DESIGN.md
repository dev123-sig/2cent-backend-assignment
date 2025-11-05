# Exchange Matching Engine - Design Document

## 1. Architecture Overview

### High-Level Components

```
┌─────────────────────────────────────────────────────────────────┐
│                         React Frontend (Vite)                    │
│  - OrderBook Display  - Trade Feed  - Order Form  - WebSocket   │
└──────────────────────┬──────────────────────────────────────────┘
                       │ HTTP REST + WebSocket
                       ↓
┌─────────────────────────────────────────────────────────────────┐
│                    Express API Layer (Node.js)                   │
│  - Routes  - Validation  - Rate Limiting  - Idempotency         │
└──────────────────────┬──────────────────────────────────────────┘
                       │
        ┌──────────────┼──────────────┐
        ↓              ↓               ↓
┌──────────────┐ ┌──────────────┐ ┌────────────────┐
│  Matching    │ │   Order      │ │   Broadcaster  │
│  Engine      │ │   Service    │ │   (WebSocket)  │
│ (Worker)     │ │              │ │                │
└──────┬───────┘ └──────┬───────┘ └────────────────┘
       │                │
       └────────┬───────┘
                ↓
        ┌──────────────────┐
        │    MongoDB        │
        │ - orders          │
        │ - trades          │
        │ - snapshots       │
        │ - idempotency_keys│
        └──────────────────┘
```

## 2. Data Model

### Collections

#### Orders Collection
```javascript
{
  order_id: String (UUID),           // Unique order identifier
  client_id: String,                 // Client identifier
  instrument: String,                // e.g., "BTC-USD"
  side: String,                      // "buy" | "sell"
  type: String,                      // "limit" | "market"
  price: Number,                     // Integer (price * 1e6 for precision)
  quantity: Number,                  // Decimal quantity
  filled_quantity: Number,           // Amount filled so far
  status: String,                    // "open" | "partially_filled" | "filled" | "cancelled" | "rejected"
  created_at: Date,
  updated_at: Date,
  version: Number                    // Optimistic locking
}
```

**Indexes:**
- `{ order_id: 1 }` (unique)
- `{ client_id: 1, created_at: -1 }`
- `{ instrument: 1, status: 1, side: 1, price: 1, created_at: 1 }` (compound for matching)
- `{ status: 1, instrument: 1 }` (recovery queries)

#### Trades Collection
```javascript
{
  trade_id: String (UUID),
  instrument: String,
  buy_order_id: String,
  sell_order_id: String,
  price: Number,                     // Execution price (integer)
  quantity: Number,                  // Executed quantity
  timestamp: Date
}
```

**Indexes:**
- `{ trade_id: 1 }` (unique)
- `{ timestamp: -1 }` (recent trades query)
- `{ buy_order_id: 1 }`, `{ sell_order_id: 1 }`

#### Snapshots Collection
```javascript
{
  snapshot_id: String (UUID),
  instrument: String,
  bids: [{price: Number, quantity: Number, orders: [order_id]}],
  asks: [{price: Number, quantity: Number, orders: [order_id]}],
  timestamp: Date
}
```

**Indexes:**
- `{ instrument: 1, timestamp: -1 }`

#### Idempotency Keys Collection
```javascript
{
  key: String,                       // Idempotency key from client
  order_id: String,                  // Resulting order ID
  response: Object,                  // Cached response
  created_at: Date,
  expires_at: Date
}
```

**Indexes:**
- `{ key: 1 }` (unique)
- `{ expires_at: 1 }` (TTL index for auto-cleanup)

## 3. Concurrency Model

### Single-Threaded Matching Engine per Instrument

**Rationale:**
- Simplifies concurrency control (no locks needed within matching logic)
- Deterministic execution order (price-time priority)
- Node.js event loop naturally supports async I/O without blocking

**Implementation:**
```
API Request → Validation → Persist to DB → Push to Matching Queue → Respond
                                                    ↓
                               Matching Worker (async/await loop)
                                       - Pop order from queue
                                       - Match against in-memory book
                                       - Generate trades
                                       - Update DB in transaction
                                       - Broadcast events
```

**Flow:**
1. API layer receives order via HTTP POST
2. Validate input (schema, price/quantity > 0, etc.)
3. Check idempotency key (if duplicate, return cached response)
4. Persist order to MongoDB with status="pending"
5. Push order to matching engine queue (in-memory)
6. Return `202 Accepted` with order_id
7. Matching engine worker:
   - Dequeue order
   - Match against in-memory orderbook
   - Create trade records
   - Update order statuses in MongoDB (transaction)
   - Update in-memory orderbook
   - Broadcast orderbook delta + trades via WebSocket
8. Clients receive real-time updates

### Preventing Race Conditions

- **Order submission:** Idempotency keys prevent duplicate submissions
- **Matching:** Single worker thread per instrument eliminates concurrent book modifications
- **DB updates:** MongoDB transactions ensure atomic updates across orders and trades
- **Optimistic locking:** Version field in orders for any external updates

## 4. Matching Algorithm

### Price-Time Priority

**Bids (Buy Orders):**
- Sorted by price descending (highest price first)
- At same price, sorted by timestamp ascending (FIFO)

**Asks (Sell Orders):**
- Sorted by price ascending (lowest price first)
- At same price, sorted by timestamp ascending (FIFO)

### Limit Order Matching

1. Incoming limit order checks opposite side of book
2. If buy order, check best ask (lowest sell price):
   - If `ask.price <= buy.price`: match
   - Execute at `ask.price` (maker price)
3. Continue matching until:
   - Order fully filled, OR
   - No more matching prices, OR
   - Book exhausted
4. Remaining quantity stays in book as open/partially_filled order

### Market Order Matching

1. Market order matches immediately at best available prices
2. Walks through price levels until filled or book empty
3. Produces partial fill if book lacks liquidity
4. No resting order (market orders don't enter book)

### Partial Fills

- Both limit and market orders support partial fills
- `filled_quantity` tracks cumulative fills
- Order status transitions:
  - `open` → `partially_filled` → `filled`
  - Or `open` → `filled` (single fill)

### Order Cancellation

- Client cancels via `POST /orders/:id/cancel`
- Remove from in-memory book
- Update status to `cancelled` in DB
- Cannot cancel if fully filled

## 5. Persistence & Recovery Strategy

### Persistence Approach

**Write-Through Cache:**
- In-memory orderbook is the "hot" data structure
- All state changes immediately persisted to MongoDB
- MongoDB is source of truth

**Periodic Snapshots (Optional Enhancement):**
- Every N seconds or M trades, persist full orderbook snapshot
- Reduces recovery time on restart

### Recovery Strategy (Startup)

**Option A: Rebuild from Orders (Current Implementation)**
1. Query all orders where `status IN ("open", "partially_filled")` for instrument
2. Reconstruct in-memory orderbook by replaying orders in timestamp order
3. Validate consistency (no orphaned trades)
4. Resume matching

**Option B: Load Latest Snapshot + Delta Replay (Future)**
1. Load most recent snapshot
2. Query orders created/updated after snapshot timestamp
3. Replay deltas
4. Resume matching

**Tradeoffs:**
- **Option A:** Simple, always consistent, slower startup with many open orders
- **Option B:** Faster startup, more complex, requires snapshot maintenance

**Current choice:** Option A for simplicity and correctness. Snapshots added as bonus feature.

### Data Durability

- MongoDB with journaling (default) ensures durability
- Write concern: `w: "majority"` for critical writes
- Read concern: `"majority"` for recovery queries

## 6. Idempotency

### Mechanism

1. Client includes `idempotency_key` in POST /orders request
2. Server checks `idempotency_keys` collection
3. If key exists and not expired:
   - Return cached response (same order_id, status)
   - Log duplicate submission
4. If key new:
   - Process order normally
   - Store key + response with TTL (24 hours)
5. Expired keys auto-deleted by MongoDB TTL index

### Edge Cases

- Concurrent requests with same key: MongoDB unique index ensures only one succeeds
- Client retries after timeout: Idempotency returns consistent result
- Malicious replay: Key expires after 24h

## 7. API Design

### REST Endpoints

**POST /orders**
- Submit new order
- Body: `{ idempotency_key, client_id, instrument, side, type, price?, quantity }`
- Response: `202 Accepted` with `{ order_id, status }`

**POST /orders/:order_id/cancel**
- Cancel existing order
- Response: `200 OK` with updated order state

**GET /orders/:order_id**
- Retrieve order details
- Response: full order object

**GET /orderbook?instrument=BTC-USD&levels=20**
- Current orderbook snapshot
- Response: `{ bids: [{price, quantity, orders}], asks: [...], timestamp }`

**GET /trades?limit=50**
- Recent trades
- Response: `[{trade_id, price, quantity, timestamp, ...}]`

**GET /healthz**
- Health check
- Response: `{ status: "ok", uptime, mongodb: "connected" }`

**GET /metrics**
- Prometheus metrics
- Response: text/plain with metrics

### WebSocket Events

**Client → Server:**
- `subscribe` to `{ channels: ["orderbook", "trades", "orders"] }`

**Server → Client:**
- `orderbook_delta`: `{ bids: [...], asks: [...] }`
- `trade`: `{ trade_id, price, quantity, ... }`
- `order_update`: `{ order_id, status, filled_quantity }`

## 8. Observability

### Metrics (Prometheus)

**Counters:**
- `orders_received_total{type, side, instrument}`
- `orders_matched_total{instrument}`
- `orders_rejected_total{reason}`
- `trades_total{instrument}`

**Histograms:**
- `order_latency_seconds` (time from submission to acceptance)
- `matching_latency_seconds` (time to match an order)

**Gauges:**
- `orderbook_depth{side, instrument}` (total quantity at all price levels)
- `orders_in_queue` (pending orders in matching queue)

### Logging

**Important Events:**
- Order submitted (info)
- Order matched → trades generated (info)
- Order cancelled (info)
- Order rejected (warn)
- Database errors (error)
- Matching engine errors (error)

**Log Format:** JSON structured logs
```json
{
  "timestamp": "2025-11-05T12:34:56.789Z",
  "level": "info",
  "message": "Order matched",
  "order_id": "uuid",
  "trades": 2,
  "filled_quantity": 0.5
}
```

## 9. Validation & Rate Limiting

### Input Validation

- `client_id`: non-empty string
- `instrument`: must be "BTC-USD" (single instrument)
- `side`: "buy" | "sell"
- `type`: "limit" | "market"
- `price`: positive number (for limit orders), integer representation
- `quantity`: positive number, max precision 8 decimals

### Rate Limiting

**Algorithm:** Token bucket per client_id
- Default: 100 requests/second per client
- Burst: 200 requests
- In-memory limiter (no distributed state for single-node)

**Response:** `429 Too Many Requests` if exceeded

## 10. Scalability Considerations (Future)

### Multi-Instrument Support
- Partition matching workers by instrument
- Each instrument has dedicated queue and orderbook
- Route orders to correct worker based on instrument

### Multi-Node Deployment
- Externalize matching queue to Redis Streams or Kafka
- Shared MongoDB cluster (replica set)
- Load balancer distributes HTTP traffic
- WebSocket sticky sessions or Redis pub/sub for broadcasting

### Performance Optimizations
- In-memory orderbook with efficient data structures (Red-Black Tree or sorted arrays)
- Batch DB writes (trade records)
- Read replicas for GET endpoints
- Caching layer for frequently accessed data

## 11. Testing Strategy

### Unit Tests
- Matching engine: price-time priority, partial fills, market orders
- Order validation logic
- Idempotency key handling

### Integration Tests
- Full API flows: submit → match → query
- Concurrent order submissions
- WebSocket event delivery

### Load Tests
- Node.js script with `fetch` to submit orders concurrently
- Target: 2,000 orders/sec sustained
- Measure: latency percentiles (p50, p95, p99)

### Fixtures
- Script to generate 100k limit orders across price range
- Burst market orders to trigger matching
- Reproducible test data

## 12. Technology Choices Summary

| Component | Technology | Justification |
|-----------|-----------|---------------|
| Backend | Node.js + Express | Event-driven, non-blocking I/O, great for WebSocket |
| Database | MongoDB | Flexible schema, fast writes, transactions, TTL indexes |
| Frontend | React + Vite | Fast dev experience, component-based UI |
| Styling | Tailwind CSS | Rapid prototyping, utility-first |
| WebSocket | `ws` library | Lightweight, standard WebSocket protocol |
| Metrics | `prom-client` | Standard Prometheus integration |
| Testing | Jest + Supertest | Popular, well-documented |
| Load Testing | Node.js + fetch | Cross-platform, no extra tools |

## 13. Tradeoffs & Design Decisions

### Single-Threaded Matching vs. Multi-Threaded
- **Chosen:** Single-threaded per instrument
- **Pro:** Simple, deterministic, no locking complexity
- **Con:** Limited to single-core CPU for matching
- **Mitigation:** Node.js handles I/O concurrency well; matching is CPU-light

### MongoDB vs. Postgres
- **Chosen:** MongoDB (per user requirement)
- **Pro:** Flexible schema, fast writes, built-in TTL, good for document-oriented data
- **Con:** Less mature transaction support than Postgres, eventual consistency in some configs
- **Mitigation:** Use transactions, write concern majority

### In-Memory Queue vs. External Queue (Kafka/Redis)
- **Chosen:** In-memory queue
- **Pro:** Simple, no external dependencies, low latency
- **Con:** Orders lost if process crashes before matching
- **Mitigation:** Persist orders to DB before queueing; recovery rebuilds state

### Price Representation: Float vs. Integer
- **Chosen:** Integer (multiply by 1e6)
- **Pro:** No floating-point precision errors
- **Con:** Slightly more complex conversions
- **Mitigation:** Helper functions for conversion

### WebSocket Library: `ws` vs. `socket.io`
- **Chosen:** `ws`
- **Pro:** Lightweight, standard protocol, less overhead
- **Con:** No automatic reconnection, no room/namespace abstractions
- **Mitigation:** Client implements reconnection logic

---

**Document Version:** 1.0  
**Last Updated:** 2025-11-05  
**Author:** Exchange Matching Engine Team
