const express = require('express');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const {
  auth,
  authorize,
  requireApprovedInstitution,
} = require('../middleware/auth');

const router = express.Router();

router.use(auth, authorize('institution'), requireApprovedInstitution);

router.get('/', async (req, res) => {
  const staff = await User.find({
    role: 'institution_staff',
    parentInstitution: req.user._id,
  }).select('-password');

  res.json({ success: true, staff });
});

router.post(
  '/',
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

    const { name, email, password, staffPermissions } = req.body;

    if (await User.findOne({ email })) {
      return res.status(400).json({ success: false, message: 'Email already registered' });
    }

    const staff = await User.create({
      name,
      email,
      password,
      role: 'institution_staff',
      institutionName: req.user.institutionName,
      parentInstitution: req.user._id,
      institutionApproved: true,
      staffPermissions: {
        manageStudents: Boolean(staffPermissions?.manageStudents),
        issueCertificates: Boolean(staffPermissions?.issueCertificates),
        revokeCertificates: Boolean(staffPermissions?.revokeCertificates),
        viewBlockchain: Boolean(staffPermissions?.viewBlockchain),
      },
    });

    res.status(201).json({ success: true, staff });
  }
);

router.patch('/:id', async (req, res) => {
  const staff = await User.findOne({
    _id: req.params.id,
    role: 'institution_staff',
    parentInstitution: req.user._id,
  });

  if (!staff) {
    return res.status(404).json({ success: false, message: 'Staff member not found' });
  }

  if (req.body.staffPermissions) {
    staff.staffPermissions = {
      manageStudents: Boolean(req.body.staffPermissions.manageStudents),
      issueCertificates: Boolean(req.body.staffPermissions.issueCertificates),
      revokeCertificates: Boolean(req.body.staffPermissions.revokeCertificates),
      viewBlockchain: Boolean(req.body.staffPermissions.viewBlockchain),
    };
  }

  if (typeof req.body.isActive === 'boolean') {
    staff.isActive = req.body.isActive;
  }

  await staff.save();
  res.json({ success: true, staff });
});

module.exports = router;
