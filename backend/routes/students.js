const express = require('express');
const { body, validationResult } = require('express-validator');
const Student = require('../models/Student');
const {
  auth,
  requireApprovedInstitution,
  requireInstitutionMember,
  requirePermission,
  getInstitutionId,
} = require('../middleware/auth');

const router = express.Router();

const institutionAccess = [auth, requireInstitutionMember, requireApprovedInstitution];

router.get('/', ...institutionAccess, requirePermission('manageStudents'), async (req, res) => {
  const institutionId = getInstitutionId(req.user);
  const { search } = req.query;
  const filter = { institution: institutionId };

  if (search) {
    filter.$or = [
      { fullName: new RegExp(search, 'i') },
      { studentId: new RegExp(search, 'i') },
      { department: new RegExp(search, 'i') },
    ];
  }

  const students = await Student.find(filter).sort({ createdAt: -1 });
  res.json({ success: true, students });
});

router.get('/:id', ...institutionAccess, requirePermission('manageStudents'), async (req, res) => {
  const student = await Student.findOne({
    _id: req.params.id,
    institution: getInstitutionId(req.user),
  });

  if (!student) {
    return res.status(404).json({ success: false, message: 'Student not found' });
  }

  res.json({ success: true, student });
});

router.post(
  '/',
  ...institutionAccess,
  requirePermission('manageStudents'),
  [
    body('studentId').trim().notEmpty(),
    body('fullName').trim().notEmpty(),
    body('department').trim().notEmpty(),
    body('programme').trim().notEmpty(),
    body('graduationYear').isInt({ min: 1990, max: 2100 }),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { studentId, fullName, email, department, programme, graduationYear } = req.body;
    const institutionId = getInstitutionId(req.user);
    const institutionName =
      req.user.role === 'institution'
        ? req.user.institutionName
        : req.institutionAccount?.institutionName || req.user.institutionName;

    if (await Student.findOne({ studentId })) {
      return res.status(400).json({ success: false, message: 'Student ID already exists' });
    }

    const student = await Student.create({
      studentId,
      fullName,
      email,
      department,
      programme,
      graduationYear,
      institution: institutionId,
      institutionName,
    });

    res.status(201).json({ success: true, student });
  }
);

router.put('/:id', ...institutionAccess, requirePermission('manageStudents'), async (req, res) => {
  const student = await Student.findOne({
    _id: req.params.id,
    institution: getInstitutionId(req.user),
  });

  if (!student) {
    return res.status(404).json({ success: false, message: 'Student not found' });
  }

  const { fullName, email, department, programme, graduationYear } = req.body;
  if (fullName) student.fullName = fullName;
  if (email !== undefined) student.email = email;
  if (department) student.department = department;
  if (programme) student.programme = programme;
  if (graduationYear) student.graduationYear = graduationYear;

  await student.save();
  res.json({ success: true, student });
});

module.exports = router;
