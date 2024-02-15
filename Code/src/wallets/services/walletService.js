const ObjectId = require("mongoose/lib/types/objectid");
const multer = require("multer");
const { StatusCodes } = require("http-status-codes");
const AwsFileUpload = require("../../utils/custom/awsFileUpload");
const catcheAsync = require("../../utils/common/catchAsync");
const sendResponse = require("../../utils/common/sendResponse");
const WalletSettings = require("../../utils/wallet/walletFeatures");
const GeneralSettings = require("../../utils/custom/generalSettings");
const Email = require("../../utils/custom/email");
const Currency = require("../../adminModules/currencies/models/currencyModel");

const multerStorageAcknoledgement = multer.memoryStorage();

const multerFilter = (req, file, cb) => {
  if (file.mimetype.split("/")[1] === "pdf") {
    cb(null, true);
  } else {
    cb(new Error(req.i18n.t("errors.uploadOnlyPDF")), false);
  }
};

const uploadAcknoledgement = multer({
  storage: multerStorageAcknoledgement,
  fileFilter: multerFilter,
});

exports.uploadWalletAcknowledgeDoc = uploadAcknoledgement.single(
  "acknowledgeDocument"
);

/*
  Author: Rockers Technologies, USA
  Usage: Get wallet balance, total wallet transactions count, list of wallet transactions done by user with the status of each investment, a veriable to display "Load More" button.
  Function Name: getUserWalletList()
  Paramaters:
    WalletTransactionModel
  Response:
    {
      totalCount: Integer,
      docs: Object,
      displayLoadMore: Boolean,
      userWalletBalance: Double
    }
*/
exports.getUserWalletList = (WalletTransactionModel) =>
  catcheAsync(async (req, res, next) => {
    if (!req.query.currencyId) {
      const defaulCurrencyId = await new GeneralSettings().getGeneralSettings();
      req.query.currencyId = defaulCurrencyId.currencyId;
    }

    await new WalletSettings().checkAndCreateWallet(
      req.user.id,
      req.query.currencyId
    );

    let displayLoadMore = true;
    const limit = req.query.limit ? parseInt(req.query.limit, 10) : 10;

    const userWalletAggregateFilter = [
      {
        $project: {
          id: "$_id",
          user: 1,
          walletId: 1,
          transactionNumber: 1,
          currencyId: 1,
          amount: 1,
          walletType: 1,
          gatewayId: 1,
          transactionType: 1,
          status: 1,
          description: 1,
          campaignId: 1,
          createdAt: 1,
          feesDetails: 1,
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
      {
        $lookup: {
          from: "users",
          localField: "user",
          foreignField: "_id",
          pipeline: [
            {
              $project: {
                slug: 1,
                photo: 1,
                fullName: { $concat: ["$firstName", " ", "$lastName"] },
              },
            },
          ],
          as: "user",
        },
      },
      { $unwind: "$user" },
      {
        $lookup: {
          from: "currencies",
          localField: "currencyId",
          foreignField: "_id",
          pipeline: [{ $project: { id: "_id", code: 1, symbol: 1 } }],
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
      {
        $unwind: {
          path: "$gatewayId",
          preserveNullAndEmptyArrays: true,
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
                companyId: 1,
                equityCurrencyCode: 1,
                equityCurrencySymbol: 1,
              },
            },
          ],
          as: "campaignId",
        },
      },
      {
        $unwind: {
          path: "$campaignId",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "companyprofiles",
          localField: "campaignId.companyId",
          foreignField: "_id",
          pipeline: [
            { $project: { companyName: 1, companyLogo: 1, companySlug: 1 } },
          ],
          as: "campaignId.companyId",
        },
      },
      {
        $unwind: {
          path: "$campaignId.companyId",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $sort: { id: -1 },
      },
    ];

    const countAggregateFilter = [...userWalletAggregateFilter];
    countAggregateFilter.push({ $group: { _id: null, count: { $sum: 1 } } });
    const countDocs = await WalletTransactionModel.aggregate(
      countAggregateFilter
    );
    const totalCount = countDocs.length > 0 ? countDocs[0].count : 0;

    const findAggregateFilter = [...userWalletAggregateFilter];
    if (limit) {
      findAggregateFilter.push({ $limit: limit });
    }
    const docs = await WalletTransactionModel.aggregate(findAggregateFilter);
    const userWalletBalance = await new WalletSettings().walletBalance(
      req.user.id,
      req.query.currencyId.id
    );
    const len = docs.length;

    if (totalCount <= len) {
      displayLoadMore = false;
    }

    sendResponse.responseSuccess(
      {
        totalCount,
        docs,
        displayLoadMore,
        userWalletBalance,
      },
      StatusCodes.OK,
      req.i18n.t("common.success"),
      res
    );
  });

/*
  Author: Rockers Technologies, USA
  Usage: Get intial wallet transaction data from temporary table.
  Function Name: getWalletPreapproval()
  Paramaters:
    WalletPreapprovalModel
  Response:
    {
      walletPreapprovalData: Object
    }
*/
exports.getWalletPreapproval = (WalletPreapprovalModel) =>
  catcheAsync(async (req, res, next) => {
    const walletPreapprovalData = await WalletPreapprovalModel.findById(
      req.params.id
    ).populate({
      path: "currencyId",
      select: "code symbol",
    });

    if (!walletPreapprovalData) {
      return sendResponse.responseSend(
        req.i18n.t("errors.walletPreapprovalDataNotExist"),
        StatusCodes.NOT_FOUND,
        req.i18n.t("common.fail"),
        res
      );
    }

    sendResponse.responseSuccess(
      walletPreapprovalData,
      StatusCodes.OK,
      req.i18n.t("common.success"),
      res
    );
  });

/*
  Author: Rockers Technologies, USA
  Usage: Add intial wallet transaction data into temporary table.
  Function Name: createWalletTopup()
  Paramaters:
    WalletPreapprovalModel
    UserModel
  Response:
    {
      newWalletPreapproval: Object
    }
*/
exports.createWalletTopup = (WalletPreapprovalModel, UserModel) =>
  catcheAsync(async (req, res, next) => {
    if (req.body.currencyId === "") {
      const defaultCurrencyId =
        await new GeneralSettings().getGeneralSettings();
      req.body.currencyId = defaultCurrencyId.currencyId;
    }

    // Get Current User Data to get Wallet ID
    const userData = await UserModel.findById(req.user.id);
    const randomNumber =
      Math.floor(Date.now() / 1000) + new Date().getUTCMilliseconds();

    if (!req.body.user) req.body.user = req.user.id;
    if (!req.body.walletId) req.body.walletId = userData.walletId;
    if (!req.body.transactionNumber) req.body.transactionNumber = randomNumber;

    let newWalletPreapproval = await WalletPreapprovalModel.create(req.body);

    newWalletPreapproval = await newWalletPreapproval.populate({
      path: "currencyId",
      select: "code symbol",
    });

    await new Email().sendTopupRequestGenerated(
      req.body.amount,
      req.body.currencyId,
      userData
    );

    return sendResponse.responseSuccess(
      newWalletPreapproval,
      StatusCodes.OK,
      req.i18n.t("common.success"),
      res
    );
  });

/*
  Author: Rockers Technologies, USA
  Usage: Add wallet transaction into main table and remove from temporary table.
  Function Name: updateWalletTopup()
  Paramaters:
    WalletTransactionModel
    WalletPreapprovalModel
    UserModel
    PaymentGatewayModel
  Response:
    {
      updateWalletTransaction: Object
    }
*/
exports.updateWalletTopup = (
  WalletTransactionModel,
  WalletPreapprovalModel,
  UserModel,
  PaymentGatewayModel
) =>
  catcheAsync(async (req, res, next) => {
    const walletPreapprovalData = await WalletPreapprovalModel.findById(
      req.params.id
    );

    if (!walletPreapprovalData) {
      return sendResponse.responseSend(
        req.i18n.t("errors.walletPreapprovalDataNotExist"),
        StatusCodes.NOT_FOUND,
        req.i18n.t("common.fail"),
        res
      );
    }
    const userData = await UserModel.findById(req.user.id);
    const randomNumber =
      Math.floor(Date.now() / 1000) + new Date().getUTCMilliseconds();

    if (!req.body.user) req.body.user = req.user.id;
    if (!req.body.walletId) req.body.walletId = userData.walletId;
    if (!req.body.transactionNumber) req.body.transactionNumber = randomNumber;
    if (!req.body.amount) req.body.amount = walletPreapprovalData.amount;
    if (!req.body.currencyId)
      req.body.currencyId = walletPreapprovalData.currencyId;
    if (!req.body.transactionType) req.body.transactionType = 1;

    const feesDetails = {
      feesPercentage: 0,
      flatFees: 0,
      transactionFees: 0,
    };

    const paymentGatewayData = await PaymentGatewayModel.findById(
      req.body.gatewayId
    );
    if (!paymentGatewayData) {
      return sendResponse.responseSend(
        req.i18n.t("errors.walletGatewayIdNotExist"),
        StatusCodes.NOT_FOUND,
        req.i18n.t("common.fail"),
        res
      );
    }

    if (paymentGatewayData.paymentType === "offline") {
      req.body.status = 0;
    } else {
      req.body.status = 2;
    }

    //calculate the gateway fees:
    if (paymentGatewayData.paymentType === "ach") {
      if (paymentGatewayData.gatewayFee) {
        feesDetails.feesPercentage = paymentGatewayData.gatewayFee;
        feesDetails.transactionFees = parseFloat(
          (parseFloat(req.body.amount) *
            parseFloat(feesDetails.feesPercentage)) /
            100
        );
      }
    } else if (
      paymentGatewayData.gatewayFeeFixed &&
      paymentGatewayData.gatewayFeePercentage
    ) {
      feesDetails.feesPercentage = paymentGatewayData.gatewayFeePercentage;
      feesDetails.flatFees = paymentGatewayData.gatewayFeeFixed;
      feesDetails.transactionFees =
        parseFloat(
          (parseFloat(req.body.amount) *
            parseFloat(feesDetails.feesPercentage)) /
            100
        ) + parseFloat(feesDetails.flatFees);
    }

    req.body.amount =
      parseFloat(req.body.amount) - parseFloat(feesDetails.transactionFees);
    req.body.feesDetails = feesDetails;

    if (req.file) {
      const acknowledgeDocument = req.file.originalname.split(".");
      const ext = acknowledgeDocument[acknowledgeDocument.length - 1];
      const fileName = `wallet-document-${req.user.id}-${Date.now()}.${ext}`;
      await new AwsFileUpload().uploadSingleFile(
        process.env.WALLET_DOC_BUCKET,
        fileName,
        req.file
      );
      req.body.acknowledgeDocument = `${process.env.WALLET_DOC_BUCKET}/${fileName}`;
    }

    let updateWalletTransaction = await WalletTransactionModel.create(req.body);

    updateWalletTransaction = await updateWalletTransaction.populate({
      path: "gatewayId",
      select: "title",
    });
    updateWalletTransaction = await updateWalletTransaction.populate({
      path: "currencyId",
      select: "code symbol",
    });

    if (updateWalletTransaction) {
      if (parseInt(req.body.status, 10, 10) === 2) {
        await new WalletSettings().updateCurrentWallet(
          req.user.id,
          req.body.currencyId
        );
      }

      await new Email().sendTopupCredited(
        req.body.amount,
        req.body.currencyId,
        userData
      );

      await WalletPreapprovalModel.findByIdAndDelete(req.params.id);
    }

    return sendResponse.responseSuccess(
      updateWalletTransaction,
      StatusCodes.OK,
      req.i18n.t("common.success"),
      res
    );
  });

/*
  Author: Rockers Technologies, USA
  Usage: Get total wallet transaction count, wallet transaction list by status, a veriable to display "Load More" button.
  Function Name: getAllWalletTransactionByStatus()
  Paramaters: @noParams
  Response:
    {
      allDocsCount: Integer,
      docs: Object,
      displayLoadMore: Boolean
    }
*/
exports.getAllWalletTransactionByStatus = () =>
  catcheAsync(async (req, res, next) => {
    let filter = "";
    let filterTransactionType = "";
    let filterWalletType = "";
    let filterTransactionNumber = "";

    // Filter By Status
    if (req.query.status) {
      filter = req.query.status.split(",").map(Number);
    }

    // Filter By Transaction Type
    if (req.query.transactionType) {
      filterTransactionType = parseInt(req.query.transactionType, 10);
    }

    // Filter by Wallet Type
    if (req.query.walletType) {
      filterWalletType = req.query.walletType;
    }

    // Filter by transactionNumber
    if (req.query.transactionNumber) {
      filterTransactionNumber = req.query.transactionNumber;
    }

    const limit = req.query.limit ? parseInt(req.query.limit, 10) : 10;

    const docs = await new WalletSettings().getAllAggregatedWalletStatus(
      "no",
      limit,
      filter,
      filterTransactionType,
      filterWalletType,
      filterTransactionNumber
    );

    const len = docs.length;
    const allDocsCount =
      await new WalletSettings().getAllAggregatedWalletStatus(
        "yes",
        limit,
        filter,
        filterTransactionType,
        filterWalletType,
        filterTransactionNumber
      );

    let displayLoadMore = true;
    if (allDocsCount <= len) {
      displayLoadMore = false;
    }

    sendResponse.responseSuccess(
      {
        allDocsCount,
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
  Usage: Approve / Reject wallet transaction for Admin.
  Function Name: approveWalletTransaction()
  Paramaters:
    WalletTransactionModel
    UserModel
  Response: String
*/
exports.approveWalletTransaction = (WalletTransactionModel, UserModel) =>
  catcheAsync(async (req, res, next) => {
    const walletPreapprovalData = await WalletTransactionModel.findById(
      req.params.id
    );

    if (!walletPreapprovalData) {
      return sendResponse.responseSend(
        req.i18n.t("errors.walletTransactionIdNotExist"),
        StatusCodes.NOT_FOUND,
        req.i18n.t("common.fail"),
        res
      );
    }

    if (
      walletPreapprovalData.status === 2 &&
      walletPreapprovalData.status === parseInt(req.body.status, 10, 10)
    ) {
      return sendResponse.responseSend(
        req.i18n.t("errors.walletTransactionAlreadyApproved"),
        StatusCodes.NOT_FOUND,
        req.i18n.t("common.fail"),
        res
      );
    }

    if (
      walletPreapprovalData.status === 3 &&
      walletPreapprovalData.status === parseInt(req.body.status, 10, 10)
    ) {
      return sendResponse.responseSend(
        req.i18n.t("errors.walletTransactionAlreadyDecline"),
        StatusCodes.NOT_FOUND,
        req.i18n.t("common.fail"),
        res
      );
    }

    if (walletPreapprovalData.gatewayId) {
      const offlineGatewayData =
        await new GeneralSettings().getpaymentGatewayById(
          ObjectId(walletPreapprovalData.gatewayId)
        );

      if (offlineGatewayData.paymentType !== "offline") {
        return sendResponse.responseSend(
          req.i18n.t("errors.walletTransactionNotOffline"),
          StatusCodes.NOT_FOUND,
          req.i18n.t("common.fail"),
          res
        );
      }
    }

    await WalletTransactionModel.findByIdAndUpdate(req.params.id, req.body);
    await new WalletSettings().updateCurrentWallet(
      walletPreapprovalData.user,
      walletPreapprovalData.currencyId
    );

    const userData = await UserModel.findById(walletPreapprovalData.user);

    if (walletPreapprovalData.walletType === "CREDIT") {
      if (parseInt(req.body.status, 10) === 2) {
        await new Email().sendTopupRequestStatusUpdate(
          walletPreapprovalData.amount,
          walletPreapprovalData.currencyId,
          userData,
          "Topup Request Approved",
          parseInt(req.body.status, 10),
          ""
        );
      } else if (parseInt(req.body.status, 10) === 3) {
        await new Email().sendTopupRequestStatusUpdate(
          walletPreapprovalData.amount,
          walletPreapprovalData.currencyId,
          userData,
          "Topup Request Declined",
          parseInt(req.body.status, 10),
          req.body.rejectReason
        );
      }
    }

    if (walletPreapprovalData.walletType === "DEBIT") {
      if (parseInt(req.body.status, 10) === 2) {
        await new Email().sendWithdrawRequestStatusUpdate(
          walletPreapprovalData.amount,
          walletPreapprovalData.currencyId,
          userData,
          "Withdraw Request Approved",
          parseInt(req.body.status, 10),
          ""
        );
      } else if (parseInt(req.body.status, 10) === 3) {
        await new Email().sendWithdrawRequestStatusUpdate(
          walletPreapprovalData.amount,
          walletPreapprovalData.currencyId,
          userData,
          "Withdraw Request Declined",
          parseInt(req.body.status, 10),
          req.body.rejectReason
        );
      }
    }
    sendResponse.responseSuccess(
      req.i18n.t("wallet.updateOfflineWalletSuccessfully"),
      StatusCodes.OK,
      req.i18n.t("common.success"),
      res
    );
  });

/*
  Author: Rockers Technologies, USA
  Usage: Create Withdraw request from wallet.
  Function Name: walletWithdraw()
  Paramaters:
    WalletTransactionModel
    UserModel
    WalletModel
  Response:
    {
      newWalletWithdraw: Object
    }
*/
exports.walletWithdraw = (WalletTransactionModel, UserModel, WalletModel) =>
  catcheAsync(async (req, res, next) => {
    // Get Current User Data to get Wallet ID
    const userData = await UserModel.findById(req.user.id);
    const randomNumber =
      Math.floor(Date.now() / 1000) + new Date().getUTCMilliseconds();

    if (!req.body.currencyId) {
      const defaulCurrencyId = await new GeneralSettings().getGeneralSettings();
      req.body.currencyId = defaulCurrencyId.currencyId;
    }
    const walletData = await WalletModel.findOne({
      user: req.user.id,
      currencyId: req.body.currencyId,
    });

    if (walletData.walletAmount < parseInt(req.body.amount, 10)) {
      return sendResponse.responseSend(
        req.i18n.t("errors.walletAmountLessWalletBalance"),
        StatusCodes.NOT_FOUND,
        req.i18n.t("common.fail"),
        res
      );
    }

    if (!req.body.user) req.body.user = req.user.id;
    if (!req.body.walletId) req.body.walletId = userData.walletId;
    if (!req.body.transactionNumber) req.body.transactionNumber = randomNumber;
    req.body.walletType = "DEBIT";
    req.body.description = "activityLog.withdraw_initiated_by_user";
    req.body.transactionType = 2;

    const newWalletWithdraw = await WalletTransactionModel.create(req.body);

    await new WalletSettings().updateCurrentWallet(
      req.user.id,
      req.body.currencyId
    );

    await new Email().sendWithdrawRequestGenerated(
      req.body.amount,
      req.body.currencyId,
      userData
    );

    const withdrawAmount = await new GeneralSettings().toCommas(
      req.body.amount
    );
    const currencyData = await Currency.findById(req.body.currencyId);
    const bankDetails = `
    <p>Amount: <strong>${currencyData.symbol}${withdrawAmount}${currencyData.code}</strong></p></br>
    <p>Account Type: <strong>${req.body.accountType}</strong></p></br>
    <p>Bank Name: <strong>${req.body.bankName}</strong></p></br>
    <p>Account Number: <strong>${req.body.accountNumber}</strong></p></br>
    <p>Routing Number: <strong>${req.body.routingNumber}</strong></p></br>
    `;
    await new Email().sendAdminNewWithdrawRequest(bankDetails, userData);

    return sendResponse.responseSuccess(
      newWalletWithdraw,
      StatusCodes.OK,
      req.i18n.t("common.success"),
      res
    );
  });

/*
  Author: Rockers Technologies, USA
  Usage: Get wallet detail of the user by given currency id.
  Function Name: getUserWalletDetail()
  Paramaters:
    walletData
  Response:
    {
      newWalletWithdraw: Object
    }
*/
exports.getUserWalletDetail = (WalletModel) =>
  catcheAsync(async (req, res, next) => {
    if (!req.query.currencyId) {
      const defaulCurrencyId = await new GeneralSettings().getGeneralSettings();
      req.query.currencyId = defaulCurrencyId.currencyId;
    }

    await new WalletSettings().checkAndCreateWallet(
      req.user.id,
      req.query.currencyId
    );

    const walletAggregateFilter = [
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
          from: "currencies",
          localField: "currencyId",
          foreignField: "_id",
          pipeline: [
            {
              $project: {
                id: "$_id",
                code: 1,
                symbol: 1,
              },
            },
          ],
          as: "currencyId",
        },
      },
      { $unwind: "$currencyId" },
      { $addFields: { id: "$_id" } },
    ];

    const walletData = await WalletModel.aggregate(walletAggregateFilter).then(
      (result) => result[0]
    );

    sendResponse.responseSuccess(
      walletData,
      StatusCodes.OK,
      req.i18n.t("common.success"),
      res
    );
  });
