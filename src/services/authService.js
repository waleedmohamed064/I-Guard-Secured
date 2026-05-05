const jwt = require("jsonwebtoken");
const { env } = require("../config/env");

const AUTH_COOKIE_NAME = "auth_token";
const JWT_EXPIRES_IN = "7d";

function getCookieOptions() {
  return {
    httpOnly: true,
    sameSite: env.isProduction ? "strict" : "lax",
    secure: env.isProduction,
    maxAge: 7 * 24 * 60 * 60 * 1000,
  };
}

function createToken(userId, tokenVersion) {
  return jwt.sign({ userId, tokenVersion }, env.jwtSecret, {
    expiresIn: JWT_EXPIRES_IN,
  });
}

function setAuthCookie(res, userId, tokenVersion) {
  res.cookie(
    AUTH_COOKIE_NAME,
    createToken(userId, tokenVersion),
    getCookieOptions(),
  );
}

function clearAuthCookie(res) {
  res.clearCookie(AUTH_COOKIE_NAME, {
    httpOnly: true,
    sameSite: "strict",
    secure: env.isProduction,
  });
}

function verifyToken(token) {
  return jwt.verify(token, env.jwtSecret);
}

module.exports = {
  AUTH_COOKIE_NAME,
  clearAuthCookie,
  setAuthCookie,
  verifyToken,
};
