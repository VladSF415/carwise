// Shared auth module — JWT access/refresh. JWT-only (no Firebase).
// Reusable verbatim across all 5 extension servers.
'use strict';

const crypto  = require('crypto');
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');

const ACCESS_TTL_SEC  = 3600;              // 1h, mirrors Firebase idToken
const REFRESH_TTL_DAYS = 60;

function _secret() {
  const s = process.env.JWT_SECRET;
  if (!s) throw new Error('JWT_SECRET not set');
  return s;
}

async function hashPassword(pw) {
  return bcrypt.hash(pw, 12);
}
async function verifyPassword(pw, hash) {
  if (!hash) return false;
  return bcrypt.compare(pw, hash);
}

function signAccessToken(user) {
  return jwt.sign(
    { sub: user.id, email: user.email, plan: user.plan },
    _secret(),
    { expiresIn: ACCESS_TTL_SEC }
  );
}

function newRefreshTokenValue() {
  return crypto.randomBytes(40).toString('hex');
}
function refreshExpiry() {
  return new Date(Date.now() + REFRESH_TTL_DAYS * 86400 * 1000);
}

function newVerifyToken() {
  return {
    token:   crypto.randomBytes(32).toString('hex'),
    expires: new Date(Date.now() + 24 * 3600 * 1000), // 24h
  };
}

function newResetToken() {
  return {
    token:   crypto.randomBytes(32).toString('hex'),
    expires: new Date(Date.now() + 2 * 3600 * 1000), // 2h — shorter for reset
  };
}

// JWT-only auth middleware.
function makeAuthMiddleware() {
  return function authMiddleware(req, res, next) {
    const hdr = req.headers.authorization || '';
    const token = hdr.startsWith('Bearer ') ? hdr.slice(7) : null;
    if (!token) return res.status(401).json({ error: 'Missing token' });
    try {
      const decoded = jwt.verify(token, _secret());
      req.userId = decoded.sub;
      return next();
    } catch (_) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
  };
}

module.exports = {
  ACCESS_TTL_SEC, REFRESH_TTL_DAYS,
  hashPassword, verifyPassword,
  signAccessToken, newRefreshTokenValue, refreshExpiry, newVerifyToken, newResetToken,
  makeAuthMiddleware,
};
