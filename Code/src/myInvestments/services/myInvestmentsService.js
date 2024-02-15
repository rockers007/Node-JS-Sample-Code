const ObjectId = require("mongoose/lib/types/objectid");
const { StatusCodes } = require("http-status-codes");
const catcheAsync = require("../../utils/common/catchAsync");
const sendResponse = require("../../utils/common/sendResponse");
const GeneralSettings = require("../../utils/custom/generalSettings");
const Repayment = require("../../utils/equity/repayment");
const Distribution = require("../../utils/equity/distribution");

/*
  Author: Rockers Technologies, USA
  Usage: Get unique currency list in which user have invested.
  Function Name: getUniqueCurrency()
  Paramaters:
    InvestmentProcessModel
    CurrencyModel
  Response:
    {
      len: Integer,
      currunciesData: Object
    }
*/
exports.getUniqueCurrency = (InvestmentProcessModel, CurrencyModel) =>
  catcheAsync(async (req, res, next) => {
    const uniuqeCurrunciesData = await InvestmentProcessModel.find({
      user: req.user.id,
    }).distinct("currencyId");

    const currunciesData = await CurrencyModel.find({
      _id: { $in: uniuqeCurrunciesData },
    });

    const len = currunciesData.length;
    return sendResponse.responseSuccess(
      {
        len,
        currunciesData,
      },
      StatusCodes.OK,
      req.i18n.t("common.success"),
      res
    );
  });

/*
  Author: Rockers Technologies, USA
  Usage: Get total investment count, list of investments done by user with the status of each investment, a veriable to display "Load More" button.
  Function Name: getMyInvestmentList()
  Paramaters:
    InvestmentProcessModel
  Response:
    {
      totalCount: Integer,
      docs: Object,
      displayLoadMore: Boolean
    }
*/
exports.getMyInvestmentList = (InvestmentProcessModel) =>
  catcheAsync(async (req, res, next) => {
    const generalSettings = await new GeneralSettings().getGeneralSettings();
    if (!req.query.currencyId) {
      const uniuqeCurrunciesData = await InvestmentProcessModel.find({
        user: req.user.id,
      }).distinct("currencyId");
      if (uniuqeCurrunciesData.length === 1) {
        req.query.currencyId = uniuqeCurrunciesData[0];
      } else {
        req.query.currencyId = generalSettings.currencyId.id;
      }
    }
    let displayLoadMore = true;
    const limit = req.query.limit ? parseInt(req.query.limit, 10) : 10;
    const mainAggregateFilter = [
      {
        $match: {
          $and: [
            { user: ObjectId(req.user.id) },
            { currencyId: ObjectId(req.query.currencyId) },
          ],
        },
      },
      {
        $lookup: {
          from: "transactions",
          localField: "transactionId",
          foreignField: "_id",
          pipeline: [
            {
              $project: {
                _id: 1,
                preapprovalStatus: 1,
              },
            },
          ],
          as: "transactionId",
        },
      },
      { $unwind: "$transactionId" },
      {
        $lookup: {
          from: "equities",
          localField: "campaignId",
          foreignField: "_id",
          pipeline: [
            {
              $project: {
                _id: 1,
                companyId: 1,
                propertyName: 1,
                termsSlug: 1,
              },
            },
          ],
          as: "campaignId",
        },
      },
      { $unwind: "$campaignId" },
      {
        $lookup: {
          from: "companyprofiles",
          localField: "campaignId.companyId",
          foreignField: "_id",
          pipeline: [{ $project: { _id: 0, companyName: 1 } }],
          as: "campaignId.companyId",
        },
      },
      { $unwind: "$campaignId.companyId" },
      {
        $project: {
          id: "$_id",
          transactionId: 1,
          campaignId: 1,
          createdAt: 1,
          user: 1,
          currencyId: 1,
          _id: 1,
        },
      },
      {
        $addFields: {
          companyName:
            generalSettings.projectScriptType === 0
              ? "$campaignId.companyId.companyName"
              : "$campaignId.propertyName",
          termsSlug: "$campaignId.termsSlug",
          preapprovalStatus: "$transactionId.preapprovalStatus",
        },
      },
      { $sort: { createdAt: -1 } },
      {
        $project: {
          createdAt: 0,
          transactionId: 0,
          campaignId: 0,
          user: 0,
          currencyId: 0,
          _id: 0,
        },
      },
    ];

    const countAggregateFilter = [...mainAggregateFilter];
    countAggregateFilter.push({ $group: { _id: null, count: { $sum: 1 } } });
    const countDocs = await InvestmentProcessModel.aggregate(
      countAggregateFilter
    );
    const totalCount = countDocs.length > 0 ? countDocs[0].count : 0;

    const findAggregateFilter = [...mainAggregateFilter];
    findAggregateFilter.push({ $limit: limit });
    const docs = await InvestmentProcessModel.aggregate(findAggregateFilter);

    const len = docs.length;

    if (totalCount <= len) {
      displayLoadMore = false;
    }

    sendResponse.responseSuccess(
      {
        totalCount,
        docs,
        displayLoadMore,
      },
      StatusCodes.OK,
      req.i18n.t("common.success"),
      res
    );
  });

/*
  Author: Rockers Technologies, USA
  Usage: Get investment detail of the given investment id.
  Function Name: getInvestmentCardDetail()
  Paramaters:
    InvestmentProcessModel
    CampaignDistributionModel
    DistributionDetailModel
    CampaignRepaymentModel
  Response:
    {
      investmentData: Object,
    }
*/
exports.getInvestmentCardDetail = (
  InvestmentProcessModel,
  CampaignDistributionModel,
  DistributionDetailModel,
  CampaignRepaymentModel
) =>
  catcheAsync(async (req, res, next) => {
    const generalSettings = await new GeneralSettings().getGeneralSettings();
    const mainAggregateFilter = [
      {
        $match: { _id: ObjectId(req.params.id) },
      },
      {
        $lookup: {
          from: "transactions",
          localField: "transactionId",
          foreignField: "_id",
          pipeline: [
            {
              $project: {
                preapprovalStatus: 1,
                preapprovalTotalAmount: 1,
                transactionKey: 1,
                doneFromWallet: 1,
              },
            },
          ],
          as: "transactionId",
        },
      },
      { $unwind: "$transactionId" },
      {
        $lookup: {
          from: "paymentgateways",
          localField: "gatewayId",
          foreignField: "_id",
          pipeline: [{ $project: { _id: 0, title: 1, paymentType: 1 } }],
          as: "gatewayId",
        },
      },
      { $unwind: "$gatewayId" },
      {
        $lookup: {
          from: "equities",
          localField: "campaignId",
          foreignField: "_id",
          pipeline: [
            {
              $project: {
                id: "$_id",
                totalraisedAmount: 1,
                propertyName: 1,
                companyId: 1,
                termsSlug: 1,
                interestRate: 1,
                investFrequency: 1,
                termLength: 1,
                equityCurrencyCode: 1,
                equityCurrencySymbol: 1,
                status: 1,
                goal: 1,
                pricePerShare: 1,
              },
            },
          ],
          as: "campaignId",
        },
      },
      { $unwind: "$campaignId" },
      {
        $lookup: {
          from: "companyprofiles",
          localField: "campaignId.companyId",
          foreignField: "_id",
          pipeline: [{ $project: { _id: 0, companyName: 1 } }],
          as: "campaignId.companyId",
        },
      },
      { $unwind: "$campaignId.companyId" },
      {
        $project: {
          id: "$_id",
          user: 1,
          currencyId: 1,
          transactionId: 1,
          gatewayId: 1,
          campaignId: 1,
          createdAt: 1,
          purchasedShares: 1,
          ownership: {
            $cond: {
              if: { $eq: ["$campaignId.totalraisedAmount", 0] },
              then: 0,
              else: {
                $round: [
                  {
                    $divide: [
                      {
                        $multiply: [
                          "$transactionId.preapprovalTotalAmount",
                          100,
                        ],
                      },
                      "$campaignId.totalraisedAmount",
                    ],
                  },
                  2,
                ],
              },
            },
          },
          tempOwnership: {
            $round: [
              {
                $divide: [
                  { $multiply: ["$transactionId.preapprovalTotalAmount", 100] },
                  "$campaignId.goal",
                ],
              },
              2,
            ],
          },
        },
      },
      {
        $addFields: {
          amount: "$transactionId.preapprovalTotalAmount",
          remainingTerm: "$campaignId.termLength",
          companyName:
            generalSettings.projectScriptType === 0
              ? "$campaignId.companyId.companyName"
              : "$campaignId.propertyName",
        },
      },
      {
        $project: {
          "campaignId.propertyName": 0,
          "campaignId.companyId": 0,
        },
      },
    ];

    const investmentData = await InvestmentProcessModel.aggregate(
      mainAggregateFilter
    ).then((result) => result[0]);

    if (!investmentData) {
      sendResponse.responseSuccess(
        req.i18n.t("errors.noDocumentFound"),
        StatusCodes.UNAUTHORIZED,
        req.i18n.t("common.fail"),
        res
      );
    }

    const dealType = investmentData.campaignId.termsSlug;
    const campaignId = investmentData.campaignId.id;
    const { transactionKey } = investmentData.transactionId;
    const userId = investmentData.user;
    const { ownership } = investmentData;

    investmentData.nextRepaymentAmount = 0;
    investmentData.totalDistribution = 0;
    investmentData.nextDistributionDate = "";

    if (dealType === "debt") {
      // repayment data
      const repaymentFilter = [
        {
          $match: {
            $and: [
              { campaignId: ObjectId(campaignId) },
              { paymentStatus: { $ne: "DECLINED" } },
            ],
          },
        },
        {
          $group: {
            _id: null,
            count: { $sum: 1 },
          },
        },
      ];
      const countRepaymentDocs = await CampaignRepaymentModel.aggregate(
        repaymentFilter
      );
      const repaymentCountExpectDecline =
        countRepaymentDocs.length > 0 ? countRepaymentDocs[0].count : 0;

      if (repaymentCountExpectDecline > 0) {
        const totalRepaymentAmount =
          await new Repayment().calculateRepaymentFromCampaignId(
            campaignId,
            repaymentCountExpectDecline
          );
        investmentData.nextRepaymentAmount =
          ownership === 0
            ? 0
            : parseFloat((totalRepaymentAmount * ownership) / 100).toFixed(2);
      }

      // distribution data
      const distributionFilter = [
        {
          $match: { campaignId: ObjectId(campaignId) },
        },
        {
          $group: {
            _id: null,
            count: { $sum: 1 },
          },
        },
      ];
      const countDistributionDocs = await CampaignDistributionModel.aggregate(
        distributionFilter
      );
      const distributionCount =
        countDistributionDocs.length > 0 ? countDistributionDocs[0].count : 0;

      const distributionDetailFilter = [
        {
          $match: {
            $and: [
              { transactionKey: transactionKey },
              { campaignId: ObjectId(campaignId) },
              { user: ObjectId(userId) },
              { distributionStatus: "SUCCESS" },
            ],
          },
        },
      ];
      const distributionDetailData = await DistributionDetailModel.aggregate(
        distributionDetailFilter
      );

      if (distributionDetailData.length > 0) {
        await Promise.all(
          distributionDetailData.map(async (dd) => {
            investmentData.remainingTerm -= 1;
            investmentData.totalDistribution = parseFloat(
              parseFloat(investmentData.totalDistribution) +
                parseFloat(dd.inProgressAmount)
            ).toFixed(2);
          })
        );

        const lastPendingTransactionKey =
          await new Repayment().getLastPendingTransaction(campaignId);
        if (lastPendingTransactionKey !== 1) {
          investmentData.nextDistributionDate =
            await new Distribution().getNextDistributionDate(
              campaignId,
              distributionCount
            );
        }
      } else {
        investmentData.nextDistributionDate =
          await new Distribution().getNextDistributionDate(
            campaignId,
            distributionCount
          );
      }
    }

    sendResponse.responseSuccess(
      investmentData,
      StatusCodes.OK,
      req.i18n.t("common.success"),
      res
    );
  });

/*
  Author: Rockers Technologies, USA
  Usage: Get investment dashboard counters by given currency id.
  Function Name: getInvestmentDashboard()
  Paramaters:
    InvestmentProcessModel
    DistributionDetailModel
  Response:
    {
      currencyData: Object,
      totalInvestmentCount: Integer,
      averageInvestment: Double,
      totalCurrentDistribution: Double,
      totalPreviousDistribution: Double,
      currentYearInvestmentTotal: Double
    }
*/
exports.getInvestmentDashboard = (
  InvestmentProcessModel,
  DistributionDetailModel
) =>
  catcheAsync(async (req, res, next) => {
    const generalSettings = await new GeneralSettings().getGeneralSettings();

    if (!req.query.currencyId) {
      const uniuqeCurrunciesData = await InvestmentProcessModel.find({
        user: req.user.id,
      }).distinct("currencyId");
      if (uniuqeCurrunciesData.length === 1) {
        req.query.currencyId = uniuqeCurrunciesData[0];
      } else {
        req.query.currencyId = generalSettings.currencyId.id;
      }
    }

    const mainAggregateFilter = [
      {
        $project: {
          id: "$_id",
          user: 1,
          currencyId: 1,
          transactionId: 1,
          gatewayId: 1,
          campaignId: 1,
          createdAt: 1,
          amount: 1,
        },
      },
      {
        $match: {
          $and: [
            { user: ObjectId(req.user.id) },
            { currencyId: ObjectId(req.query.currencyId) },
          ],
        },
      },
      { $project: { user: 0 } },
      {
        $lookup: {
          from: "transactions",
          localField: "transactionId",
          foreignField: "_id",
          pipeline: [
            {
              $project: {
                preapprovalStatus: 1,
                preapprovalTotalAmount: 1,
                transactionKey: 1,
              },
            },
            { $match: { preapprovalStatus: "SUCCESS" } },
          ],
          as: "transactionId",
        },
      },
      { $unwind: "$transactionId" },
      {
        $lookup: {
          from: "currencies",
          localField: "currencyId",
          foreignField: "_id",
          pipeline: [{ $project: { _id: 0, code: 1, symbol: 1 } }],
          as: "currencyId",
        },
      },
      { $unwind: "$currencyId" },
      {
        $lookup: {
          from: "paymentgateways",
          localField: "gatewayId",
          foreignField: "_id",
          pipeline: [{ $project: { _id: 0, title: 1 } }],
          as: "gatewayId",
        },
      },
      { $unwind: "$gatewayId" },
      {
        $lookup: {
          from: "equities",
          localField: "campaignId",
          foreignField: "_id",
          pipeline: [
            {
              $project: {
                id: "$_id",
                companyId: 1,
                equityCurrencyCode: 1,
                equityCurrencySymbol: 1,
              },
            },
          ],
          as: "campaignId",
        },
      },
      { $unwind: "$campaignId" },
      {
        $lookup: {
          from: "companyprofiles",
          localField: "campaignId.companyId",
          foreignField: "_id",
          pipeline: [{ $project: { _id: 0, companyName: 1 } }],
          as: "campaignId.companyId",
        },
      },
      { $unwind: "$campaignId.companyId" },
      { $sort: { createdAt: -1 } },
    ];

    const investmentData = await InvestmentProcessModel.aggregate(
      mainAggregateFilter
    );
    const totalInvestmentCount = investmentData.length;

    let currencyData = {};
    if (investmentData.length > 0) {
      currencyData = investmentData[0].currencyId;
    } else {
      currencyData = await new GeneralSettings().getSymbolAndCodeByCurrencyId(
        req.query.currencyId
      );
    }

    let totalInvestmentAmount = 0;
    let averageInvestment = 0;

    let currentYearInvestmentTotal = 0;

    await Promise.all(
      investmentData.map(async (el) => {
        const investmentYear = el.createdAt.getFullYear();
        /* const investmentMonthName = el.createdAt.toLocaleString('default', {
          month: 'long',
        }); */
        if (investmentYear === new Date().getFullYear()) {
          /* monthsWiseInvestmentAmount[investmentMonthName] =
            parseFloat(monthsWiseInvestmentAmount[investmentMonthName]) +
            parseFloat(el.transactionId.preapprovalTotalAmount); */
          currentYearInvestmentTotal =
            parseFloat(currentYearInvestmentTotal) +
            parseFloat(el.transactionId.preapprovalTotalAmount);
        }
        totalInvestmentAmount =
          parseFloat(totalInvestmentAmount) +
          parseFloat(el.transactionId.preapprovalTotalAmount);
      })
    );

    if (totalInvestmentAmount > 0 && totalInvestmentCount > 0) {
      averageInvestment = (
        parseFloat(totalInvestmentAmount) / totalInvestmentCount
      ).toFixed(2);
    }

    const date = new Date();
    const currentYear = date.getFullYear();
    const previousYear = date.getFullYear() - 1;

    const currentDistributionAggregateFilter = [
      {
        $project: {
          id: "$_id",
          user: 1,
          distributionKey: 1,
          distributionStatus: 1,
          createdAt: 1,
          inProgressAmount: 1,
        },
      },
      {
        $lookup: {
          from: "campaigndistributions",
          localField: "distributionKey",
          foreignField: "distributionKey",
          pipeline: [
            { $project: { _id: 0, distributionKey: 1, currencyId: 1 } },
          ],
          as: "distributionKey",
        },
      },
      { $unwind: "$distributionKey" },
      {
        $match: {
          $and: [
            { user: ObjectId(req.user.id) },
            {
              "distributionKey.currencyId": ObjectId(req.query.currencyId),
            },
            { distributionStatus: "SUCCESS" },
            { createdAt: { $gte: new Date(currentYear, 0, 1) } },
            { createdAt: { $lt: new Date(currentYear, 11, 31) } },
          ],
        },
      },
      {
        $group: {
          _id: null,
          totalInProgressAmount: {
            $sum: { $toDecimal: "$inProgressAmount" },
          },
        },
      },
    ];
    const currentDistributionData = await DistributionDetailModel.aggregate(
      currentDistributionAggregateFilter
    ).then((result) => result[0]);
    const totalCurrentDistribution = currentDistributionData
      ? parseFloat(currentDistributionData.totalInProgressAmount)
      : 0;

    const previousDistributionAggregateFilter = [
      {
        $project: {
          id: "$_id",
          user: 1,
          distributionKey: 1,
          distributionStatus: 1,
          createdAt: 1,
          inProgressAmount: 1,
        },
      },
      {
        $lookup: {
          from: "campaigndistributions",
          localField: "distributionKey",
          foreignField: "distributionKey",
          pipeline: [
            { $project: { _id: 0, distributionKey: 1, currencyId: 1 } },
          ],
          as: "distributionKey",
        },
      },
      { $unwind: "$distributionKey" },
      {
        $match: {
          $and: [
            { user: ObjectId(req.user.id) },
            {
              "distributionKey.currencyId": ObjectId(req.query.currencyId),
            },
            { distributionStatus: "SUCCESS" },
            { createdAt: { $gte: new Date(previousYear, 0, 1) } },
            { createdAt: { $lt: new Date(previousYear, 11, 31) } },
          ],
        },
      },
      {
        $group: {
          _id: null,
          totalInProgressAmount: {
            $sum: { $toDecimal: "$inProgressAmount" },
          },
        },
      },
    ];
    const previousDistributionData = await DistributionDetailModel.aggregate(
      previousDistributionAggregateFilter
    ).then((result) => result[0]);
    const totalPreviousDistribution = previousDistributionData
      ? parseFloat(previousDistributionData.totalInProgressAmount)
      : 0;

    return sendResponse.responseSuccess(
      {
        currencyData,
        totalInvestmentCount,
        averageInvestment,
        totalCurrentDistribution,
        totalPreviousDistribution,
        currentYearInvestmentTotal,
      },
      StatusCodes.OK,
      req.i18n.t("common.success"),
      res
    );
  });

/*
  Author: Rockers Technologies, USA
  Usage: Get investment document detail of the given investment id.
  Function Name: getAllDocumentDetail()
  Paramaters:
    InvestmentProcessModel
    ExtrasDocumentModel
    EquityModel
  Response:
    {
      campaignDocumentInfo: Object,
      investmentInfo: Object,
      extraDocumentData: Object
    }
*/
exports.getAllDocumentDetail = (
  InvestmentProcessModel,
  ExtrasDocumentModel,
  EquityModel
) =>
  catcheAsync(async (req, res, next) => {
    const aggregateFilter1 = [
      {
        $match: {
          _id: ObjectId(req.params.id),
        },
      },
      {
        $project: {
          documentVerified: 1,
          acknowledgeDocument: 1,
          campaignId: 1,
          contractDocument: 1,
        },
      },
    ];
    const investmentInfo = await InvestmentProcessModel.aggregate(
      aggregateFilter1
    ).then((result) => result[0]);
    if (!investmentInfo) {
      return sendResponse.responseSend(
        req.i18n.t("errors.noDocumentFound"),
        StatusCodes.NOT_FOUND,
        req.i18n.t("common.fail"),
        res
      );
    }

    const aggregateFilter2 = [
      {
        $project: {
          documentTitle: 1,
          documentUrl: 1,
          visibility: 1,
          campaignId: 1,
        },
      },
      { $match: { campaignId: String(investmentInfo.campaignId) } },
      { $project: { campaignId: 0 } },
    ];
    const extraDocumentData = await ExtrasDocumentModel.aggregate(
      aggregateFilter2
    );

    const aggregateFilter3 = [
      { $project: { userUploadedContract: 1 } },
      { $match: { _id: ObjectId(investmentInfo.campaignId) } },
    ];
    const campaignDocumentInfo = await EquityModel.aggregate(
      aggregateFilter3
    ).then((result) => result[0]);

    sendResponse.responseSuccess(
      {
        campaignDocumentInfo,
        investmentInfo,
        extraDocumentData,
      },
      StatusCodes.OK,
      req.i18n.t("common.success"),
      res
    );
  });

/*
  Author: Rockers Technologies, USA
  Usage: Get category and deal type wise investment ratio by given currency id.
  Function Name: getGraphData()
  Paramaters:
    InvestmentProcessModel
  Response:
    {
      categoryChartData: Object,
      slugChartData: Object,
    }
*/
exports.getGraphData = (InvestmentProcessModel) =>
  catcheAsync(async (req, res, next) => {
    const generalSettings = await new GeneralSettings().getGeneralSettings();

    if (!req.query.currencyId) {
      const uniuqeCurrunciesData = await InvestmentProcessModel.find({
        user: req.user.id,
      }).distinct("currencyId");
      if (uniuqeCurrunciesData.length === 1) {
        req.query.currencyId = uniuqeCurrunciesData[0];
      } else {
        req.query.currencyId = generalSettings.currencyId.id;
      }
    }

    const mainAggregateFilter = [
      {
        $project: {
          id: "$_id",
          user: 1,
          currencyId: 1,
          transactionId: 1,
          gatewayId: 1,
          campaignId: 1,
          createdAt: 1,
          amount: 1,
        },
      },
      {
        $match: {
          $and: [
            { user: ObjectId(req.user.id) },
            { currencyId: ObjectId(req.query.currencyId) },
          ],
        },
      },
      { $project: { user: 0 } },
      {
        $lookup: {
          from: "transactions",
          localField: "transactionId",
          foreignField: "_id",
          pipeline: [
            {
              $project: {
                preapprovalStatus: 1,
                preapprovalTotalAmount: 1,
                transactionKey: 1,
              },
            },
            { $match: { preapprovalStatus: "SUCCESS" } },
          ],
          as: "transactionId",
        },
      },
      { $unwind: "$transactionId" },
      {
        $lookup: {
          from: "currencies",
          localField: "currencyId",
          foreignField: "_id",
          pipeline: [{ $project: { _id: 0, code: 1, symbol: 1 } }],
          as: "currencyId",
        },
      },
      { $unwind: "$currencyId" },
      {
        $lookup: {
          from: "paymentgateways",
          localField: "gatewayId",
          foreignField: "_id",
          pipeline: [{ $project: { _id: 0, title: 1 } }],
          as: "gatewayId",
        },
      },
      { $unwind: "$gatewayId" },
      {
        $lookup: {
          from: "equities",
          localField: "campaignId",
          foreignField: "_id",
          pipeline: [
            {
              $project: {
                id: "$_id",
                companyId: 1,
                equityCurrencyCode: 1,
                equityCurrencySymbol: 1,
                termsSlug: 1,
                category: 1,
              },
            },
          ],
          as: "campaignId",
        },
      },
      { $unwind: "$campaignId" },
      {
        $lookup: {
          from: "categories",
          localField: "campaignId.category",
          foreignField: "_id",
          pipeline: [{ $project: { _id: 0, name: 1 } }],
          as: "campaignId.category",
        },
      },
      { $unwind: "$campaignId.category" },
      {
        $lookup: {
          from: "companyprofiles",
          localField: "campaignId.companyId",
          foreignField: "_id",
          pipeline: [{ $project: { _id: 0, companyName: 1 } }],
          as: "campaignId.companyId",
        },
      },
      { $unwind: "$campaignId.companyId" },
    ];

    const slugWiseInvestmentData = await InvestmentProcessModel.aggregate(
      mainAggregateFilter
    );
    let totalInvestment = 0;
    let slugTotalDebtInvestment = 0;
    let slugTotalEquityInvestment = 0;

    await Promise.all(
      slugWiseInvestmentData.map(async (el) => {
        const { termsSlug } = el.campaignId;
        if (termsSlug === "debt") {
          slugTotalDebtInvestment += el.transactionId.preapprovalTotalAmount;
        }
        if (termsSlug === "equity") {
          slugTotalEquityInvestment += el.transactionId.preapprovalTotalAmount;
        }
        totalInvestment += el.transactionId.preapprovalTotalAmount;
      })
    );
    let slugChartData = {};

    if (totalInvestment > 0) {
      slugChartData = {
        Equity: parseFloat(
          (parseFloat(slugTotalEquityInvestment) * 100) /
            parseFloat(totalInvestment)
        ).toFixed(2),
        Debt: parseFloat(
          (parseFloat(slugTotalDebtInvestment) * 100) /
            parseFloat(totalInvestment)
        ).toFixed(2),
      };
    }

    const categoryAggregateFilter = [...mainAggregateFilter];
    categoryAggregateFilter.push({
      $group: { _id: "$campaignId.category.name", count: { $sum: 1 } },
    });
    const categoryWiseInvestmentData = await InvestmentProcessModel.aggregate(
      categoryAggregateFilter
    );
    const categoryChartData = {};
    let totalInvestmentCount = 0;

    await Promise.all(
      categoryWiseInvestmentData.map(async (el) => {
        totalInvestmentCount += parseInt(el.count, 10);
      })
    );

    await Promise.all(
      categoryWiseInvestmentData.map(async (el) => {
        categoryChartData[el._id] = parseFloat(
          (parseInt(el.count, 10) * 100) / parseInt(totalInvestmentCount, 10)
        ).toFixed(2);
      })
    );

    return sendResponse.responseSuccess(
      {
        categoryChartData,
        slugChartData,
      },
      StatusCodes.OK,
      req.i18n.t("common.success"),
      res
    );
  });

/*
  Author: Rockers Technologies, USA
  Usage: Get get bar chart detail and investment and repayment totals by given currency id.
  Function Name: getGraphByTransactions()
  Paramaters:
    InvestmentProcessModel
    DistributionDetailModel
  Response:
    {
      slugChartData: Object,
    }
*/
exports.getGraphByTransactions = (
  InvestmentProcessModel,
  DistributionDetailModel
) =>
  catcheAsync(async (req, res, next) => {
    const generalSettings = await new GeneralSettings().getGeneralSettings();

    if (!req.query.currencyId) {
      const uniuqeCurrunciesData = await InvestmentProcessModel.find({
        user: req.user.id,
      }).distinct("currencyId");
      if (uniuqeCurrunciesData.length === 1) {
        req.query.currencyId = uniuqeCurrunciesData[0];
      } else {
        req.query.currencyId = generalSettings.currencyId.id;
      }
    }

    const date = new Date();
    const currentYear =
      req.query.transactionYear !== 0 && req.query.transactionYear !== undefined
        ? date.getFullYear() - req.query.transactionYear
        : date.getFullYear();

    const mainAggregateFilter = [
      {
        $project: {
          id: "$_id",
          user: 1,
          currencyId: 1,
          transactionId: 1,
          gatewayId: 1,
          campaignId: 1,
          createdAt: 1,
          amount: 1,
          status: 1,
          month: { $month: "$createdAt" },
        },
      },
      {
        $match: {
          $and: [
            { user: ObjectId(req.user.id) },
            { status: 1 },
            { currencyId: ObjectId(req.query.currencyId) },
            { createdAt: { $gte: new Date(currentYear, 0, 1) } },
            { createdAt: { $lt: new Date(currentYear, 11, 31) } },
          ],
        },
      },
      {
        $lookup: {
          from: "equities",
          localField: "campaignId",
          foreignField: "_id",
          pipeline: [
            {
              $project: {
                id: "$_id",
                companyId: 1,
                termsSlug: 1,
              },
            },
          ],
          as: "campaignId",
        },
      },
      { $unwind: "$campaignId" },
      {
        $lookup: {
          from: "transactions",
          localField: "transactionId",
          foreignField: "_id",
          pipeline: [
            {
              $project: {
                id: "$_id",
                preapprovalTotalAmount: 1,
              },
            },
          ],
          as: "transactionId",
        },
      },
      { $unwind: "$transactionId" },
    ];
    const transactions = await InvestmentProcessModel.aggregate(
      mainAggregateFilter
    );

    let totalInvestmentAmount = 0;
    const totalDebtInvestmentSum = [];
    const totalEquityInvestmentSum = [];

    const DebtInvestment = [];
    const EquityInvestment = [];

    await Promise.all(
      transactions.map(async (el) => {
        const investmentYear = el.createdAt.getFullYear();
        if (investmentYear === currentYear) {
          if (el.campaignId.termsSlug === "debt") {
            totalDebtInvestmentSum.push({
              month: el.month,
              amount: el.transactionId.preapprovalTotalAmount,
            });
          }
          if (el.campaignId.termsSlug === "equity") {
            totalEquityInvestmentSum.push({
              month: el.month,
              amount: el.transactionId.preapprovalTotalAmount,
            });
          }
          totalInvestmentAmount += el.transactionId.preapprovalTotalAmount;
        }
      })
    );

    totalDebtInvestmentSum.sort((a, b) => a.month - b.month);

    for (let i = 0; i < 12; i += 1) {
      const amountArr = totalDebtInvestmentSum.filter((a) => a.month === i + 1);

      if (amountArr.length > 0) {
        const initialValue = 0;
        DebtInvestment.push(
          amountArr.reduce(
            (accumulator, currentValue) => accumulator + currentValue.amount,
            initialValue
          )
        );
      } else {
        DebtInvestment.push(0);
      }
    }

    totalEquityInvestmentSum.sort((a, b) => a.month - b.month);

    for (let i = 0; i < 12; i += 1) {
      const amountArr = totalEquityInvestmentSum.filter(
        (a) => a.month === i + 1
      );

      if (amountArr.length > 0) {
        const initialValue = 0;
        EquityInvestment.push(
          amountArr.reduce(
            (accumulator, currentValue) => accumulator + currentValue.amount,
            initialValue
          )
        );
      } else {
        EquityInvestment.push(0);
      }
    }

    const currentDistributionAggregateFilter = [
      {
        $project: {
          id: "$_id",
          user: 1,
          distributionKey: 1,
          distributionStatus: 1,
          createdAt: 1,
          inProgressAmount: 1,
        },
      },
      {
        $lookup: {
          from: "campaigndistributions",
          localField: "distributionKey",
          foreignField: "distributionKey",
          pipeline: [
            { $project: { _id: 0, distributionKey: 1, currencyId: 1 } },
          ],
          as: "distributionKey",
        },
      },
      { $unwind: "$distributionKey" },
      {
        $match: {
          $and: [
            { user: ObjectId(req.user.id) },
            {
              "distributionKey.currencyId": ObjectId(req.query.currencyId),
            },
            { distributionStatus: "SUCCESS" },
            { createdAt: { $gte: new Date(currentYear, 0, 1) } },
            { createdAt: { $lt: new Date(currentYear, 11, 31) } },
          ],
        },
      },
      {
        $group: {
          _id: null,
          totalInProgressAmount: {
            $sum: { $toDecimal: "$inProgressAmount" },
          },
        },
      },
    ];

    const currentDistributionData = await DistributionDetailModel.aggregate(
      currentDistributionAggregateFilter
    ).then((result) => result[0]);
    const totalCurrentDistribution = currentDistributionData
      ? parseFloat(currentDistributionData.totalInProgressAmount)
      : 0;

    const currencyData =
      await new GeneralSettings().getSymbolAndCodeByCurrencyId(
        req.query.currencyId
      );

    const slugChartData = {
      Debt: DebtInvestment,
      Equity: EquityInvestment,
      totalInvestments: totalInvestmentAmount,
      totalRepayment: totalCurrentDistribution,
      currencyData,
    };

    return sendResponse.responseSuccess(
      slugChartData,
      StatusCodes.OK,
      req.i18n.t("common.success"),
      res
    );
  });
