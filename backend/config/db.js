const mongoose = require('mongoose');

let memoryServer;

async function seedAdminIfNeeded() {
  const User = require('../models/User');
  const exists = await User.findOne({ role: 'admin' });
  if (!exists) {
    await User.create({
      name: 'System Administrator',
      email: 'admin@certverify.edu',
      password: 'admin123',
      role: 'admin',
      institutionApproved: true,
    });
    console.log('Seeded admin: admin@certverify.edu / admin123');
  }

  const auditorExists = await User.findOne({ role: 'auditor' });
  if (!auditorExists) {
    await User.create({
      name: 'Compliance Auditor',
      email: 'auditor@certverify.edu',
      password: 'auditor123',
      role: 'auditor',
      institutionApproved: true,
    });
    console.log('Seeded auditor: auditor@certverify.edu / auditor123');
  }
}

const connectDB = async () => {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/certificate_verification';

  if (process.env.USE_MEMORY_DB === 'true') {
    const { MongoMemoryServer } = require('mongodb-memory-server');
    memoryServer = await MongoMemoryServer.create({
      binary: { version: '6.0.14' },
    });
    await mongoose.connect(memoryServer.getUri());
    console.log('In-memory MongoDB connected (USE_MEMORY_DB=true)');
    await seedAdminIfNeeded();
    return;
  }

  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
    console.log('MongoDB connected');
  } catch (err) {
    console.error('\n❌ MongoDB is not running at 127.0.0.1:27017\n');
    console.error('Fix options:');
    console.error('  1. Install MongoDB: winget install MongoDB.Server');
    console.error('  2. Start the service:  net start MongoDB');
    console.error('  3. Or use MongoDB Atlas — set MONGODB_URI in .env');
    console.error('  4. Or set USE_MEMORY_DB=true in .env (dev only, first run downloads MongoDB)\n');
    throw err;
  }
};

module.exports = connectDB;
