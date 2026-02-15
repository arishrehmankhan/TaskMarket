const app = require('../src/app');
const env = require('../src/config/env');
const { connectDatabase } = require('../src/config/database');
const ensureAdminUser = require('../src/utils/ensure-admin');

let startupPromise;
let adminBootstrapped = false;

async function prepareServer() {
  if (!startupPromise) {
    startupPromise = (async () => {
      await connectDatabase(env.mongoUri);

      if (!adminBootstrapped) {
        const seededAdmin = await ensureAdminUser(env);
        if (seededAdmin.created) {
          console.log(`Bootstrapped admin user: ${seededAdmin.email}`);
        }
        adminBootstrapped = true;
      }
    })().catch((error) => {
      startupPromise = undefined;
      throw error;
    });
  }

  return startupPromise;
}

module.exports = async (req, res) => {
  await prepareServer();
  return app(req, res);
};
