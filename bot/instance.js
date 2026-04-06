process.env.NTBA_FIX_619 = 1;
const TelegramBot = require('node-telegram-bot-api');
const token = process.env.TELEGRAM_BOT_TOKEN;
const bot = new TelegramBot(token, { polling: true });

// Setup basic logging
const originalSend = bot.sendMessage.bind(bot);
bot.sendMessage = function(chatId, text, ...args) {
  const short = (text || '').replace(/<[^>]+>/g, '').substring(0, 80).replace(/\n/g, ' ');
  console.log(`📤 [${new Date().toLocaleTimeString()}] → chat:${chatId} | ${short}...`);
  return originalSend(chatId, text, ...args);
};

const originalDoc = bot.sendDocument.bind(bot);
bot.sendDocument = function(chatId, doc, ...args) {
  console.log(`📎 [${new Date().toLocaleTimeString()}] → chat:${chatId} | Fayl yuborildi`);
  return originalDoc(chatId, doc, ...args);
};

bot.safeDelete = function(chatId, msgId) {
  bot.deleteMessage(chatId, msgId).catch(() => {});
};

module.exports = bot;