const path = require("path");
const express = require("express");
const morgan = require("morgan");
const cookieParser = require("cookie-parser");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const cors = require("cors");
const { connectDatabase } = require("./config/database");
const { ensureEnv, env } = require("./config/env");
const { attachUserIfPresent } = require("./middleware/authMiddleware");
const authRoutes = require("./routes/authRoutes");
const searchRoutes = require("./routes/searchRoutes");

let appInstance = null;
let appPromise = null;

function sendPage(res, pageName) {
  res.sendFile(path.join(env.publicDir, pageName));
}

// ✅ Rate limiters
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests. Please try again later." },
});

const searchLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many search requests. Please slow down." },
});

function createApp() {
  const app = express();

  // ✅ Security headers
  app.use(helmet());

  // ✅ CORS
  app.use(
    cors({
      origin: env.isProduction ? false : true,
      credentials: true,
    })
  );

  app.use(morgan("dev"));

  // ✅ Body size limit
  app.use(express.json({ limit: "10kb" }));
  app.use(cookieParser());
  app.use(express.static(env.publicDir));

  app.get("/api/health", (req, res) => {
    res.json({ ok: true, environment: env.nodeEnv });
  });

  // ✅ Apply rate limiters per route group
  app.use("/api/auth", authLimiter, authRoutes);
  app.use("/api/search", searchLimiter, searchRoutes);

  app.get("/", attachUserIfPresent, (req, res) => {
    if (req.user) {
      return res.redirect("/search");
    }

    return res.redirect("/login");
  });

  app.get("/login", attachUserIfPresent, (req, res) => {
    if (req.user) {
      return res.redirect("/search");
    }

    return sendPage(res, "login.html");
  });

  app.get("/register", attachUserIfPresent, (req, res) => {
    if (req.user) {
      return res.redirect("/search");
    }

    return sendPage(res, "register.html");
  });

  app.get("/search", attachUserIfPresent, (req, res) => {
    if (!req.user) {
      return res.redirect("/login");
    }

    return sendPage(res, "search.html");
  });

  app.use("/api", (req, res) => {
    res.status(404).json({ error: "Route not found." });
  });

  app.use((req, res) => {
    res.redirect("/");
  });

  return app;
}

async function getApp() {
  if (appInstance) {
    return appInstance;
  }

  if (!appPromise) {
    appPromise = (async () => {
      ensureEnv();
      await connectDatabase();
      const app = createApp();
      appInstance = app;
      return app;
    })().catch((error) => {
      appPromise = null;
      throw error;
    });
  }

  return appPromise;
}

async function startServer() {
  const app = await getApp();

  return new Promise((resolve) => {
    const server = app.listen(env.port, () => {
      console.log(`Server listening on http://localhost:${env.port}`);
      resolve(server);
    });
  });
}

module.exports = {
  createApp,
  getApp,
  startServer,
};
