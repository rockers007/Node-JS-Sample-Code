const ObjectId = require("mongoose/lib/types/objectid");
const GeneralSettings = require("../custom/generalSettings");
const UserModel = require("../../authentication/models/userModel");
const WalletModel = require("../../wallets/models/WalletModel");
const WalletTransactionModel = require("../../wallets/models/WalletTransactionModel");

module.exports = class walletFeatures {
  /*
    Author: Rockers Technologies, USA
    Usage: create new wallet for the given user id and currency id.
    Function Name: createNewWallet()
    Paramaters:
      user
      currencyId (OPTIONAL)
      walletId (OPTIONAL)
    Return: Boolean
  */

  async createNewWallet(user, currencyId = "", walletId = "") {
    // Step 1: Check currency Id
    if (currencyId === "") {
      const defaultCurrencyId =
        await new GeneralSettings().getGeneralSettings();
      const defCurrencyId = defaultCurrencyId.currencyId;
      currencyId = defCurrencyId;
    }

    // Step 2: Check walletId
    if (walletId === "") {
      walletId =
        Math.floor(Date.now() / 1000) + new Date().getUTCMilliseconds();
    }

    //Step 3: Wallet id Update on user Table
    await UserModel.findByIdAndUpdate(user, { walletId: walletId });

    // Step 4: Wallet table update
    const walletData = {
      user: user,
      walletId: walletId,
      currencyId: currencyId,
    };

    await WalletModel.create(walletData);

    return true;
  }

  /*
    Author: Rockers Technologies, USA
    Usage: check if the wallet for the given user id and currency id exist or not if not then create new one.
    Function Name: checkAndCreateWallet()
    Paramaters:
      user
      currencyId (OPTIONAL)
    Return: Object
  */
  async checkAndCreateWallet(user, currencyId = "") {
    if (currencyId === "") {
      const defaultCurrencyId =
        await new GeneralSettings().getGeneralSettings();
      const defCurrencyId = defaultCurrencyId.currencyId;
      currencyId = defCurrencyId;
    }

    const userAggregateFilter = [
      {
        $project: {
          id: "$_id",
          walletId: 1,
          userType: 1,
        },
      },
      { $match: { _id: ObjectId(user) } },
      {
        $lookup: {
          from: "usertypes",
          localField: "userType",
          foreignField: "_id",
          pipeline: [
            {
              $project: {
                slug: 1,
              },
            },
          ],
          as: "userType",
        },
      },
      { $unwind: "$userType" },
    ];

    const userData = await UserModel.aggregate(userAggregateFilter).then(
      (result) => result[0]
    );

    if (userData && userData.userType.slug !== "campaign-owner") {
      if (userData.walletId === "") {
        await this.createNewWallet(user, currencyId);
      } else {
        const walletAggregateFilter = [
          {
            $project: {
              id: "$_id",
              user: 1,
              walletId: 1,
              currencyId: 1,
            },
          },
          {
            $match: {
              $and: [
                { user: ObjectId(user) },
                { walletId: userData.walletId },
                { currencyId: ObjectId(currencyId) },
              ],
            },
          },
          { $group: { _id: null, count: { $sum: 1 } } },
        ];

        const walletData = await WalletModel.aggregate(walletAggregateFilter);
        const totalCount = walletData.length > 0 ? walletData[0].count : 0;

        if (totalCount === 0) {
          await this.createNewWallet(user, currencyId, userData.walletId);
        }
      }
    }
  }

  /*
    Author: Rockers Technologies, USA
    Usage: update the wallet balance of the given user id and currency id.
    Function Name: updateCurrentWallet()
    Paramaters:
      user
      currencyId
    Return: Object
  */
  async updateCurrentWallet(user, currencyId) {
    let amount = 0;
    const walletTransData = await WalletTransactionModel.find({
      user: user,
      currencyId: currencyId,
      status: { $ne: 3 },
    });

    await Promise.all(
      walletTransData.map(async (walletData) => {
        if (walletData.walletType === "CREDIT") {
          if (walletData.status === 2) {
            amount += walletData.amount;
          }
        } else {
          amount -= walletData.amount;
        }
      })
    );

    amount = amount > 0 ? amount : 0;
    await WalletModel.findOneAndUpdate(
      { user: user, currencyId: currencyId },
      {
        walletAmount: parseFloat(amount).toFixed(3),
      },
      {
        new: true,
      }
    );
  }

  /*
    Author: Rockers Technologies, USA
    Usage: update the wallet balance of the given user id and currency id.
    Function Name: walletBalance()
    Paramaters:
      user
      currencyId (OPTIONAL)
    Return: Double
  */
  async walletBalance(user, currencyId = "") {
    if (currencyId === "") {
      const defaultCurrencyId =
        await new GeneralSettings().getGeneralSettings();
      const defCurrencyId = defaultCurrencyId.currencyId;
      currencyId = defCurrencyId;
    }

    const walletAggregateFilter = [
      {
        $project: {
          id: "$_id",
          user: 1,
          currencyId: 1,
          walletAmount: 1,
        },
      },
      {
        $match: {
          $and: [
            { user: ObjectId(user) },
            { currencyId: ObjectId(currencyId) },
          ],
        },
      },
    ];

    const walletData = await WalletModel.aggregate(walletAggregateFilter).then(
      (result) => result[0]
    );

    return walletData ? walletData.walletAmount : 0;
  }

  /*
  Author: Rockers Technologies, USA
  Usage: Get wallet transaction count / wallet transaction list by status.
  Function Name: getAllAggregatedWalletStatus()
  Paramaters:
    showCount
    limit
    filter (OPTIONAL)
    transactionType (OPTIONAL)
    walletType (OPTIONAL)
    transactionNumber (OPTIONAL)
  Response: Double / Object
*/
  async getAllAggregatedWalletStatus(
    showCount,
    limit,
    filter = "",
    transactionType = "",
    walletType = "",
    transactionNumber = ""
  ) {
    let aggregateFilter = [
      {
        $project: {
          id: "$_id",
          user: 1,
          walletId: 1,
          transactionNumber: 1,
          transactionId: 1,
          currencyId: 1,
          amount: 1,
          feesDetails: 1,
          walletType: 1,
          gatewayId: 1,
          status: 1,
          description: 1,
          acknowledgeDocument: 1,
          accountType: 1,
          bankName: 1,
          accountNumber: 1,
          routingNumber: 1,
          ipAddress: 1,
          campaignId: 1,
          rejectReason: 1,
          investorId: 1,
          transactionType: 1,
          createdAt: 1,
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
                email: 1,
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
          pipeline: [{ $project: { code: 1, symbol: 1 } }],
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
      { $sort: { id: -1 } },
    ];

    const mainFilter = [];

    if (filter) {
      mainFilter.push({ status: { $in: filter } });
    }
    if (transactionType) {
      mainFilter.push({ transactionType: transactionType });
    }

    if (walletType) {
      mainFilter.push({ walletType: walletType });
    }

    if (transactionNumber) {
      mainFilter.push({ transactionNumber: transactionNumber });
    }

    if (mainFilter.length > 0) {
      if (mainFilter.length === 1) {
        aggregateFilter.push({ $match: mainFilter[0] });
      } else {
        aggregateFilter.push({ $match: { $and: mainFilter } });
      }
    }

    if (showCount === "no") {
      aggregateFilter = [...aggregateFilter, { $limit: limit }];
    }
    const res = await WalletTransactionModel.aggregate(aggregateFilter);

    return showCount === "no" ? res : res.length;
  }
};
