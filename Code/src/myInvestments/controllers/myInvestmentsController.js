const EquityModel = require('../../campaigns/equity/models/equityModel');
const InvestmentProcessModel = require('../../campaignInvests/models/investmentProcessModel');
const CurrencyModel = require('../../adminModules/currencies/models/currencyModel');
const CampaignRepaymentModel = require('../../adminModules/campaignRepayment/models/campaignRepaymentModel');
const CampaignDistributionModel = require('../../adminModules/campaignDistribution/models/campaignDistributionModel');
const DistributionDetailModel = require('../../adminModules/campaignDistribution/models/distributionDetailModel');
const ExtrasDocumentModel = require('../../campaigns/extrasInfo/models/extrasDocumentModel');
const myInvestmentsService = require('../services/myInvestmentsService');

exports.setCurrentUserId = (req, res, next) => {
  if (!req.body.user) req.body.user = req.user.id;
  next();
};

exports.getUniqueCurrency = myInvestmentsService.getUniqueCurrency(
  InvestmentProcessModel,
  CurrencyModel
);
exports.getMyInvestmentList = myInvestmentsService.getMyInvestmentList(
  InvestmentProcessModel
);
exports.getInvestmentDashboard = myInvestmentsService.getInvestmentDashboard(
  InvestmentProcessModel,
  DistributionDetailModel
);
exports.getInvestmentCardDetail = myInvestmentsService.getInvestmentCardDetail(
  InvestmentProcessModel,
  CampaignDistributionModel,
  DistributionDetailModel,
  CampaignRepaymentModel
);
exports.getAllDocumentDetail = myInvestmentsService.getAllDocumentDetail(
  InvestmentProcessModel,
  ExtrasDocumentModel,
  EquityModel
);
exports.getGraphData = myInvestmentsService.getGraphData(
  InvestmentProcessModel
);
exports.getGraphByTransactions = myInvestmentsService.getGraphByTransactions(
  InvestmentProcessModel,
  DistributionDetailModel
);
