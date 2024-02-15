// ADMIN ROUTES
const adminRouter = require("../adminModules/adminAuthentication/routes/adminRoutes");

// FRONT ROUTES
const walletRoutes = require("../wallets/routes/walletRoutes");
const myInvestmentsRouter = require("../myInvestments/routes/myInvestmentsRoutes");

module.exports = (app) => {
  // ADMIN ROUTES
  app.use(`${process.env.VERSIONING_URL}admins`, adminRouter);

  // FRONT ROUTES
  app.use(`${process.env.VERSIONING_URL}wallet`, walletRoutes);
  app.use(`${process.env.VERSIONING_URL}my-investment`, myInvestmentsRouter);
};
