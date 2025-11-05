import { useState, useEffect, useRef, useCallback } from 'react';

const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:3000/ws';

export function useWebSocket() {
  const [connected, setConnected] = useState(false);
  const [orderbook, setOrderbook] = useState(null);
  const [trades, setTrades] = useState([]);
  const [orderUpdates, setOrderUpdates] = useState([]);
  const ws = useRef(null);
  const reconnectTimeout = useRef(null);

  const connect = useCallback(() => {
    try {
      console.log('[WS] Attempting to connect to:', WS_URL);
      ws.current = new WebSocket(WS_URL);

      ws.current.onopen = () => {
        console.log('[WS] Connected successfully!');
        setConnected(true);

        // Subscribe to all channels
        const subscribeMsg = {
          type: 'subscribe',
          channels: ['orderbook', 'trades', 'orders'],
        };
        console.log('[WS] Sending subscription:', subscribeMsg);
        ws.current.send(JSON.stringify(subscribeMsg));
      };

      ws.current.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);

          switch (message.type) {
            case 'orderbook_delta':
              setOrderbook(message.data);
              break;

            case 'trade':
              setTrades((prev) => [message.data, ...prev].slice(0, 50));
              break;

            case 'order_update':
              setOrderUpdates((prev) => [message.data, ...prev].slice(0, 20));
              break;

            case 'connected':
            case 'subscribed':
              console.log('WebSocket:', message);
              break;

            default:
              console.log('Unknown message type:', message.type);
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      ws.current.onerror = (error) => {
        console.error('[WS] Error:', error);
      };

      ws.current.onclose = (event) => {
        console.log('[WS] Disconnected. Code:', event.code, 'Reason:', event.reason);
        setConnected(false);

        // Attempt to reconnect after 3 seconds
        reconnectTimeout.current = setTimeout(() => {
          console.log('[WS] Attempting to reconnect...');
          connect();
        }, 3000);
      };
    } catch (error) {
      console.error('[WS] Error connecting to WebSocket:', error);
    }
  }, []);

  useEffect(() => {
    connect();

    return () => {
      if (reconnectTimeout.current) {
        clearTimeout(reconnectTimeout.current);
      }
      if (ws.current && ws.current.readyState === WebSocket.OPEN) {
        ws.current.close();
      }
    };
  }, [connect]);

  return {
    connected,
    orderbook,
    trades,
    orderUpdates,
  };
}
