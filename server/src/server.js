const app = require('./app');
const env = require('./config/env');
const { connectDatabase } = require('./config/database');
const ensureAdminUser = require('./utils/ensure-admin');

async function startServer() {
  await connectDatabase(env.mongoUri);
  const seededAdmin = await ensureAdminUser(env);

  if (seededAdmin.created) {
    console.log(`Bootstrapped admin user: ${seededAdmin.email}`);
  }

  app.listen(env.port, () => {
    console.log(`TaskMarket API listening on port ${env.port}`);
  });
}

startServer().catch((error) => {
  console.error('Failed to start server', error);
  process.exit(1);
});
