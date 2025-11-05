import mongoose from 'mongoose';

const orderSchema = new mongoose.Schema(
  {
    order_id: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    client_id: {
      type: String,
      required: true,
      index: true,
    },
    instrument: {
      type: String,
      required: true,
      default: 'BTC-USD',
    },
    side: {
      type: String,
      required: true,
      enum: ['buy', 'sell'],
    },
    type: {
      type: String,
      required: true,
      enum: ['limit', 'market'],
    },
    price: {
      type: Number,
      required: function () {
        return this.type === 'limit';
      },
      min: 0,
    },
    quantity: {
      type: Number,
      required: true,
      min: 0,
    },
    filled_quantity: {
      type: Number,
      default: 0,
      min: 0,
    },
    status: {
      type: String,
      required: true,
      enum: ['pending', 'open', 'partially_filled', 'filled', 'cancelled', 'rejected'],
      default: 'pending',
      index: true,
    },
    version: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  }
);

// Compound index for matching queries
orderSchema.index({ instrument: 1, status: 1, side: 1, price: 1, created_at: 1 });
orderSchema.index({ status: 1, instrument: 1 });

const Order = mongoose.model('Order', orderSchema);

export default Order;
