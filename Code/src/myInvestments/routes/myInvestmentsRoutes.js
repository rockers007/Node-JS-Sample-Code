const routes = require('express/lib/router');
const authGuard = require('../../authentication/controllers/guardController');
const myInvestmentsController = require('../controllers/myInvestmentsController');

const router = routes();
// get data with default currency
router.get('/', authGuard.protect, myInvestmentsController.getMyInvestmentList);
router.get(
  '/dashboard',
  authGuard.protect,
  myInvestmentsController.getInvestmentDashboard
);
router.get(
  '/get-graph-data',
  authGuard.protect,
  myInvestmentsController.getGraphData
);
router.get(
  '/get-graph-by-transactions',
  authGuard.protect,
  myInvestmentsController.getGraphByTransactions
);
router.get(
  '/get-unique-currency',
  authGuard.protect,
  myInvestmentsController.getUniqueCurrency
);

router.get(
  '/:id/get-investment-card-detail',
  authGuard.protect,
  myInvestmentsController.getInvestmentCardDetail
);
router.get(
  '/:id/get-document-detail',
  authGuard.protect,
  myInvestmentsController.getAllDocumentDetail
);

module.exports = router;
