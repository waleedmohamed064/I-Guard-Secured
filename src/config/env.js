const path = require("path");

const {
  PORT = 5000,
  MONGODB_URI,
  JWT_SECRET,
  NODE_ENV = "development",
} = process.env;

const REQUIRED_ENV_VARS = ["MONGODB_URI", "JWT_SECRET"];

function ensureEnv() {
  const missing = REQUIRED_ENV_VARS.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
  }

  // ✅ JWT Secret strength check
  if (JWT_SECRET.length < 32) {
    throw new Error("JWT_SECRET must be at least 32 characters long for security.");
  }
}

module.exports = {
  env: {
    port: Number(PORT),
    mongoUri: MONGODB_URI,
    jwtSecret: JWT_SECRET,
    nodeEnv: NODE_ENV,
    isProduction: NODE_ENV === "production",
    publicDir: path.resolve(__dirname, "../../public"),
  },
  ensureEnv,
};
