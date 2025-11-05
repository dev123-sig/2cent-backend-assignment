import mongoose from 'mongoose';

const tradeSchema = new mongoose.Schema(
  {
    trade_id: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    instrument: {
      type: String,
      required: true,
      default: 'BTC-USD',
    },
    buy_order_id: {
      type: String,
      required: true,
      index: true,
    },
    sell_order_id: {
      type: String,
      required: true,
      index: true,
    },
    price: {
      type: Number,
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: false,
  }
);

// Index for recent trades query
tradeSchema.index({ timestamp: -1 });

const Trade = mongoose.model('Trade', tradeSchema);

export default Trade;
