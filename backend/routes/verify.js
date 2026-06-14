const express = require('express');
const Certificate = require('../models/Certificate');
const VerificationLog = require('../models/VerificationLog');
const { auth, optionalAuth } = require('../middleware/auth');
const blockchain = require('../services/blockchain');

const router = express.Router();

async function logVerification(certificateId, result, req, method = 'id') {
  try {
    await VerificationLog.create({
      certificateId,
      verifiedBy: req.user?._id,
      verifierEmail: req.user?.email,
      result,
      ipAddress: req.ip,
      method,
    });
  } catch (err) {
    console.error('Verification log failed:', err.message);
  }
}

router.get('/history/recent', auth, async (req, res) => {
  const filter = req.user.role === 'employer'
    ? { $or: [{ verifiedBy: req.user._id }, { verifierEmail: req.user.email }] }
    : {};
  const logs = await VerificationLog.find(filter)
    .sort({ createdAt: -1 })
    .limit(20)
    .populate('verifiedBy', 'name email role');
  res.json({ success: true, logs });
});

router.get('/:certificateId', optionalAuth, async (req, res) => {
  const { certificateId } = req.params;
  const cert = await Certificate.findOne({ certificateId });

  if (!cert) {
    await logVerification(certificateId, 'Not Found', req, req.query.method || 'id');
    return res.json({
      success: true,
      verification: {
        status: 'Not Found',
        message: 'No certificate found with this ID',
        certificateId,
      },
    });
  }

  if (cert.status === 'Revoked') {
    await logVerification(certificateId, 'Revoked', req, req.query.method || 'id');
    return res.json({
      success: true,
      verification: buildVerificationResponse(cert, 'Revoked', null, null),
    });
  }

  if (!cert.onChain) {
    await logVerification(certificateId, 'Invalid', req, req.query.method || 'id');
    return res.json({
      success: true,
      verification: buildVerificationResponse(
        cert,
        'Invalid',
        false,
        null,
        'Certificate exists but was not recorded on the blockchain. Cannot verify authenticity.'
      ),
    });
  }

  let status = cert.status;
  let blockchainVerified = null;
  let onChainData = null;

  if (blockchain.isReady()) {
    const chainResult = await blockchain.verifyOnChain(certificateId, cert.certificateHash);
    blockchainVerified = chainResult.isValid;
    onChainData = await blockchain.getCertificateOnChain(certificateId);

    if (chainResult.status === 'Not Found') {
      status = 'Invalid';
    } else if (chainResult.status === 'Tampered') {
      status = 'Tampered';
    } else if (chainResult.status === 'Revoked') {
      status = 'Revoked';
      if (cert.status !== 'Revoked') {
        cert.status = 'Revoked';
        await cert.save();
      }
    } else if (chainResult.isValid) {
      status = 'Valid';
    } else {
      status = chainResult.status || 'Invalid';
    }
  } else {
    status = 'Invalid';
  }

  await logVerification(certificateId, status, req, req.query.method || 'id');

  res.json({
    success: true,
    verification: buildVerificationResponse(cert, status, blockchainVerified, onChainData),
  });
});

function buildVerificationResponse(cert, status, blockchainVerified, onChainData, customMessage) {
  return {
    status,
    certificateId: cert.certificateId,
    studentId: cert.studentId,
    studentName: cert.studentName,
    institutionName: cert.institutionName,
    degreeAwarded: cert.degreeAwarded,
    department: cert.department,
    programme: cert.programme,
    graduationYear: cert.graduationYear,
    issueDate: cert.issueDate,
    certificateHash: cert.certificateHash,
    transactionHash: cert.transactionHash,
    blockNumber: cert.blockNumber,
    onChain: cert.onChain,
    blockchainVerified,
    onChainData,
    message: customMessage || getStatusMessage(status),
  };
}

function getStatusMessage(status) {
  const messages = {
    Valid: 'This certificate is authentic and verified on the blockchain.',
    Invalid: 'This certificate could not be verified on the blockchain.',
    Tampered: 'WARNING: Certificate data has been tampered with!',
    Revoked: 'This certificate has been revoked by the issuing institution.',
    Pending: 'Certificate pending blockchain confirmation.',
    'Not Found': 'No certificate found with this ID.',
  };
  return messages[status] || 'Unknown verification status';
}

module.exports = router;
