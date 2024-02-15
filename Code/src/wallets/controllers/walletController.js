const UserModel = require('../../authentication/models/userModel');
const WalletPreapprovalModel = require('../models/WalletPreapprovalModel');
const WalletModel = require('../models/WalletModel');
const WalletTransactionModel = require('../models/WalletTransactionModel');
const walletService = require('../services/walletService');
const PaymentGatewayModel = require('../../adminModules/manageAPI/models/paymentGatewayModel');

// Get All Wallet Transaction By User ID
exports.getUserWalletList = walletService.getUserWalletList(
  WalletTransactionModel
);

exports.getUserWalletDetail = walletService.getUserWalletDetail(WalletModel);

exports.getWalletPreapproval = walletService.getWalletPreapproval(
  WalletPreapprovalModel
);

exports.createWalletTopup = walletService.createWalletTopup(
  WalletPreapprovalModel,
  UserModel
);

exports.updateWalletTopup = walletService.updateWalletTopup(
  WalletTransactionModel,
  WalletPreapprovalModel,
  UserModel,
  PaymentGatewayModel
);

exports.walletWithdraw = walletService.walletWithdraw(
  WalletTransactionModel,
  UserModel,
  WalletModel
);

// Admin

exports.getAllWalletTransactionByStatus =
  walletService.getAllWalletTransactionByStatus();

exports.approveWalletTransaction = walletService.approveWalletTransaction(
  WalletTransactionModel,
  UserModel
);
