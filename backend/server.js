require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const connectDB = require('./config/db');
const blockchain = require('./services/blockchain');
const { helmet, authLimiter, verifyLimiter } = require('./middleware/security');

const app = express();
const PORT = process.env.PORT || 3000;

if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 16) {
  console.warn('Warning: Set a strong JWT_SECRET in .env for production.');
}

app.set("trust proxy", 1);
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: process.env.CORS_ORIGIN || true }));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

app.use('/api/auth', authLimiter, require('./routes/auth'));
app.use('/api/verify', verifyLimiter, require('./routes/verify'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/auditor', require('./routes/auditor'));
app.use('/api/institution/staff', require('./routes/institutionStaff'));
app.use('/api/students', require('./routes/students'));
app.use('/api/certificates', require('./routes/certificates'));
app.use('/api/blockchain', require('./routes/blockchain'));

app.use(express.static(path.join(__dirname, '../frontend')));

app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'Academic Certificate Verification System API',
    blockchain: blockchain.isReady(),
    database: mongooseConnectionReady(),
  });
});

function mongooseConnectionReady() {
  const mongoose = require('mongoose');
  return mongoose.connection.readyState === 1;
}

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ success: false, message: 'Internal server error' });
});

async function start() {
  try {
    await connectDB();
    blockchain.initBlockchain();

    const server = app.listen(PORT, () => {
      console.log(`CertiChain server running at http://localhost:${PORT}`);
    });

    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.error(`Port ${PORT} is already in use. Stop the other process or set PORT in .env.`);
        process.exit(1);
      }
      throw err;
    });
  } catch (err) {
    console.error('Failed to start server:', err.message);
    process.exit(1);
  }
}

start();
