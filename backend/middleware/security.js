const rateLimit = require('express-rate-limit');
const helmet = require('helmet');

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: { success: false, message: 'Too many attempts. Try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const verifyLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  message: { success: false, message: 'Too many verification requests.' },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = { helmet, authLimiter, verifyLimiter };
