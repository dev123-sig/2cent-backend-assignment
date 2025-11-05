export default function OrderStatus({ orderUpdates }) {
  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString();
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'filled':
        return 'text-green-400';
      case 'partially_filled':
        return 'text-yellow-400';
      case 'cancelled':
        return 'text-red-400';
      case 'open':
        return 'text-blue-400';
      default:
        return 'text-gray-400';
    }
  };

  return (
    <div className="card">
      <h2 className="text-xl font-bold mb-4">Order Updates</h2>

      <div className="space-y-2">
        {orderUpdates && orderUpdates.length > 0 ? (
          <div className="max-h-64 overflow-y-auto space-y-2">
            {orderUpdates.map((update, idx) => (
              <div
                key={idx}
                className="p-3 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors"
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <p className="text-sm font-mono text-gray-300">{update.order_id}</p>
                    {update.idempotency_key && (
                      <p className="text-[10px] font-mono text-gray-500 mt-0.5">key: {update.idempotency_key}</p>
                    )}
                    <p className={`text-xs font-semibold ${getStatusColor(update.status)}`}>
                      {update.status.toUpperCase()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-400">
                      Filled: {update.filled_quantity?.toFixed(8) || '0'}
                    </p>
                    <p className="text-xs text-gray-500">{formatTime(update.timestamp)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-sm text-gray-500 py-4 text-center">No order updates yet</div>
        )}
      </div>
    </div>
  );
}
