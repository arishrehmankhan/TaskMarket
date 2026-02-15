const ApiError = require('../utils/api-error');

function validateBody(schema) {
  return function validateRequestBody(req, _res, next) {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      const details = result.error.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
      }));

      return next(new ApiError(400, 'VALIDATION_ERROR', 'Invalid input', details));
    }

    req.body = result.data;
    return next();
  };
}

function validateParams(schema) {
  return function validateRequestParams(req, _res, next) {
    const result = schema.safeParse(req.params);

    if (!result.success) {
      const details = result.error.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
      }));

      return next(new ApiError(400, 'VALIDATION_ERROR', 'Invalid input', details));
    }

    req.params = result.data;
    return next();
  };
}

module.exports = {
  validateBody,
  validateParams,
};
