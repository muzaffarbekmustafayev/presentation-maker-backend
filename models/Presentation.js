const mongoose = require('mongoose');

const SlideSchema = new mongoose.Schema({
  title: String,
  content: [String], // bullet points
  image: String, // Legacy single image
  images: [{
    url: String,
    x: Number,
    y: Number,
    width: Number,
    height: Number
  }],
  shapes: [{
    type: { type: String }, // rectangle, circle, line
    x: Number,
    y: Number,
    width: Number,
    height: Number,
    color: String,
    opacity: Number
  }],
  textBoxes: [{
    text: String,
    x: Number,
    y: Number,
    fontSize: String,
    color: String
  }],
  layout: { type: String, default: 'title-text' },
  theme: String,
  textColor: String,
  backgroundColor: String,
  backgroundMode: { type: String, default: 'gradient' }, // gradient, solid, pattern
  pattern: { type: String, default: 'none' },
  textAlign: { type: String, default: 'left' },
  verticalAlign: { type: String, default: 'center' },
  titleSize: { type: String, default: '3xl' },
  transition: { type: String, default: 'none' },
  imagePrompt: String,
  notes: String,
  charts: [{
    type: { type: String }, // bar, pie, line
    title: String,
    data: [{
      label: String,
      value: Number
    }]
  }]
});


const PresentationSchema = new mongoose.Schema({
  title: { type: String, required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  topic: String,
  slides: [SlideSchema],
  template: { type: String, default: 'Minimal' },
  slideCount: { type: Number, default: 5 },
  language: { type: String, default: 'English' },
  isPublic: { type: Boolean, default: false },
  views: { type: Number, default: 0 }
}, { timestamps: true });

module.exports = mongoose.model('Presentation', PresentationSchema);
