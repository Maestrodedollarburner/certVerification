const mongoose = require('mongoose');

const verificationLogSchema = new mongoose.Schema(
  {
    certificateId: { type: String, required: true },
    verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    verifierEmail: { type: String },
    result: {
      type: String,
      enum: ['Valid', 'Invalid', 'Tampered', 'Not Found', 'Revoked', 'Pending'],
      required: true,
    },
    ipAddress: { type: String },
    method: { type: String, enum: ['id', 'qr', 'hash'], default: 'id' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('VerificationLog', verificationLogSchema);
