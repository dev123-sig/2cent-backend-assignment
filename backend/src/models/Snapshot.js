import mongoose from 'mongoose';

const snapshotSchema = new mongoose.Schema(
  {
    snapshot_id: {
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
    bids: [
      {
        price: Number,
        quantity: Number,
        orders: [String],
      },
    ],
    asks: [
      {
        price: Number,
        quantity: Number,
        orders: [String],
      },
    ],
    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: false,
  }
);

// Index for loading latest snapshot
snapshotSchema.index({ instrument: 1, timestamp: -1 });

const Snapshot = mongoose.model('Snapshot', snapshotSchema);

export default Snapshot;
