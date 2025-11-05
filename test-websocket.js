import WebSocket from 'ws';

const ws = new WebSocket('ws://localhost:3000/ws');

ws.on('open', () => {
  console.log('✅ Connected to WebSocket');
  
  // Subscribe to all channels
  ws.send(JSON.stringify({
    type: 'subscribe',
    channels: ['orderbook', 'trades', 'orders']
  }));
  
  console.log('📡 Subscribed to channels');
});

ws.on('message', (data) => {
  const message = JSON.parse(data.toString());
  console.log('📨 Received:', JSON.stringify(message, null, 2));
});

ws.on('error', (error) => {
  console.error('❌ WebSocket error:', error);
});

ws.on('close', () => {
  console.log('🔌 Disconnected from WebSocket');
});

// Keep the script running
console.log('🚀 WebSocket test client started...');
console.log('   Listening for real-time updates...');
console.log('   Press Ctrl+C to exit');
