export default function TradesFeed({ trades }) {
  const formatPrice = (price) => price.toFixed(2);
  const formatQuantity = (qty) => qty.toFixed(8);
  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString();
  };

  return (
    <div className="card">
      <h2 className="text-xl font-bold mb-4">Recent Trades</h2>

      <div className="space-y-1">
        <div className="grid grid-cols-3 gap-2 text-xs text-gray-400 font-medium mb-2">
          <div>Time</div>
          <div className="text-right">Price</div>
          <div className="text-right">Quantity</div>
        </div>

        {trades && trades.length > 0 ? (
          <div className="max-h-[500px] overflow-y-auto space-y-2 pr-2" style={{scrollbarWidth: 'thin'}}>
            {trades.map((trade) => (
              <div
                key={trade.trade_id}
                className="bg-gray-700 p-2 rounded hover:bg-gray-600 transition-colors"
              >
                <div className="grid grid-cols-3 gap-2 text-sm mb-1">
                  <div className="text-gray-400 text-xs">{formatTime(trade.timestamp)}</div>
                  <div className="text-right font-mono text-white">${formatPrice(trade.price)}</div>
                  <div className="text-right font-mono text-gray-300">{formatQuantity(trade.quantity)}</div>
                </div>
                <div className="flex justify-between text-xs mt-1 pt-1 border-t border-gray-600">
                  <span className="text-green-400">🔵 {trade.buyer_id || 'N/A'}</span>
                  <span className="text-gray-500">→</span>
                  <span className="text-red-400">🔴 {trade.seller_id || 'N/A'}</span>
                </div>
                <div className="text-xs text-gray-500 text-right mt-1">
                  Total: ${(trade.price * trade.quantity).toFixed(2)}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-sm text-gray-500 py-4 text-center">No trades yet</div>
        )}
      </div>
    </div>
  );
}
