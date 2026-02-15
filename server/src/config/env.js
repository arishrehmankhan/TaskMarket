const dotenv = require('dotenv');

dotenv.config();

const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT || 4000),
  clientOrigin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  mongoUri: process.env.MONGODB_URI,
  jwtSecret: process.env.JWT_SECRET || 'dev-taskmarket-secret-change-me',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  adminEmail: (process.env.ADMIN_EMAIL || 'admin@taskmarket.local').trim().toLowerCase(),
  adminPassword: process.env.ADMIN_PASSWORD || 'ChangeMe123!',
  adminFullName: (process.env.ADMIN_FULL_NAME || 'TaskMarket Admin').trim(),
};

if (!env.mongoUri) {
  throw new Error('Missing required environment variable: MONGODB_URI');
}

if (env.nodeEnv === 'production' && !process.env.ADMIN_PASSWORD) {
  throw new Error('Missing required environment variable in production: ADMIN_PASSWORD');
}

if (!env.adminPassword || env.adminPassword.length < 8) {
  throw new Error('ADMIN_PASSWORD must be at least 8 characters');
}

module.exports = env;
