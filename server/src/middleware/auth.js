const User = require('../models/user.model');
const ApiError = require('../utils/api-error');
const { verifyAuthToken } = require('../utils/jwt');

async function requireAuth(req, _res, next) {
  const authorization = req.headers.authorization || '';
  const [scheme, token] = authorization.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return next(new ApiError(401, 'UNAUTHORIZED', 'Authentication required'));
  }

  let payload;
  try {
    payload = verifyAuthToken(token);
  } catch (_error) {
    return next(new ApiError(401, 'UNAUTHORIZED', 'Invalid or expired token'));
  }

  const user = await User.findById(payload.sub).lean();
  if (!user) {
    return next(new ApiError(401, 'UNAUTHORIZED', 'Invalid token subject'));
  }

  req.auth = {
    userId: String(user._id),
    role: user.role,
  };

  return next();
}

function requireRole(allowedRoles) {
  return function roleGuard(req, _res, next) {
    if (!req.auth) {
      return next(new ApiError(401, 'UNAUTHORIZED', 'Authentication required'));
    }

    if (!allowedRoles.includes(req.auth.role)) {
      return next(new ApiError(403, 'FORBIDDEN', 'Insufficient permissions'));
    }

    return next();
  };
}

module.exports = {
  requireAuth,
  requireRole,
};