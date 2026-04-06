const mongoose = require('mongoose');

const DocumentPageSchema = new mongoose.Schema({
  title: String,
  content: String, // Full text content
  layout: { type: String, default: 'standard' }, // standard, columns
  images: [{
    url: String,
    x: Number,
    y: Number,
    width: Number,
    height: Number
  }],
});

const DocumentSchema = new mongoose.Schema({
  title: { type: String, required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  topic: String,
  pages: [DocumentPageSchema],
  format: { type: String, default: 'A4' }, // A4, Letter, Legal
  pageCount: { type: Number, default: 1 },
  language: { type: String, default: 'English' },
  docType: { type: String, default: 'General' },
  isPublic: { type: Boolean, default: false },
  views: { type: Number, default: 0 }
}, { timestamps: true });

module.exports = mongoose.model('Document', DocumentSchema);
