
const axios = require('axios');
const path = require('path');
const fs = require('fs');
const { analyzeVoice } = require('../../services/ai.service');
const { getSession } = require('../utils/session');
const { slideCountKeyboard } = require('../keyboards');

module.exports = (bot) => {
  return {
    handle: async (msg) => {
      const chatId = msg.chat.id;
      const session = getSession(chatId);
      if (!session.token) return bot.sendMessage(chatId, '⚠️ Avval tizimga kiring.');
      const mId = await bot.sendMessage(chatId, '🎧 Ovozli xabar eshitilmoqda...');
      try {
        const link = await bot.getFileLink(msg.voice.file_id);
        const res = await axios.get(link, { responseType: 'arraybuffer' });
        const textTopic = await analyzeVoice(Buffer.from(res.data));
        bot.safeDelete(chatId, mId.message_id);
        session.data = { topic: textTopic }; session.step = 'create_slideCount';
        bot.sendMessage(chatId, `✅ AI ovozingizdan quyidagi mavzuni aniqladi:\n<b>${textTopic}</b>\n\n📊 Slaydlar sonini tanlang:`, { parse_mode: 'HTML', reply_markup: slideCountKeyboard() });
      } catch (e) { bot.safeDelete(chatId, mId.message_id); bot.sendMessage(chatId, '❌ Ovozni tahlil qilib bo\'lmadi.'); }
    }
  };
};
