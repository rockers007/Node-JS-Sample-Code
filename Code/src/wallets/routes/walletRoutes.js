const routes = require('express/lib/router');
const authGuard = require('../../authentication/controllers/guardController');
const adminGuard = require('../../adminModules/adminAuthentication/controllers/adminGuardController');
const walletController = require('../controllers/walletController');
const walletService = require('../services/walletService');

const router = routes();

// Front API
router
  .route('/get-user-wallet-list')
  .get(authGuard.protect, walletController.getUserWalletList);

router
  .route('/get-user-wallet-detail')
  .get(authGuard.protect, walletController.getUserWalletDetail);

router
  .route('/add-wallet-topup')
  .post(authGuard.protect, walletController.createWalletTopup);

router
  .route('/wallet-preapproval/:id')
  .get(authGuard.protect, walletController.getWalletPreapproval);

router
  .route('/update-wallet-topup/:id')
  .post(
    authGuard.protect,
    walletService.uploadWalletAcknowledgeDoc,
    walletController.updateWalletTopup
  );

router
  .route('/wallet-withdraw')
  .post(authGuard.protect, walletController.walletWithdraw);
// ADMIN API ROUTES

router.get(
  '/get-all-wallet-transactions/admin',
  adminGuard.adminProtect,
  walletController.getAllWalletTransactionByStatus
);

router.patch(
  '/update-wallet-transaction-status/:id/admin',
  adminGuard.adminProtect,
  walletController.approveWalletTransaction
);

module.exports = router;
