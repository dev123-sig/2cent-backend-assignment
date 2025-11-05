# Exchange Matching Engine

A scalable, real-time cryptocurrency exchange matching engine built with Node.js, Express, MongoDB, and React. Features include order matching with price-time priority, WebSocket streaming, Prometheus metrics, and comprehensive testing.

## 🚀 Features

- **Real-time Order Matching**: Limit and market orders with price-time priority
- **WebSocket Streaming**: Live orderbook updates and trade feed
- **Idempotency**: Duplicate order prevention with idempotency keys
- **Observability**: Prometheus metrics and structured logging
- **Rate Limiting**: Per-client rate limiting
- **Persistence**: MongoDB with transaction support
- **Recovery**: Automatic orderbook reconstruction on startup
- **Modern UI**: React + Vite + Tailwind CSS frontend

## 📋 Prerequisites

- **Node.js**: v18+ (for native fetch support)
- **MongoDB**: v6+ (for transactions)
- **npm** or **yarn**

## 🏗️ Project Structure

```
2cents/
├── backend/                 # Express API server
│   ├── src/
│   │   ├── config/         # Database configuration
│   │   ├── models/         # Mongoose schemas
│   │   ├── services/       # Business logic
│   │   ├── routes/         # API endpoints
│   │   ├── middleware/     # Validation, rate limiting
│   │   ├── metrics/        # Prometheus metrics
│   │   └── utils/          # Logger, helpers
│   ├── fixtures/           # Test data generator
│   ├── tests/              # Unit & load tests
│   └── package.json
├── frontend/               # React application
│   ├── src/
│   │   ├── components/    # UI components
│   │   ├── hooks/         # WebSocket hook
│   │   ├── services/      # API client
│   │   └── App.jsx
│   └── package.json
└── DESIGN.md              # Architecture documentation
```

## 🛠️ Installation & Setup

### Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Configure environment (edit .env if needed)
cp .env.example .env

# Make sure MongoDB is running
# Windows: net start MongoDB
# Mac/Linux: sudo systemctl start mongod

# Start the backend
npm run dev
```

Backend will run on **http://localhost:3000**

### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start the frontend
npm run dev
```

Frontend will run on **http://localhost:5173**

## 🎯 Usage

### Web Interface

1. Open http://localhost:5173 in your browser
2. Fill out the order form (client ID, side, type, price, quantity)
3. Click "Place Order" to submit
4. Watch real-time updates in the orderbook and trades feed

### API Endpoints

#### Submit Order
```bash
curl -X POST http://localhost:3000/orders \
  -H "Content-Type: application/json" \
  -d '{
    "idempotency_key": "unique-key-123",
    "client_id": "client-A",
    "instrument": "BTC-USD",
    "side": "buy",
    "type": "limit",
    "price": 70000,
    "quantity": 0.5
  }'
```

#### Get Orderbook
```bash
curl http://localhost:3000/orderbook?levels=20
```

#### Get Recent Trades
```bash
curl http://localhost:3000/trades?limit=50
```

#### Get Order Details
```bash
curl http://localhost:3000/orders/{order_id}
```

#### Cancel Order
```bash
curl -X POST http://localhost:3000/orders/{order_id}/cancel
```

#### Health Check
```bash
curl http://localhost:3000/healthz
```

#### Metrics
```bash
curl http://localhost:3000/metrics
```

### WebSocket Connection

```javascript
const ws = new WebSocket('ws://localhost:3000/ws');

ws.onopen = () => {
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

## 🧪 Testing

### Unit Tests

```bash
cd backend
npm test
```

### Generate Test Fixtures

```bash
cd backend
npm run fixtures
```

This generates 100,000 realistic orders in `fixtures/orders.json`.

### Load Testing

```bash
cd backend
npm run load-test [duration_seconds] [concurrency]

# Example: 60 second test with 50 concurrent clients
npm run load-test 60 50
```

**Expected Performance:**
- Target: 2,000 orders/sec sustained
- Median latency: <100ms
- Error rate: <1%

## 📊 Monitoring & Observability

### Prometheus Metrics

Available at http://localhost:3000/metrics

**Key Metrics:**
- `orders_received_total` - Total orders submitted
- `orders_matched_total` - Total orders matched
- `orders_rejected_total` - Total orders rejected
- `trades_total` - Total trades executed
- `order_latency_seconds` - Order submission latency histogram
- `matching_latency_seconds` - Matching engine latency histogram
- `orderbook_depth` - Current orderbook depth by side

### Logs

Structured JSON logs are written to console. In production, pipe to a log aggregation service.

**Log Levels:**
- `info`: Normal operations (order submitted, matched, cancelled)
- `warn`: Rate limits, retries, recoverable errors
- `error`: Database failures, matching engine errors

## 🔧 Configuration

### Backend Environment Variables (.env)

```bash
PORT=3000
MONGODB_URI=mongodb://localhost:27017/exchange
NODE_ENV=development
LOG_LEVEL=info
RATE_LIMIT_WINDOW_MS=1000
RATE_LIMIT_MAX_REQUESTS=100
IDEMPOTENCY_TTL_HOURS=24
SNAPSHOT_INTERVAL_MS=300000
```

### Frontend Environment Variables

Create `frontend/.env`:

```bash
VITE_API_URL=http://localhost:3000
VITE_WS_URL=ws://localhost:3000/ws
```

## 🏛️ Architecture

### Components

1. **API Layer**: Express REST endpoints + WebSocket server
2. **Matching Engine**: Single-threaded worker for BTC-USD
3. **Order Service**: Validation, idempotency, persistence
4. **Broadcaster**: WebSocket event distribution
5. **Persistence**: MongoDB with transactions

### Data Flow

```
Client → HTTP POST /orders
       → Validate & check idempotency
       → Persist order to DB
       → Push to matching queue
       → Respond 202 Accepted
       
Matching Worker (async loop)
       → Pop order from queue
       → Match against in-memory book
       → Generate trades
       → Update DB (transaction)
       → Broadcast events via WebSocket
```

### Recovery Strategy

On startup:
1. Connect to MongoDB
2. Query all `open` and `partially_filled` orders
3. Rebuild in-memory orderbook in timestamp order
4. Resume matching

See [DESIGN.md](./DESIGN.md) for detailed architecture.

## 📦 API Examples (Postman/cURL)

### Example 1: Submit Buy Limit Order

```bash
curl -X POST http://localhost:3000/orders \
  -H "Content-Type: application/json" \
  -d '{
    "idempotency_key": "buy-limit-1",
    "client_id": "alice",
    "side": "buy",
    "type": "limit",
    "price": 69500,
    "quantity": 1.5
  }'
```

### Example 2: Submit Market Sell Order

```bash
curl -X POST http://localhost:3000/orders \
  -H "Content-Type: application/json" \
  -d '{
    "idempotency_key": "sell-market-1",
    "client_id": "bob",
    "side": "sell",
    "type": "market",
    "quantity": 0.75
  }'
```

### Example 3: Cancel Order

```bash
curl -X POST http://localhost:3000/orders/abc-123-def/cancel
```

### Example 4: Get Orderbook

```bash
curl http://localhost:3000/orderbook?instrument=BTC-USD&levels=10
```

## 🚀 Production Deployment

### Recommended Setup

1. **Load Balancer**: NGINX or AWS ALB
2. **Backend**: Multiple instances behind load balancer
3. **Database**: MongoDB replica set (3 nodes minimum)
4. **Metrics**: Prometheus + Grafana
5. **Logs**: ELK stack or CloudWatch

### Scaling Considerations

**Single-Node Limitations:**
- One matching engine instance per instrument
- In-memory queue (orders lost if process crashes before matching)
- No horizontal scaling of matching logic

**Multi-Node Scaling:**
- Externalize queue to Redis Streams or Kafka
- Partition instruments across workers
- Use MongoDB replica set for HA
- WebSocket sticky sessions or Redis pub/sub

See [DESIGN.md](./DESIGN.md) section 10 for detailed scaling strategy.

## 🐛 Troubleshooting

### MongoDB Connection Failed

```bash
# Check MongoDB is running
# Windows
net start MongoDB

# Mac/Linux
sudo systemctl status mongod
```

### Port Already in Use

Change `PORT` in `backend/.env` to an available port.

### WebSocket Not Connecting

- Ensure backend is running
- Check `VITE_WS_URL` in frontend environment
- Verify no firewall blocking WebSocket connections

### High Latency in Load Tests

- Increase MongoDB connection pool
- Add indexes to frequently queried fields
- Use MongoDB transactions sparingly
- Consider caching with Redis

## 📚 Additional Documentation

- **[DESIGN.md](./DESIGN.md)**: Detailed architecture and design decisions
- **[LOAD_TEST_REPORT.md](./LOAD_TEST_REPORT.md)**: Load test results and analysis

## 📝 License

MIT License - see LICENSE file for details

## 👥 Contributing

This is a technical assessment project. Not accepting contributions.

## 📧 Support

For questions or issues, please create an issue in the repository.

---

**Built with ❤️ using Node.js, Express, MongoDB, React, Vite, and Tailwind CSS**
