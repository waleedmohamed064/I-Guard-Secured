const mongoose = require("mongoose");
const { env } = require("./env");

let connectionPromise = null;
const DB_CONNECT_TIMEOUT_MS = 10000;

async function connectDatabase() {
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  if (!connectionPromise) {
    connectionPromise = mongoose
      .connect(env.mongoUri, {
        serverSelectionTimeoutMS: DB_CONNECT_TIMEOUT_MS,
      })
      .catch((error) => {
        connectionPromise = null;
        throw error;
      });
  }

  await connectionPromise;
  return mongoose.connection;
}

module.exports = { connectDatabase };
