const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());

app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    console.log(`[${req.method}] ${req.originalUrl} → ${res.statusCode} (${Date.now() - start}ms)`);
  });
  next();
});

mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/presentations', require('./routes/presentation'));
app.use('/api/documents', require('./routes/document'));
app.use('/api/admin', require('./routes/admin'));

// Telegram Webhook
const bot = require('./bot/instance');
require('./bot/controllers/message.controller')(bot);
require('./bot/controllers/callback.controller')(bot);

const WEBHOOK_PATH = `/bot${process.env.TELEGRAM_BOT_TOKEN}`;

if (process.env.VERCEL) {
  // Webhook mode
  app.post(WEBHOOK_PATH, (req, res) => {
    bot.processUpdate(req.body);
    res.sendStatus(200);
  });
} else {
  // Local: polling already started in instance.js
  bot.setMyCommands([
    { command: 'start', description: 'Boshlash / Start' },
    { command: 'new_pres', description: 'Yangi prezentatsiya / New Presentation' },
    { command: 'new_doc', description: 'Yangi hujjat / New Document' },
    { command: 'my_pres', description: 'Prezentatsiyalarim / My Presentations' },
    { command: 'my_docs', description: 'Hujjatlarim / My Documents' },
    { command: 'profile', description: 'Profil / Profile' },
    { command: 'help', description: 'Yordam / Help' },
    { command: 'cancel', description: 'Bekor qilish / Cancel' }
  ]).catch(e => console.error('Command set error:', e));
}

app.get('/', (req, res) => res.send('Presentation Maker API is running...'));

if (!process.env.VERCEL) {
  app.listen(PORT, () => console.log(`Server is running on port ${PORT}`));
}

module.exports = app;
