# 🎯 COMPLETE DEMO SEQUENCES - Exchange Platform
## All data cleared! Database is empty. Ready for demo.

---

## 📋 **SEQUENCE 1: GREEN BIDS (Buy Orders)**
### Purpose: Populate the BUY side of the order book

```bash
# Step 1: Alice places buy at $49,000
curl -X POST http://localhost:3000/orders -H "Content-Type: application/json" -d "{\"client_id\":\"alice\",\"side\":\"buy\",\"type\":\"limit\",\"price\":49000,\"quantity\":0.5}"

# Step 2: Bob places buy at $48,500
curl -X POST http://localhost:3000/orders -H "Content-Type: application/json" -d "{\"client_id\":\"bob\",\"side\":\"buy\",\"type\":\"limit\",\"price\":48500,\"quantity\":0.3}"

# Step 3: Charlie places buy at $48,000
curl -X POST http://localhost:3000/orders -H "Content-Type: application/json" -d "{\"client_id\":\"charlie\",\"side\":\"buy\",\"type\":\"limit\",\"price\":48000,\"quantity\":1.0}"
```

**Expected Result:**
- ✅ Order Book shows 3 GREEN BIDS (descending: $49k, $48.5k, $48k)
- ✅ Order Updates shows 3 new orders
- ❌ No trades yet (no matching orders)

---

## 📋 **SEQUENCE 2: RED ASKS (Sell Orders)**
### Purpose: Populate the SELL side of the order book

```bash
# Step 4: Dave places sell at $51,000
curl -X POST http://localhost:3000/orders -H "Content-Type: application/json" -d "{\"client_id\":\"dave\",\"side\":\"sell\",\"type\":\"limit\",\"price\":51000,\"quantity\":0.4}"

# Step 5: Eve places sell at $51,500
curl -X POST http://localhost:3000/orders -H "Content-Type: application/json" -d "{\"client_id\":\"eve\",\"side\":\"sell\",\"type\":\"limit\",\"price\":51500,\"quantity\":0.6}"

# Step 6: Frank places sell at $52,000
curl -X POST http://localhost:3000/orders -H "Content-Type: application/json" -d "{\"client_id\":\"frank\",\"side\":\"sell\",\"type\":\"limit\",\"price\":52000,\"quantity\":0.8}"
```

**Expected Result:**
- ✅ Order Book shows 3 RED ASKS (ascending: $51k, $51.5k, $52k)
- ✅ Order Book shows 3 GREEN BIDS (descending: $49k, $48.5k, $48k)
- ✅ Order Updates shows 6 total orders
- ❌ Still no trades (prices don't cross)
- ✅ Spread displayed: $51,000 - $49,000 = $2,000

---

## 📋 **SEQUENCE 3: CREATE TRADES (Matching Orders)**
### Purpose: Execute trades and see BUYER → SELLER display

```bash
# Step 7: Grace buys aggressively at $51,500 - Will match Dave's $51k sell
curl -X POST http://localhost:3000/orders -H "Content-Type: application/json" -d "{\"client_id\":\"grace\",\"side\":\"buy\",\"type\":\"limit\",\"price\":51500,\"quantity\":0.4}"
```

**Expected Result:**
- ✅ **TRADE CREATED!** Grace (buyer 🔵) → Dave (seller 🔴)
- ✅ Trades Feed shows: "grace → dave @ $51,000 × 0.4 BTC"
- ✅ Order Book: Dave's sell order REMOVED (fully filled)
- ✅ Order Updates shows Grace's order as "FILLED"
- ✅ Order Updates shows Dave's order updated to "FILLED"
- ✅ Order book now shows 2 red asks ($51.5k, $52k) and 3 green bids

---

## 📋 **SEQUENCE 4: PARTIAL FILL**
### Purpose: Show partial order execution

```bash
# Step 8: Henry places large buy - Will partially match Eve's sell
curl -X POST http://localhost:3000/orders -H "Content-Type: application/json" -d "{\"client_id\":\"henry\",\"side\":\"buy\",\"type\":\"limit\",\"price\":51500,\"quantity\":0.3}"
```

**Expected Result:**
- ✅ **PARTIAL TRADE!** Henry (buyer 🔵) → Eve (seller 🔴)
- ✅ Trades Feed shows: "henry → eve @ $51,500 × 0.3 BTC"
- ✅ Order Updates shows Henry as "FILLED"
- ✅ Order Updates shows Eve as "PARTIALLY_FILLED"
- ✅ Order Book: Eve's sell reduced from 0.6 to 0.3 BTC remaining
- ✅ Order book shows 2 red asks ($51.5k with 0.3 BTC, $52k) and 3 green bids

---

## 📋 **SEQUENCE 5: MARKET ORDER (Instant Execution)**
### Purpose: Demonstrate market order taking best available price

```bash
# Step 9: Ivan uses MARKET order to buy - Will match at $51,500 (Eve's remaining)
curl -X POST http://localhost:3000/orders -H "Content-Type: application/json" -d "{\"client_id\":\"ivan\",\"side\":\"buy\",\"type\":\"market\",\"quantity\":0.2}"
```

**Expected Result:**
- ✅ **INSTANT TRADE!** Ivan (buyer 🔵) → Eve (seller 🔴)
- ✅ Trades Feed shows: "ivan → eve @ $51,500 × 0.2 BTC"
- ✅ Order Updates shows Ivan as "FILLED"
- ✅ Order Updates shows Eve as "PARTIALLY_FILLED" (now 0.1 BTC remaining)
- ✅ Order Book: Eve's sell reduced to 0.1 BTC at $51,500
- ✅ No new order added to book (market orders don't rest)

---

## 📋 **SEQUENCE 6: OPPOSITE SIDE MARKET ORDER**
### Purpose: Show selling with market order

```bash
# Step 10: Julia sells with MARKET order - Will match Alice's $49k buy
curl -X POST http://localhost:3000/orders -H "Content-Type: application/json" -d "{\"client_id\":\"julia\",\"side\":\"sell\",\"type\":\"market\",\"quantity\":0.2}"
```

**Expected Result:**
- ✅ **INSTANT TRADE!** Alice (buyer 🔵) → Julia (seller 🔴)
- ✅ Trades Feed shows: "alice → julia @ $49,000 × 0.2 BTC"
- ✅ Order Updates shows Julia as "FILLED"
- ✅ Order Updates shows Alice as "PARTIALLY_FILLED"
- ✅ Order Book: Alice's buy reduced from 0.5 to 0.3 BTC at $49,000
- ✅ Bids now show: $49k (0.3 BTC), $48.5k (0.3 BTC), $48k (1.0 BTC)

---

## 📋 **SEQUENCE 7: RAPID FIRE TRADES**
### Purpose: Stress test WebSocket real-time updates

```bash
# Execute these quickly one after another:

curl -X POST http://localhost:3000/orders -H "Content-Type: application/json" -d "{\"client_id\":\"kate\",\"side\":\"buy\",\"type\":\"limit\",\"price\":52000,\"quantity\":0.5}"

curl -X POST http://localhost:3000/orders -H "Content-Type: application/json" -d "{\"client_id\":\"leo\",\"side\":\"sell\",\"type\":\"limit\",\"price\":48000,\"quantity\":0.5}"

curl -X POST http://localhost:3000/orders -H "Content-Type: application/json" -d "{\"client_id\":\"maria\",\"side\":\"buy\",\"type\":\"market\",\"quantity\":0.3}"
```

**Expected Result:**
- ✅ Multiple trades execute rapidly
- ✅ Order Book updates in REAL-TIME (no refresh needed!)
- ✅ Trades Feed updates instantly
- ✅ Order Updates scrolls with new entries
- ✅ WebSocket proves it's working - NO PAGE REFRESH NEEDED!

---

## 🎬 **COMPLETE DEMO SCRIPT (Copy-Paste All)**

```bash
# Clear view and prepare
echo "🚀 Starting Exchange Demo..."
sleep 2

# PHASE 1: GREEN BIDS
echo "📗 Phase 1: Adding GREEN BIDS (Buy Orders)..."
curl -X POST http://localhost:3000/orders -H "Content-Type: application/json" -d "{\"client_id\":\"alice\",\"side\":\"buy\",\"type\":\"limit\",\"price\":49000,\"quantity\":0.5}"
sleep 1
curl -X POST http://localhost:3000/orders -H "Content-Type: application/json" -d "{\"client_id\":\"bob\",\"side\":\"buy\",\"type\":\"limit\",\"price\":48500,\"quantity\":0.3}"
sleep 1
curl -X POST http://localhost:3000/orders -H "Content-Type: application/json" -d "{\"client_id\":\"charlie\",\"side\":\"buy\",\"type\":\"limit\",\"price\":48000,\"quantity\":1.0}"
sleep 2

# PHASE 2: RED ASKS
echo "📕 Phase 2: Adding RED ASKS (Sell Orders)..."
curl -X POST http://localhost:3000/orders -H "Content-Type: application/json" -d "{\"client_id\":\"dave\",\"side\":\"sell\",\"type\":\"limit\",\"price\":51000,\"quantity\":0.4}"
sleep 1
curl -X POST http://localhost:3000/orders -H "Content-Type: application/json" -d "{\"client_id\":\"eve\",\"side\":\"sell\",\"type\":\"limit\",\"price\":51500,\"quantity\":0.6}"
sleep 1
curl -X POST http://localhost:3000/orders -H "Content-Type: application/json" -d "{\"client_id\":\"frank\",\"side\":\"sell\",\"type\":\"limit\",\"price\":52000,\"quantity\":0.8}"
sleep 2

# PHASE 3: CREATE TRADES
echo "💥 Phase 3: Creating TRADES..."
curl -X POST http://localhost:3000/orders -H "Content-Type: application/json" -d "{\"client_id\":\"grace\",\"side\":\"buy\",\"type\":\"limit\",\"price\":51500,\"quantity\":0.4}"
sleep 2
curl -X POST http://localhost:3000/orders -H "Content-Type: application/json" -d "{\"client_id\":\"henry\",\"side\":\"buy\",\"type\":\"limit\",\"price\":51500,\"quantity\":0.3}"
sleep 2

# PHASE 4: MARKET ORDERS
echo "⚡ Phase 4: MARKET Orders (Instant Execution)..."
curl -X POST http://localhost:3000/orders -H "Content-Type: application/json" -d "{\"client_id\":\"ivan\",\"side\":\"buy\",\"type\":\"market\",\"quantity\":0.2}"
sleep 2
curl -X POST http://localhost:3000/orders -H "Content-Type: application/json" -d "{\"client_id\":\"julia\",\"side\":\"sell\",\"type\":\"market\",\"quantity\":0.2}"
sleep 2

# PHASE 5: RAPID FIRE
echo "🔥 Phase 5: RAPID FIRE (Watch real-time updates!)..."
curl -X POST http://localhost:3000/orders -H "Content-Type: application/json" -d "{\"client_id\":\"kate\",\"side\":\"buy\",\"type\":\"limit\",\"price\":52000,\"quantity\":0.5}"
curl -X POST http://localhost:3000/orders -H "Content-Type: application/json" -d "{\"client_id\":\"leo\",\"side\":\"sell\",\"type\":\"limit\",\"price\":48000,\"quantity\":0.5}"
curl -X POST http://localhost:3000/orders -H "Content-Type: application/json" -d "{\"client_id\":\"maria\",\"side\":\"buy\",\"type\":\"market\",\"quantity\":0.3}"

echo "✅ Demo Complete! Check your browser - everything updated in REAL-TIME!"
```

---

## ✅ **VERIFICATION CHECKLIST**

After running sequences, verify:

1. **Order Book:**
   - [ ] Shows GREEN bids on left (buy orders)
   - [ ] Shows RED asks on right (sell orders)
   - [ ] Orders sorted correctly (bids high→low, asks low→high)
   - [ ] Quantities update when partially filled
   - [ ] Spread calculation displayed

2. **Trades Feed:**
   - [ ] Shows buyer → seller with colored indicators
   - [ ] Shows 🔵 for buyers, 🔴 for sellers
   - [ ] Displays price, quantity, and timestamp
   - [ ] Most recent trade appears at top
   - [ ] Scrollable if more than 10 trades

3. **Order Updates:**
   - [ ] Shows all order submissions
   - [ ] Status colors correct (green=filled, yellow=partial, blue=open)
   - [ ] Filled quantity updates in real-time
   - [ ] Most recent update at top

4. **WebSocket Real-Time:**
   - [ ] Green "Connected" indicator in header
   - [ ] Updates appear WITHOUT page refresh
   - [ ] Multiple rapid orders all appear instantly
   - [ ] No lag or delay in updates

---

## 🎥 **VIDEO DEMO TIPS**

1. **Start**: Show empty order book, trades, and order updates
2. **Phase 1**: Add bids one by one, watch order book populate
3. **Phase 2**: Add asks, watch spread appear
4. **Phase 3**: Create first trade, highlight buyer→seller display
5. **Phase 4**: Show partial fills updating quantities
6. **Phase 5**: Rapid fire to prove real-time updates work
7. **End**: Highlight that NO refresh was needed!

---

## 🐛 **TROUBLESHOOTING**

**If updates don't appear in real-time:**
- Check green "Connected" indicator in header
- Open browser console (F12) and check for WebSocket logs
- Backend should show "total_clients: 1" or more
- Refresh page if disconnected

**If colors don't show:**
- Bids should be GREEN/blue text
- Asks should be RED text
- Buyer icon: 🔵
- Seller icon: 🔴

---

## 📊 **CURRENT STATUS**
- ✅ Database: CLEARED (0 orders, 0 trades)
- ✅ Backend: RUNNING on port 3000
- ✅ Frontend: RUNNING on port 5173
- ✅ WebSocket: CONNECTED (2 clients)
- ✅ Real-time updates: WORKING

**You're ready to go! Open http://localhost:5173/ and start the demo! 🚀**
