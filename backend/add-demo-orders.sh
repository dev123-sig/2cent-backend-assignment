#!/bin/bash

echo "Adding demo orders to populate the orderbook..."

# BUY Orders (Bids)
echo "Adding BUY orders..."
curl -s -X POST http://localhost:3000/orders -H "Content-Type: application/json" -d '{"idempotency_key":"demo-alice-1","client_id":"trader-alice","side":"buy","type":"limit","price":49000,"quantity":0.5}' && echo ""

curl -s -X POST http://localhost:3000/orders -H "Content-Type: application/json" -d '{"idempotency_key":"demo-bob-1","client_id":"trader-bob","side":"buy","type":"limit","price":48500,"quantity":1.0}' && echo ""

curl -s -X POST http://localhost:3000/orders -H "Content-Type: application/json" -d '{"idempotency_key":"demo-charlie-1","client_id":"trader-charlie","side":"buy","type":"limit","price":48000,"quantity":0.75}' && echo ""

# SELL Orders (Asks)
echo "Adding SELL orders..."
curl -s -X POST http://localhost:3000/orders -H "Content-Type: application/json" -d '{"idempotency_key":"demo-dave-1","client_id":"trader-dave","side":"sell","type":"limit","price":51000,"quantity":0.5}' && echo ""

curl -s -X POST http://localhost:3000/orders -H "Content-Type: application/json" -d '{"idempotency_key":"demo-eve-1","client_id":"trader-eve","side":"sell","type":"limit","price":51500,"quantity":0.8}' && echo ""

curl -s -X POST http://localhost:3000/orders -H "Content-Type: application/json" -d '{"idempotency_key":"demo-frank-1","client_id":"trader-frank","side":"sell","type":"limit","price":52000,"quantity":1.2}' && echo ""

echo "Demo orders added successfully!"
echo "Spread: \$51000 (best ask) - \$49000 (best bid) = \$2000"
