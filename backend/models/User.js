const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const staffPermissionsSchema = new mongoose.Schema(
  {
    manageStudents: { type: Boolean, default: false },
    issueCertificates: { type: Boolean, default: false },
    revokeCertificates: { type: Boolean, default: false },
    viewBlockchain: { type: Boolean, default: false },
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, minlength: 6 },
    role: {
      type: String,
      enum: ['admin', 'institution', 'institution_staff', 'student', 'employer', 'auditor'],
      required: true,
    },
    institutionName: { type: String, trim: true },
    institutionApproved: { type: Boolean, default: false },
    studentId: { type: String, trim: true },
    parentInstitution: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    staffPermissions: staffPermissionsSchema,
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.comparePassword = function (candidate) {
  return bcrypt.compare(candidate, this.password);
};

userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};

module.exports = mongoose.model('User', userSchema);
