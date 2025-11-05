import { useState, useEffect } from 'react';
import { useWebSocket } from './hooks/useWebSocket';
import { api } from './services/api';
import OrderBook from './components/OrderBook';
import TradesFeed from './components/TradesFeed';
import OrderForm from './components/OrderForm';
import OrderStatus from './components/OrderStatus';
import './index.css';

function App() {
  const { connected, orderbook, trades, orderUpdates } = useWebSocket();
  const [initialOrderbook, setInitialOrderbook] = useState(null);
  const [initialTrades, setInitialTrades] = useState([]);
  const [health, setHealth] = useState(null);

  // Fetch initial data
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const [orderbookData, tradesData, healthData] = await Promise.all([
          api.getOrderbook(20),
          api.getTrades(50),
          api.health(),
        ]);

        setInitialOrderbook(orderbookData);
        setInitialTrades(tradesData);
        setHealth(healthData);
      } catch (error) {
        console.error('Error fetching initial data:', error);
      }
    };

    fetchInitialData();
  }, []);

  // Use WebSocket data if available, otherwise use initial data
  const displayOrderbook = orderbook || initialOrderbook;
  const displayTrades = trades.length > 0 ? trades : initialTrades;

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold">Exchange Trading Platform</h1>
              <p className="text-sm text-gray-400">Real-time order matching engine</p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div
                  className={`w-3 h-3 rounded-full ${
                    connected ? 'bg-green-500' : 'bg-red-500'
                  } animate-pulse`}
                />
                <span className="text-sm text-gray-400">
                  {connected ? 'Connected' : 'Disconnected'}
                </span>
              </div>
              {health && (
                <div className="text-sm text-gray-400">
                  MongoDB: {health.mongodb === 'connected' ? '✅' : '❌'}
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Order Form */}
          <div className="space-y-6">
            <OrderForm />
            <OrderStatus orderUpdates={orderUpdates} />
          </div>

          {/* Middle Column - Order Book */}
          <div>
            <OrderBook orderbook={displayOrderbook} />
          </div>

          {/* Right Column - Trades Feed */}
          <div>
            <TradesFeed trades={displayTrades} />
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-gray-800 border-t border-gray-700 mt-12">
        <div className="container mx-auto px-4 py-6">
          <div className="text-center text-sm text-gray-400">
            <p>Exchange Matching Engine • BTC-USD Trading</p>
            <p className="mt-1">
              Built with Node.js, Express, MongoDB, React, Vite & Tailwind CSS
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
