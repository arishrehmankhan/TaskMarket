const ApiError = require('../utils/api-error');

function errorHandler(err, _req, res, _next) {
  const isKnown = err instanceof ApiError;
  const statusCode = isKnown ? err.statusCode : 500;
  const code = isKnown ? err.code : 'INTERNAL_SERVER_ERROR';
  const message = isKnown ? err.message : 'Something went wrong';
  const details = Array.isArray(err.details) ? err.details : [];

  if (!isKnown) {
    console.error(err);
  }

  res.status(statusCode).json({
    error: {
      code,
      message,
      details,
    },
  });
}

module.exports = errorHandler;
