const express = require('express');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const Student = require('../models/Student');
const Certificate = require('../models/Certificate');
const VerificationLog = require('../models/VerificationLog');
const { auth, authorize } = require('../middleware/auth');
const blockchain = require('../services/blockchain');

const router = express.Router();

router.use(auth, authorize('auditor'));

router.get('/overview', async (req, res) => {
  const [users, institutions, students, certificates, verifications, blockchainStats] =
    await Promise.all([
      User.countDocuments(),
      User.countDocuments({ role: 'institution' }),
      Student.countDocuments(),
      Certificate.countDocuments(),
      VerificationLog.countDocuments(),
      blockchain.getBlockchainStats(),
    ]);

  res.json({
    success: true,
    stats: {
      totalUsers: users,
      totalInstitutions: institutions,
      totalStudents: students,
      totalCertificates: certificates,
      totalVerifications: verifications,
      blockchain: blockchainStats,
    },
  });
});

router.get('/certificates', async (req, res) => {
  const { search, status } = req.query;
  const filter = {};
  if (status) filter.status = status;
  if (search) {
    filter.$or = [
      { certificateId: new RegExp(search, 'i') },
      { studentName: new RegExp(search, 'i') },
      { institutionName: new RegExp(search, 'i') },
    ];
  }

  const certificates = await Certificate.find(filter)
    .sort({ issueDate: -1 })
    .limit(100)
    .select('-qrCode');

  res.json({ success: true, certificates });
});

router.get('/verifications', async (req, res) => {
  const logs = await VerificationLog.find()
    .sort({ createdAt: -1 })
    .limit(50)
    .populate('verifiedBy', 'name email role');

  res.json({ success: true, verifications: logs });
});

router.get('/users', async (req, res) => {
  const { role } = req.query;
  const filter = {};
  if (role) filter.role = role;

  const users = await User.find(filter)
    .sort({ createdAt: -1 })
    .select('name email role institutionName institutionApproved isActive createdAt');

  res.json({ success: true, users });
});

router.get('/reports', async (req, res) => {
  const certsByInstitution = await Certificate.aggregate([
    { $group: { _id: '$institutionName', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
  ]);

  const verificationsByResult = await VerificationLog.aggregate([
    { $group: { _id: '$result', count: { $sum: 1 } } },
  ]);

  const monthlyIssuance = await Certificate.aggregate([
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m', date: '$issueDate' } },
        count: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  res.json({
    success: true,
    reports: { certsByInstitution, verificationsByResult, monthlyIssuance },
  });
});

module.exports = router;
