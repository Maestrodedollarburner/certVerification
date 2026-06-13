const express = require('express');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const Student = require('../models/Student');
const Certificate = require('../models/Certificate');
const VerificationLog = require('../models/VerificationLog');
const { auth, authorize } = require('../middleware/auth');
const blockchain = require('../services/blockchain');

const router = express.Router();

router.use(auth, authorize('admin'));

router.get('/stats', async (req, res) => {
  const [users, institutions, students, certificates, verifications, blockchainStats] =
    await Promise.all([
      User.countDocuments(),
      User.countDocuments({ role: 'institution' }),
      Student.countDocuments(),
      Certificate.countDocuments(),
      VerificationLog.countDocuments(),
      blockchain.getBlockchainStats(),
    ]);

  const recentCerts = await Certificate.find()
    .sort({ createdAt: -1 })
    .limit(5)
    .select('certificateId studentName institutionName issueDate status');

  const recentVerifications = await VerificationLog.find()
    .sort({ createdAt: -1 })
    .limit(5);

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
    recentCertificates: recentCerts,
    recentVerifications,
  });
});

router.get('/users', async (req, res) => {
  const { role, search } = req.query;
  const filter = {};
  if (role) filter.role = role;
  if (search) {
    filter.$or = [
      { name: new RegExp(search, 'i') },
      { email: new RegExp(search, 'i') },
    ];
  }

  const users = await User.find(filter).sort({ createdAt: -1 });
  res.json({ success: true, users });
});

router.patch('/users/:id/approve', async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user || user.role !== 'institution') {
    return res.status(404).json({ success: false, message: 'Institution not found' });
  }

  user.institutionApproved = true;
  await user.save();
  res.json({ success: true, message: 'Institution approved', user });
});

router.patch('/users/:id/toggle-active', async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ success: false, message: 'User not found' });

  user.isActive = !user.isActive;
  await user.save();
  res.json({ success: true, user });
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

router.post(
  '/auditors',
  [
    body('name').trim().notEmpty(),
    body('email').isEmail(),
    body('password').isLength({ min: 6 }),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { name, email, password } = req.body;

    if (await User.findOne({ email })) {
      return res.status(400).json({ success: false, message: 'Email already registered' });
    }

    const auditor = await User.create({
      name,
      email,
      password,
      role: 'auditor',
      institutionApproved: true,
    });

    res.status(201).json({ success: true, auditor });
  }
);

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
