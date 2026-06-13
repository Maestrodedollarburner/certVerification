const mongoose = require('mongoose');

const certificateSchema = new mongoose.Schema(
  {
    certificateId: { type: String, required: true, unique: true, trim: true },
    studentId: { type: String, required: true, trim: true },
    studentName: { type: String, required: true },
    institution: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    institutionName: { type: String, required: true },
    degreeAwarded: { type: String, required: true },
    department: { type: String, required: true },
    programme: { type: String, required: true },
    graduationYear: { type: Number, required: true },
    certificateHash: { type: String, required: true },
    transactionHash: { type: String },
    blockNumber: { type: Number },
    issueDate: { type: Date, default: Date.now },
    qrCode: { type: String },
    verificationUrl: { type: String },
    status: {
      type: String,
      enum: ['Valid', 'Invalid', 'Tampered', 'Revoked', 'Not Found', 'Pending'],
      default: 'Pending',
    },
    onChain: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Certificate', certificateSchema);
