import { useState } from 'react';
import { api } from '../services/api';

export default function OrderForm() {
  const [formData, setFormData] = useState({
    idempotency_key: '',
    client_id: 'demo-client',
    side: 'buy',
    type: 'limit',
    price: '70000',
    quantity: '1',
  });

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const orderData = {
        idempotency_key: formData.idempotency_key || `web-${Date.now()}-${Math.random()}`,
        client_id: formData.client_id,
        instrument: 'BTC-USD',
        side: formData.side,
        type: formData.type,
        quantity: parseFloat(formData.quantity),
      };

      if (formData.type === 'limit') {
        orderData.price = parseFloat(formData.price);
      }

      const response = await api.submitOrder(orderData);
      setResult(response);
      
      // Reset form after successful submission
      setTimeout(() => {
        setResult(null);
      }, 5000);
    } catch (err) {
      setError(err.message);
      setTimeout(() => {
        setError(null);
      }, 5000);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card">
      <h2 className="text-xl font-bold mb-4">Place Order</h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Idempotency Key */}
        <div>
          <label className="label">Idempotency Key (Optional)</label>
          <input
            type="text"
            name="idempotency_key"
            value={formData.idempotency_key}
            onChange={handleChange}
            placeholder="Auto-generated if empty"
            className="input"
          />
          <p className="text-xs text-gray-500 mt-1">Leave empty for auto-generation</p>
        </div>

        {/* Client ID */}
        <div>
          <label className="label">Client ID</label>
          <input
            type="text"
            name="client_id"
            value={formData.client_id}
            onChange={handleChange}
            className="input"
            required
          />
        </div>

        {/* Side */}
        <div>
          <label className="label">Side</label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setFormData((prev) => ({ ...prev, side: 'buy' }))}
              className={`py-2 px-4 rounded-lg font-medium transition-colors ${
                formData.side === 'buy'
                  ? 'bg-buy text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              Buy
            </button>
            <button
              type="button"
              onClick={() => setFormData((prev) => ({ ...prev, side: 'sell' }))}
              className={`py-2 px-4 rounded-lg font-medium transition-colors ${
                formData.side === 'sell'
                  ? 'bg-sell text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              Sell
            </button>
          </div>
        </div>

        {/* Type */}
        <div>
          <label className="label">Order Type</label>
          <select
            name="type"
            value={formData.type}
            onChange={handleChange}
            className="input"
          >
            <option value="limit">Limit</option>
            <option value="market">Market</option>
          </select>
        </div>

        {/* Price (for limit orders) */}
        {formData.type === 'limit' && (
          <div>
            <label className="label">Price (USD)</label>
            <input
              type="number"
              name="price"
              value={formData.price}
              onChange={handleChange}
              step="0.01"
              min="0"
              className="input"
              required
            />
          </div>
        )}

        {/* Quantity */}
        <div>
          <label className="label">Quantity (BTC)</label>
          <input
            type="number"
            name="quantity"
            value={formData.quantity}
            onChange={handleChange}
            step="0.00000001"
            min="0"
            className="input"
            required
          />
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading}
          className={`w-full py-3 rounded-lg font-medium transition-colors ${
            formData.side === 'buy' ? 'btn-buy' : 'btn-sell'
          } disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          {loading ? 'Submitting...' : `Place ${formData.side.toUpperCase()} Order`}
        </button>
      </form>

      {/* Result/Error Messages */}
      {result && (
        <div className="mt-4 p-4 bg-green-900/30 border border-green-500 rounded-lg">
          <p className="text-sm text-green-400">✅ Order submitted successfully!</p>
          <p className="text-xs text-gray-400 mt-1">Order ID: {result.order_id}</p>
        </div>
      )}

      {error && (
        <div className="mt-4 p-4 bg-red-900/30 border border-red-500 rounded-lg">
          <p className="text-sm text-red-400">❌ {error}</p>
        </div>
      )}
    </div>
  );
}
