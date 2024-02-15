/*
  Author: Rockers Technologies, USA
  Usage: Send response data to the API calling server with status code passed in parameters and json formated data.
  Function Name: responseSuccess()
  Paramaters:
    successData
    statusCode
    statusMsg
    res
  Return: JSON Data
*/
exports.responseSuccess = (successData, statusCode, statusMsg, res) => {
  res.status(statusCode).json({
    status: statusMsg,
    data: {
      data: successData,
    },
  });
};

/*
  Author: Rockers Technologies, USA
  Usage: Send response messages to the API calling server with status code passed in parameters.
  Function Name: responseSuccess()
  Paramaters:
    resData
    statusCode
    statusMsg
    res
  Return: JSON Data
*/
exports.responseSend = (resData, statusCode, statusMsg, res) => {
  res.status(statusCode).json({
    status: statusMsg,
    message: resData,
  });
};

/*
  Author: Rockers Technologies, USA
  Usage: Send response with Express-Validator Error message to the API calling server with status code passed in parameters.
  Function Name: responseSuccess()
  Paramaters:
    errorData
    statusCode
    res
  Return: JSON Data
*/
exports.validations = (errorData, statusCode, res) => {
  res.status(statusCode).json({
    errors: errorData,
  });
};
