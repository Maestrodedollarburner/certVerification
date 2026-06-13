const express = require('express');
const {
  auth,
  authorize,
  requireApprovedInstitution,
  requireInstitutionMember,
  requirePermission,
  hasStaffPermission,
} = require('../middleware/auth');
const blockchain = require('../services/blockchain');

const router = express.Router();

router.get('/status', async (req, res) => {
  const stats = await blockchain.getBlockchainStats();
  res.json({
    success: true,
    ready: blockchain.isReady(),
    ...stats,
  });
});

router.get(
  '/transactions',
  auth,
  (req, res, next) => {
    if (req.user.role === 'admin' || req.user.role === 'auditor') return next();
    if (req.user.role === 'institution') return requireApprovedInstitution(req, res, next);
    if (req.user.role === 'institution_staff') {
      return requireApprovedInstitution(req, res, () => {
        if (!hasStaffPermission(req.user, 'viewBlockchain')) {
          return res.status(403).json({ success: false, message: 'Permission denied: viewBlockchain' });
        }
        next();
      });
    }
    return res.status(403).json({ success: false, message: 'Access denied' });
  },
  async (req, res) => {
    const transactions = await blockchain.getRecentTransactions(20);
    res.json({ success: true, transactions });
  }
);

router.get('/certificate/:certificateId', async (req, res) => {
  const onChain = await blockchain.getCertificateOnChain(req.params.certificateId);
  if (!onChain) {
    return res.status(404).json({ success: false, message: 'Certificate not found on blockchain' });
  }
  res.json({ success: true, certificate: onChain });
});

module.exports = router;
