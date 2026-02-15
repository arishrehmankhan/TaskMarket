const ApiError = require('../utils/api-error');

function notFound(req, _res, next) {
  next(new ApiError(404, 'NOT_FOUND', `Route not found: ${req.method} ${req.originalUrl}`));
}

module.exports = notFound;
