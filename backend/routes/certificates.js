const express = require('express');
const crypto = require('crypto');
const QRCode = require('qrcode');
const { body, validationResult } = require('express-validator');
const Certificate = require('../models/Certificate');
const Student = require('../models/Student');
const User = require('../models/User');
const {
  auth,
  authorize,
  requireInstitutionMember,
  requireApprovedInstitution,
  requirePermission,
  getInstitutionId,
} = require('../middleware/auth');
const blockchain = require('../services/blockchain');
const { generateCertificatePDF } = require('../services/pdfService');

const router = express.Router();

function generateCertificateId() {
  return 'CERT-' + crypto.randomBytes(6).toString('hex').toUpperCase();
}

function requirePermissionCheck(user, permission) {
  if (user.role === 'institution') return true;
  if (user.role === 'institution_staff') return Boolean(user.staffPermissions?.[permission]);
  return false;
}

router.get('/my', auth, authorize('student'), async (req, res) => {
  const certs = await Certificate.find({ studentId: req.user.studentId }).sort({ issueDate: -1 });
  res.json({ success: true, certificates: certs });
});

router.get(
  '/institution',
  auth,
  requireInstitutionMember,
  requireApprovedInstitution,
  async (req, res) => {
    const institutionId = getInstitutionId(req.user);
    const certs = await Certificate.find({ institution: institutionId }).sort({ issueDate: -1 });
    res.json({ success: true, certificates: certs });
  }
);

router.post(
  '/issue',
  auth,
  requireInstitutionMember,
  requireApprovedInstitution,
  requirePermission('issueCertificates'),
  [
    body('studentId').trim().notEmpty(),
    body('degreeAwarded').trim().notEmpty(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const institutionId = getInstitutionId(req.user);
    const institutionName =
      req.user.role === 'institution'
        ? req.user.institutionName
        : req.institutionAccount?.institutionName || req.user.institutionName;

    const student = await Student.findOne({
      studentId: req.body.studentId,
      institution: institutionId,
    });

    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    if (process.env.REQUIRE_BLOCKCHAIN === 'true' && !blockchain.isReady()) {
      return res.status(503).json({
        success: false,
        message: 'Blockchain unavailable. Start Ganache, run npm run deploy, and restart the server.',
      });
    }

    const certificateId = generateCertificateId();
    const issueDate = new Date();

    const certData = {
      certificateId,
      studentId: student.studentId,
      studentName: student.fullName,
      institutionName,
      degreeAwarded: req.body.degreeAwarded,
      department: student.department,
      programme: student.programme,
      graduationYear: student.graduationYear,
      issueDate: issueDate.toISOString(),
    };

    const certificateHash = blockchain.generateCertificateHash(certData);
    const appUrl = process.env.APP_URL || `http://localhost:${process.env.PORT || 3000}`;
    const verificationUrl = `${appUrl}/verify.html?id=${certificateId}`;
    const qrCode = await QRCode.toDataURL(verificationUrl);

    let transactionHash = null;
    let blockNumber = null;
    let onChain = false;

    if (blockchain.isReady()) {
      try {
        const tx = await blockchain.issueCertificateOnChain(certData, certificateHash);
        transactionHash = tx.transactionHash;
        blockNumber = tx.blockNumber;
        onChain = true;
      } catch (err) {
        console.error('Blockchain issuance failed:', err.message);
        return res.status(500).json({
          success: false,
          message: `Blockchain recording failed: ${err.message}. Certificate not issued.`,
        });
      }
    }

    const certificate = await Certificate.create({
      certificateId,
      studentId: student.studentId,
      studentName: student.fullName,
      institution: institutionId,
      institutionName,
      degreeAwarded: req.body.degreeAwarded,
      department: student.department,
      programme: student.programme,
      graduationYear: student.graduationYear,
      certificateHash,
      transactionHash,
      blockNumber,
      issueDate,
      qrCode,
      verificationUrl,
      onChain,
      status: onChain ? 'Valid' : 'Pending',
    });

    res.status(201).json({
      success: true,
      message: onChain
        ? 'Certificate issued and recorded on blockchain'
        : 'Certificate saved locally (blockchain not required)',
      certificate,
    });
  }
);

router.get('/:certificateId/download', auth, async (req, res) => {
  const cert = await Certificate.findOne({ certificateId: req.params.certificateId });

  if (!cert) {
    return res.status(404).json({ success: false, message: 'Certificate not found' });
  }

  const institutionId = getInstitutionId(req.user);
  const isOwner =
    (req.user.role === 'student' && req.user.studentId === cert.studentId) ||
    (institutionId && cert.institution.toString() === institutionId.toString()) ||
    req.user.role === 'admin';

  if (!isOwner) {
    return res.status(403).json({ success: false, message: 'Access denied' });
  }

  const pdf = await generateCertificatePDF(cert);
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${cert.certificateId}.pdf"`);
  res.send(pdf);
});

router.get('/:certificateId', auth, async (req, res) => {
  const cert = await Certificate.findOne({ certificateId: req.params.certificateId });

  if (!cert) {
    return res.status(404).json({ success: false, message: 'Certificate not found' });
  }

  res.json({ success: true, certificate: cert });
});

async function revokeCertificate(req, res) {
  const cert = await Certificate.findOne({ certificateId: req.params.certificateId });
  if (!cert) {
    return res.status(404).json({ success: false, message: 'Certificate not found' });
  }

  const isAdmin = req.user.role === 'admin';

  if (!isAdmin) {
    if (req.user.role === 'institution' && !req.user.institutionApproved) {
      return res.status(403).json({ success: false, message: 'Institution account pending admin approval' });
    }
    if (req.user.role === 'institution_staff') {
      const parent = await User.findById(req.user.parentInstitution);
      if (!parent || !parent.isActive || !parent.institutionApproved) {
        return res.status(403).json({ success: false, message: 'Institution account is not active or approved' });
      }
    }
  }

  const institutionId = getInstitutionId(req.user);
  const isIssuer = institutionId && cert.institution.toString() === institutionId.toString();

  if (!isAdmin && !isIssuer) {
    return res.status(403).json({ success: false, message: 'Access denied' });
  }

  if (!isAdmin && !requirePermissionCheck(req.user, 'revokeCertificates')) {
    return res.status(403).json({ success: false, message: 'Permission denied: revokeCertificates' });
  }

  if (blockchain.isReady() && cert.onChain) {
    try {
      await blockchain.updateStatusOnChain(cert.certificateId, 'Revoked');
    } catch (err) {
      return res.status(500).json({
        success: false,
        message: `Blockchain revoke failed: ${err.message}`,
      });
    }
  }

  cert.status = 'Revoked';
  await cert.save();

  res.json({ success: true, message: 'Certificate revoked', certificate: cert });
}

router.patch(
  '/:certificateId/revoke',
  auth,
  authorize('admin', 'institution', 'institution_staff'),
  revokeCertificate
);

module.exports = router;
