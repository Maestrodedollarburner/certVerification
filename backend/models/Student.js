const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema(
  {
    studentId: { type: String, required: true, unique: true, trim: true },
    fullName: { type: String, required: true, trim: true },
    email: { type: String, trim: true, lowercase: true },
    department: { type: String, required: true, trim: true },
    programme: { type: String, required: true, trim: true },
    graduationYear: { type: Number, required: true },
    institution: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    institutionName: { type: String, required: true },
    registeredUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    isRegistered: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Student', studentSchema);
