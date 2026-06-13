require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../backend/models/User');

async function seed() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/certificate_verification');

  const adminExists = await User.findOne({ role: 'admin' });
  if (!adminExists) {
    await User.create({
      name: 'System Administrator',
      email: 'admin@certverify.edu',
      password: 'admin123',
      role: 'admin',
      institutionApproved: true,
    });
    console.log('Admin created: admin@certverify.edu / admin123');
  } else {
    console.log('Admin already exists');
  }

  await mongoose.disconnect();
  console.log('Seed complete');
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
