const express = require('express');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const Student = require('../models/Student');
const { auth } = require('../middleware/auth');

const router = express.Router();

const signToken = (user) =>
  jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });

router.post(
  '/register',
  [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('email').isEmail().withMessage('Valid email required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('role').isIn(['institution', 'student', 'employer']).withMessage('Invalid role'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { name, email, password, role, institutionName, studentId } = req.body;

    if (await User.findOne({ email })) {
      return res.status(400).json({ success: false, message: 'Email already registered' });
    }

    if (role === 'institution' && !institutionName?.trim()) {
      return res.status(400).json({ success: false, message: 'Institution name is required' });
    }

    if (role === 'student') {
      if (!studentId?.trim()) {
        return res.status(400).json({ success: false, message: 'Student ID is required' });
      }

      const studentRecord = await Student.findOne({ studentId: studentId.trim() });
      if (!studentRecord) {
        return res.status(400).json({
          success: false,
          message: 'Student ID not found. Your institution must register you first.',
        });
      }

      if (studentRecord.isRegistered) {
        return res.status(400).json({
          success: false,
          message: 'This student ID is already linked to an account.',
        });
      }

      if (studentRecord.email && studentRecord.email !== email.toLowerCase()) {
        return res.status(400).json({
          success: false,
          message: 'Email does not match the record held by your institution.',
        });
      }

      const user = await User.create({
        name: studentRecord.fullName,
        email,
        password,
        role: 'student',
        studentId: studentRecord.studentId,
        institutionApproved: true,
      });

      studentRecord.registeredUser = user._id;
      studentRecord.isRegistered = true;
      if (!studentRecord.email) studentRecord.email = email.toLowerCase();
      await studentRecord.save();

      const token = signToken(user);
      return res.status(201).json({
        success: true,
        message: 'Registration successful',
        token,
        user,
      });
    }

    const user = await User.create({
      name,
      email,
      password,
      role,
      institutionName: role === 'institution' ? institutionName : undefined,
      institutionApproved: role !== 'institution',
      studentId: undefined,
    });

    const token = signToken(user);

    res.status(201).json({
      success: true,
      message: role === 'institution' ? 'Registration pending admin approval' : 'Registration successful',
      token,
      user,
    });
  }
);

router.post(
  '/login',
  [
    body('email').isEmail(),
    body('password').notEmpty(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { email, password } = req.body;
    const user = await User.findOne({ email });

    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    if (!user.isActive) {
      return res.status(403).json({ success: false, message: 'Account deactivated' });
    }

    if (user.role === 'institution' && !user.institutionApproved) {
      return res.status(403).json({
        success: false,
        message: 'Institution account pending admin approval',
      });
    }

    if (user.role === 'institution_staff') {
      const parent = await User.findById(user.parentInstitution);
      if (!parent || !parent.isActive || !parent.institutionApproved) {
        return res.status(403).json({
          success: false,
          message: 'Your institution account is not active or approved',
        });
      }
    }

    const token = signToken(user);

    res.json({ success: true, token, user });
  }
);

router.get('/me', auth, (req, res) => {
  res.json({ success: true, user: req.user });
});

module.exports = router;
