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
  const isProduction = process.env.NODE_ENV === 'production';
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/certificate_verification';
  const useMemoryDb = process.env.USE_MEMORY_DB === 'true';

  if (useMemoryDb && isProduction) {
    throw new Error(
      'USE_MEMORY_DB is not supported in production. ' +
      'Set MONGODB_URI to a hosted database (e.g. MongoDB Atlas) and USE_MEMORY_DB=false.'
    );
  }

  if (useMemoryDb) {
    const { MongoMemoryServer } = require('mongodb-memory-server');
    memoryServer = await MongoMemoryServer.create();
    await mongoose.connect(memoryServer.getUri());
    console.log('In-memory MongoDB connected (USE_MEMORY_DB=true)');
    await seedAdminIfNeeded();
    return;
  }

  if (isProduction && !process.env.MONGODB_URI) {
    throw new Error(
      'MONGODB_URI is required in production. ' +
      'Create a free cluster at https://www.mongodb.com/atlas and set the connection string in your hosting env vars.'
    );
  }

  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 });
    console.log('MongoDB connected');
    await seedAdminIfNeeded();
  } catch (err) {
    console.error('\n❌ Could not connect to MongoDB\n');
    console.error('Fix options:');
    console.error('  1. Install MongoDB: winget install MongoDB.Server');
    console.error('  2. Start the service:  net start MongoDB');
    console.error('  3. Or use MongoDB Atlas — set MONGODB_URI in .env');
    console.error('  4. Or set USE_MEMORY_DB=true in .env (local dev only)\n');
    throw err;
  }
};

module.exports = connectDB;
