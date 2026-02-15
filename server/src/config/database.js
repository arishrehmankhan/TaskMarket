const mongoose = require('mongoose');

let connectionPromise;

async function connectDatabase(mongoUri) {
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  if (connectionPromise) {
    return connectionPromise;
  }

  mongoose.set('strictQuery', true);
  connectionPromise = mongoose.connect(mongoUri).catch((error) => {
    connectionPromise = undefined;
    throw error;
  });

  return connectionPromise;
}

module.exports = {
  connectDatabase,
};
