const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export const api = {
  // Submit order
  async submitOrder(orderData) {
    const response = await fetch(`${API_BASE}/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(orderData),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to submit order');
    }

    return response.json();
  },

  // Cancel order
  async cancelOrder(orderId) {
    const response = await fetch(`${API_BASE}/orders/${orderId}/cancel`, {
      method: 'POST',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to cancel order');
    }

    return response.json();
  },

  // Get order
  async getOrder(orderId) {
    const response = await fetch(`${API_BASE}/orders/${orderId}`);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to fetch order');
    }

    return response.json();
  },

  // Get orderbook
  async getOrderbook(levels = 20) {
    const response = await fetch(`${API_BASE}/orderbook?levels=${levels}`);

    if (!response.ok) {
      throw new Error('Failed to fetch orderbook');
    }

    return response.json();
  },

  // Get trades
  async getTrades(limit = 50) {
    const response = await fetch(`${API_BASE}/trades?limit=${limit}`);

    if (!response.ok) {
      throw new Error('Failed to fetch trades');
    }

    return response.json();
  },

  // Health check
  async health() {
    const response = await fetch(`${API_BASE}/healthz`);
    return response.json();
  },
};
