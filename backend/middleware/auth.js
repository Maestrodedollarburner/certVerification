const jwt = require('jsonwebtoken');
const User = require('../models/User');

const auth = async (req, res, next) => {
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const token = header.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);

    if (!user || !user.isActive) {
      return res.status(401).json({ success: false, message: 'Invalid or inactive account' });
    }

    req.user = user;
    next();
  } catch {
    return res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
};

const authorize = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({ success: false, message: 'Access denied' });
  }
  next();
};

function getInstitutionId(user) {
  if (user.role === 'institution') return user._id;
  if (user.role === 'institution_staff') return user.parentInstitution;
  return null;
}

function isInstitutionMember(user) {
  return user.role === 'institution' || user.role === 'institution_staff';
}

function hasStaffPermission(user, permission) {
  if (user.role === 'institution') return true;
  if (user.role === 'institution_staff') {
    return Boolean(user.staffPermissions?.[permission]);
  }
  return false;
}

const requireApprovedInstitution = async (req, res, next) => {
  if (req.user.role === 'institution' && !req.user.institutionApproved) {
    return res.status(403).json({
      success: false,
      message: 'Institution account pending admin approval',
    });
  }

  if (req.user.role === 'institution_staff') {
    const parent = await User.findById(req.user.parentInstitution);
    if (!parent || !parent.isActive || !parent.institutionApproved) {
      return res.status(403).json({
        success: false,
        message: 'Institution account is not active or approved',
      });
    }
    req.institutionAccount = parent;
  }

  next();
};

const requireInstitutionMember = (req, res, next) => {
  if (!isInstitutionMember(req.user)) {
    return res.status(403).json({ success: false, message: 'Access denied' });
  }
  next();
};

const requirePermission = (permission) => (req, res, next) => {
  if (!hasStaffPermission(req.user, permission)) {
    return res.status(403).json({
      success: false,
      message: `Permission denied: ${permission}`,
    });
  }
  next();
};

module.exports = {
  auth,
  authorize,
  requireApprovedInstitution,
  requireInstitutionMember,
  requirePermission,
  getInstitutionId,
  isInstitutionMember,
  hasStaffPermission,
};
