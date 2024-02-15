const moment = require('moment-timezone');
const path = require("path");
const express = require("express");
const bodyParser = require("body-parser");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");
const { StatusCodes } = require("http-status-codes");
const helmet = require("helmet");
const mongoSanitize = require("express-mongo-sanitize");
const xss = require("xss-clean");
const hpp = require("hpp");
const cors = require("cors");
const swaggerUi = require("swagger-ui-express");

const AppError = require("./../utils/appError");
const globalErrorHandler = require("./../helpers/errorsFactory");
const languages = require("./language");
const setRoutes = require("./routes");

const app = express();

// const dateThailand = moment.tz(Date.now(), process.env.TZ);
// var local = moment.utc(Date.now()).local().format();
require("./cron.js");

// IMPLEMENT CORS WITH WHITELIST DOMAINS
const whitelist = [
  "https://reactdemo.equityfundingscript.com",
  "http://reactdemo.equityfundingscript.com",
  "https://demoadmin.equityfundingscript.com",
  "http://demoadmin.equityfundingscript.com"
];
const corsOptions = {
  origin: function (origin, callback) {
    if (whitelist.indexOf(origin) !== -1 || !origin) {
      callback(null, true);
    } else {
      console.log(`false: ${origin}`);
      callback(new Error("Not allowed by CORS"));
    }
  },
};

app.use(cors(corsOptions));

// IMPLEMENT DEFAULT CORS
// app.use(cors());
app.options("*", cors(corsOptions));

// PRE-FLIGHT REQUEST
//app.options('*', cors());

const swaggerSpec = require("./swagger");

app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET,POST,PUT,PATCH,DELETE,OPTIONS"
  );
  res.setHeader(
    "Access-Control-Allow-Headers",
    "X-Requested-With,content-type"
  );
  res.setHeader("Access-Control-Allow-Credentials", true);
  res.setHeader("Access-Control-Allow-Private-Network", true);
  // res.setHeader('Access-Control-Allow-Methods','Content-Type','Authorization');
  next();
});

app.use(
  "/api-docs",
  swaggerUi.serve,
  swaggerUi.setup(swaggerSpec, { explorer: true })
);

app.set("view engine", "pug");
app.set("templates", path.normalize(path.join(__dirname, "../templates")));

app.use(languages);
app.use(helmet());

if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}

const limiter = rateLimit({
  max: 10000,
  windowMs: 60 * 60 * 1000,
  message: "Too many requests from this IP, please try again in an hour!",
});

app.use("/api", limiter);

// Express 3.0
app.use(express.json({ limit: '50mb' }));

// Express 4.0
app.use(bodyParser.json({limit: '50mb'}));
app.use(bodyParser.urlencoded({limit: '50mb', extended: true}));

app.use(mongoSanitize());
app.use(xss());
app.use(hpp());

app.use(
  express.static(path.normalize(path.join(__dirname, "../../public")), {
    maxAge: 86400000,
  })
);

setRoutes(app);

app.all("*", (req, res, next) => {
  next(
    new AppError(
      `Can't find ${req.originalUrl} on this server!`,
      StatusCodes.NOT_FOUND
    )
  );
});

app.use(globalErrorHandler);

module.exports = app;