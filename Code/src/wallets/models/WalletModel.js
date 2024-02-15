const mongoose = require('mongoose');

const walletSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      required: true,
    },
    walletId: {
      type: String,
      required: true,
    },
    currencyId: {
      type: mongoose.Schema.ObjectId,
      ref: 'Currency',
    },
    walletAmount: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      default: 'yes',
    },
    createdAt: {
      type: Date,
      default: Date.now(),
    },
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

const Wallet = mongoose.model('Wallet', walletSchema);
module.exports = Wallet;
