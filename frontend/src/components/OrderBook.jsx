export default function OrderBook({ orderbook }) {
  if (!orderbook) {
    return (
      <div className="card">
        <h2 className="text-xl font-bold mb-4">Order Book</h2>
        <p className="text-gray-400">Loading orderbook...</p>
      </div>
    );
  }

  const formatPrice = (price) => {
    // Format with commas for readability: 70000 -> 70,000.00
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(price);
  };
  
  const formatQuantity = (qty) => {
    // Show up to 8 decimals, strip trailing zeros
    return parseFloat(qty.toFixed(8)).toString();
  };

  return (
    <div className="card">
      <h2 className="text-xl font-bold mb-4">Order Book - {orderbook.instrument}</h2>

      <div className="grid grid-cols-2 gap-6">
        {/* Asks (Sell Orders) */}
        <div className="overflow-x-auto">
          <h3 className="text-sm font-semibold text-sell mb-2">Asks (Sell)</h3>
          <div className="space-y-1">
            <div className="grid grid-cols-3 gap-3 text-xs text-gray-400 font-medium mb-1 pb-1 border-b border-gray-700">
              <div className="text-left">Price (USD)</div>
              <div className="text-right">Qty (BTC)</div>
              <div className="text-right">#</div>
            </div>
            {orderbook.asks && orderbook.asks.length > 0 ? (
              [...orderbook.asks].reverse().map((level, idx) => (
                <div
                  key={idx}
                  className="grid grid-cols-3 gap-3 text-sm hover:bg-gray-700 p-1 rounded transition-colors"
                >
                  <div className="text-sell font-mono text-left overflow-hidden text-ellipsis whitespace-nowrap" title={`$${formatPrice(level.price)}`}>
                    ${formatPrice(level.price)}
                  </div>
                  <div className="text-right font-mono text-gray-300 overflow-hidden text-ellipsis whitespace-nowrap" title={formatQuantity(level.quantity)}>
                    {formatQuantity(level.quantity)}
                  </div>
                  <div className="text-right text-gray-400">{level.orders}</div>
                </div>
              ))
            ) : (
              <div className="text-sm text-gray-500 py-2">No asks</div>
            )}
          </div>
        </div>

        {/* Bids (Buy Orders) */}
        <div className="overflow-x-auto">
          <h3 className="text-sm font-semibold text-buy mb-2">Bids (Buy)</h3>
          <div className="space-y-1">
            <div className="grid grid-cols-3 gap-3 text-xs text-gray-400 font-medium mb-1 pb-1 border-b border-gray-700">
              <div className="text-left">Price (USD)</div>
              <div className="text-right">Qty (BTC)</div>
              <div className="text-right">#</div>
            </div>
            {orderbook.bids && orderbook.bids.length > 0 ? (
              orderbook.bids.map((level, idx) => (
                <div
                  key={idx}
                  className="grid grid-cols-3 gap-3 text-sm hover:bg-gray-700 p-1 rounded transition-colors"
                >
                  <div className="text-buy font-mono text-left overflow-hidden text-ellipsis whitespace-nowrap" title={`$${formatPrice(level.price)}`}>
                    ${formatPrice(level.price)}
                  </div>
                  <div className="text-right font-mono text-gray-300 overflow-hidden text-ellipsis whitespace-nowrap" title={formatQuantity(level.quantity)}>
                    {formatQuantity(level.quantity)}
                  </div>
                  <div className="text-right text-gray-400">{level.orders}</div>
                </div>
              ))
            ) : (
              <div className="text-sm text-gray-500 py-2">No bids</div>
            )}
          </div>
        </div>
      </div>

      {/* Spread */}
      {orderbook.asks?.length > 0 && orderbook.bids?.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-700">
          <div className="text-sm text-gray-400 flex justify-between items-center">
            <span>
              Spread:{' '}
              <span className="font-mono text-white">
                ${formatPrice(orderbook.asks[0].price - orderbook.bids[0].price)}
              </span>
            </span>
            <span className="text-xs">
              ({((orderbook.asks[0].price - orderbook.bids[0].price) / orderbook.bids[0].price * 100).toFixed(3)}%)
            </span>
          </div>
          <div className="text-xs text-gray-500 mt-2 flex justify-between">
            <span>Best Ask: ${formatPrice(orderbook.asks[0].price)}</span>
            <span>Best Bid: ${formatPrice(orderbook.bids[0].price)}</span>
          </div>
        </div>
      )}

      <div className="mt-3 text-xs text-gray-500 text-center">
        Updated: {new Date(orderbook.timestamp).toLocaleTimeString()}
      </div>
    </div>
  );
}
