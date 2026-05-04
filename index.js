require("dotenv").config();

const { getApp, startServer } = require("./src/app");
const mongoose = require("mongoose");

function classifyInitializationError(error) {
  if (error?.message?.startsWith("Missing required environment variables:")) {
    const missing = error.message
      .replace("Missing required environment variables:", "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);

    return {
      status: 500,
      body: {
        error: "Server configuration is incomplete.",
        code: "MISSING_ENV_VARS",
        missing,
      },
    };
  }

  if (
    error instanceof mongoose.Error ||
    error?.name === "MongoServerSelectionError" ||
    error?.name === "MongoParseError" ||
    error?.name === "MongooseServerSelectionError"
  ) {
    return {
      status: 500,
      body: {
        error: "Database connection failed.",
        code: "DATABASE_CONNECTION_FAILED",
      },
    };
  }

  return {
    status: 500,
    body: {
      error: "Server failed to initialize.",
      code: "SERVER_INIT_FAILED",
    },
  };
}

async function handler(req, res) {
  try {
    const app = await getApp();
    return app(req, res);
  } catch (error) {
    console.error("Failed to initialize app:", error);
    const response = classifyInitializationError(error);
    return res.status(response.status).json(response.body);
  }
}

if (require.main === module) {
  startServer().catch((error) => {
    console.error("Failed to start server:", error.message);
    process.exit(1);
  });
}

module.exports = handler;
