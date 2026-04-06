
require('dotenv').config({ path: require('path').resolve(__dirname, '..', '.env') });
const bot = require('./instance');
const mongoose = require('mongoose');

// Connect Database
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ MongoDB connected (bot)'))
  .catch(err => console.error('MongoDB xatosi:', err.message)); 

// Register Listeners
require('./controllers/message.controller')(bot);
require('./controllers/callback.controller')(bot);

bot.setMyCommands([
  { command: 'start', description: 'Boshlash / Start' },
  { command: 'new_pres', description: 'Yangi prezentatsiya / New Presentation' },
  { command: 'new_doc', description: 'Yangi hujjat / New Document' },
  { command: 'my_pres', description: 'Prezentatsiyalarim / My Presentations' },
  { command: 'my_docs', description: 'Hujjatlarim / My Documents' },
  { command: 'profile', description: 'Profil / Profile' },
  { command: 'help', description: 'Yordam / Help' },
  { command: 'cancel', description: 'Bekor qilish / Cancel' }
]).then(() => console.log('✅ Bot commands set')).catch(e => console.error('Command set error:', e));

console.log('🤖 Clear Architecture Bot is running...');
