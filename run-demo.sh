#!/bin/bash
# Quick Demo Script - Run individual phases or full demo

echo "🎯 Exchange Platform Demo Script"
echo "================================"
echo ""
echo "Choose a sequence:"
echo "1) GREEN BIDS ONLY (3 buy orders)"
echo "2) RED ASKS ONLY (3 sell orders)"
echo "3) BOTH BIDS & ASKS (full order book)"
echo "4) CREATE TRADES (matching orders)"
echo "5) FULL DEMO (all phases)"
echo ""
read -p "Enter choice (1-5): " choice

case $choice in
  1)
    echo "📗 Adding GREEN BIDS..."
    curl -X POST http://localhost:3000/orders -H "Content-Type: application/json" -d "{\"client_id\":\"alice\",\"side\":\"buy\",\"type\":\"limit\",\"price\":49000,\"quantity\":0.5}"
    echo ""
    sleep 1
    curl -X POST http://localhost:3000/orders -H "Content-Type: application/json" -d "{\"client_id\":\"bob\",\"side\":\"buy\",\"type\":\"limit\",\"price\":48500,\"quantity\":0.3}"
    echo ""
    sleep 1
    curl -X POST http://localhost:3000/orders -H "Content-Type: application/json" -d "{\"client_id\":\"charlie\",\"side\":\"buy\",\"type\":\"limit\",\"price\":48000,\"quantity\":1.0}"
    echo ""
    echo "✅ 3 green bids added!"
    ;;
    
  2)
    echo "📕 Adding RED ASKS..."
    curl -X POST http://localhost:3000/orders -H "Content-Type: application/json" -d "{\"client_id\":\"dave\",\"side\":\"sell\",\"type\":\"limit\",\"price\":51000,\"quantity\":0.4}"
    echo ""
    sleep 1
    curl -X POST http://localhost:3000/orders -H "Content-Type: application/json" -d "{\"client_id\":\"eve\",\"side\":\"sell\",\"type\":\"limit\",\"price\":51500,\"quantity\":0.6}"
    echo ""
    sleep 1
    curl -X POST http://localhost:3000/orders -H "Content-Type: application/json" -d "{\"client_id\":\"frank\",\"side\":\"sell\",\"type\":\"limit\",\"price\":52000,\"quantity\":0.8}"
    echo ""
    echo "✅ 3 red asks added!"
    ;;
    
  3)
    echo "📊 Building full order book..."
    echo "Adding bids..."
    curl -X POST http://localhost:3000/orders -H "Content-Type: application/json" -d "{\"client_id\":\"alice\",\"side\":\"buy\",\"type\":\"limit\",\"price\":49000,\"quantity\":0.5}"
    echo ""
    sleep 1
    curl -X POST http://localhost:3000/orders -H "Content-Type: application/json" -d "{\"client_id\":\"bob\",\"side\":\"buy\",\"type\":\"limit\",\"price\":48500,\"quantity\":0.3}"
    echo ""
    sleep 1
    curl -X POST http://localhost:3000/orders -H "Content-Type: application/json" -d "{\"client_id\":\"charlie\",\"side\":\"buy\",\"type\":\"limit\",\"price\":48000,\"quantity\":1.0}"
    echo ""
    echo "Adding asks..."
    sleep 1
    curl -X POST http://localhost:3000/orders -H "Content-Type: application/json" -d "{\"client_id\":\"dave\",\"side\":\"sell\",\"type\":\"limit\",\"price\":51000,\"quantity\":0.4}"
    echo ""
    sleep 1
    curl -X POST http://localhost:3000/orders -H "Content-Type: application/json" -d "{\"client_id\":\"eve\",\"side\":\"sell\",\"type\":\"limit\",\"price\":51500,\"quantity\":0.6}"
    echo ""
    sleep 1
    curl -X POST http://localhost:3000/orders -H "Content-Type: application/json" -d "{\"client_id\":\"frank\",\"side\":\"sell\",\"type\":\"limit\",\"price\":52000,\"quantity\":0.8}"
    echo ""
    echo "✅ Full order book created with $2,000 spread!"
    ;;
    
  4)
    echo "💥 Creating TRADES..."
    curl -X POST http://localhost:3000/orders -H "Content-Type: application/json" -d "{\"client_id\":\"grace\",\"side\":\"buy\",\"type\":\"limit\",\"price\":51500,\"quantity\":0.4}"
    echo ""
    echo "Trade 1 executed!"
    sleep 2
    curl -X POST http://localhost:3000/orders -H "Content-Type: application/json" -d "{\"client_id\":\"henry\",\"side\":\"buy\",\"type\":\"limit\",\"price\":51500,\"quantity\":0.3}"
    echo ""
    echo "Trade 2 executed (partial fill)!"
    sleep 2
    curl -X POST http://localhost:3000/orders -H "Content-Type: application/json" -d "{\"client_id\":\"ivan\",\"side\":\"buy\",\"type\":\"market\",\"quantity\":0.2}"
    echo ""
    echo "Market order executed!"
    echo "✅ Watch your trades feed update in real-time!"
    ;;
    
  5)
    echo "🚀 FULL DEMO - All phases..."
    echo ""
    
    echo "📗 Phase 1: GREEN BIDS..."
    curl -s -X POST http://localhost:3000/orders -H "Content-Type: application/json" -d "{\"client_id\":\"alice\",\"side\":\"buy\",\"type\":\"limit\",\"price\":49000,\"quantity\":0.5}" > /dev/null
    sleep 1
    curl -s -X POST http://localhost:3000/orders -H "Content-Type: application/json" -d "{\"client_id\":\"bob\",\"side\":\"buy\",\"type\":\"limit\",\"price\":48500,\"quantity\":0.3}" > /dev/null
    sleep 1
    curl -s -X POST http://localhost:3000/orders -H "Content-Type: application/json" -d "{\"client_id\":\"charlie\",\"side\":\"buy\",\"type\":\"limit\",\"price\":48000,\"quantity\":1.0}" > /dev/null
    echo "✅ Bids added"
    sleep 2
    
    echo "📕 Phase 2: RED ASKS..."
    curl -s -X POST http://localhost:3000/orders -H "Content-Type: application/json" -d "{\"client_id\":\"dave\",\"side\":\"sell\",\"type\":\"limit\",\"price\":51000,\"quantity\":0.4}" > /dev/null
    sleep 1
    curl -s -X POST http://localhost:3000/orders -H "Content-Type: application/json" -d "{\"client_id\":\"eve\",\"side\":\"sell\",\"type\":\"limit\",\"price\":51500,\"quantity\":0.6}" > /dev/null
    sleep 1
    curl -s -X POST http://localhost:3000/orders -H "Content-Type: application/json" -d "{\"client_id\":\"frank\",\"side\":\"sell\",\"type\":\"limit\",\"price\":52000,\"quantity\":0.8}" > /dev/null
    echo "✅ Asks added"
    sleep 2
    
    echo "💥 Phase 3: CREATING TRADES..."
    curl -s -X POST http://localhost:3000/orders -H "Content-Type: application/json" -d "{\"client_id\":\"grace\",\"side\":\"buy\",\"type\":\"limit\",\"price\":51500,\"quantity\":0.4}" > /dev/null
    echo "✅ Trade 1"
    sleep 2
    curl -s -X POST http://localhost:3000/orders -H "Content-Type: application/json" -d "{\"client_id\":\"henry\",\"side\":\"buy\",\"type\":\"limit\",\"price\":51500,\"quantity\":0.3}" > /dev/null
    echo "✅ Trade 2"
    sleep 2
    
    echo "⚡ Phase 4: MARKET ORDERS..."
    curl -s -X POST http://localhost:3000/orders -H "Content-Type: application/json" -d "{\"client_id\":\"ivan\",\"side\":\"buy\",\"type\":\"market\",\"quantity\":0.2}" > /dev/null
    echo "✅ Buy market"
    sleep 2
    curl -s -X POST http://localhost:3000/orders -H "Content-Type: application/json" -d "{\"client_id\":\"julia\",\"side\":\"sell\",\"type\":\"market\",\"quantity\":0.2}" > /dev/null
    echo "✅ Sell market"
    sleep 2
    
    echo "🔥 Phase 5: RAPID FIRE..."
    curl -s -X POST http://localhost:3000/orders -H "Content-Type: application/json" -d "{\"client_id\":\"kate\",\"side\":\"buy\",\"type\":\"limit\",\"price\":52000,\"quantity\":0.5}" > /dev/null
    curl -s -X POST http://localhost:3000/orders -H "Content-Type: application/json" -d "{\"client_id\":\"leo\",\"side\":\"sell\",\"type\":\"limit\",\"price\":48000,\"quantity\":0.5}" > /dev/null
    curl -s -X POST http://localhost:3000/orders -H "Content-Type: application/json" -d "{\"client_id\":\"maria\",\"side\":\"buy\",\"type\":\"market\",\"quantity\":0.3}" > /dev/null
    echo "✅ Rapid trades executed!"
    
    echo ""
    echo "🎉 FULL DEMO COMPLETE!"
    echo "Check your browser - everything updated in REAL-TIME!"
    ;;
    
  *)
    echo "Invalid choice. Please run again and select 1-5."
    ;;
esac
