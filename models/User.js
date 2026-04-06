const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  username: { type: String, unique: true, sparse: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['User', 'Admin'], default: 'User' },
  referralCode: { type: String, unique: true, sparse: true },
  referredBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  dailyGenerations: {
    date: { type: String, default: '' },
    count: { type: Number, default: 0 }
  },
  resetCode: { type: String },
  resetCodeExpires: { type: Date }
}, { timestamps: true });

module.exports = mongoose.model('User', UserSchema);
