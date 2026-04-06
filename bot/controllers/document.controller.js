const axios = require('axios');
const path = require('path');
const fs = require('fs');
const { parseDocument } = require('../../services/ai.service');
const { getSession } = require('../utils/session');
const { slideCountKeyboard } = require('../keyboards');
const Document = require('../../models/Document');

const creationOptionKeyboard = () => ({
  inline_keyboard: [
    [{ text: '📊 Prezentatsiya (Slaydlar)', callback_data: 'opt_pres' }],
    [{ text: '📄 Hujjat (Report)', callback_data: 'opt_doc' }],
    [{ text: '❌ Bekor qilish', callback_data: 'cancel' }]
  ]
});

module.exports = (bot) => {
  return {
    handle: async (msg) => {
      const chatId = msg.chat.id;
      const session = getSession(chatId);
      if (!session.token) return bot.sendMessage(chatId, '⚠️ Avval tizimga kiring.');
      const doc = msg.document;
      const ext = path.extname(doc.file_name || '').toLowerCase();
      if (!['.pdf','.docx','.doc','.txt','.md'].includes(ext)) return bot.sendMessage(chatId, '⚠️ Faqat PDF, DOCX, TXT formatlar.');

      const mId = await bot.sendMessage(chatId, '📄 Fayl tahlil qilinmoqda...');
      try {
        const link = await bot.getFileLink(doc.file_id);
        const res = await axios.get(link, { responseType: 'arraybuffer' });
        const p = path.join(__dirname, '..', '..', 'uploads', `${Date.now()}_${doc.file_name}`);
        if (!fs.existsSync(path.dirname(p))) fs.mkdirSync(path.dirname(p));
        fs.writeFileSync(p, Buffer.from(res.data));
        const content = await parseDocument(p, ext);
        if (fs.existsSync(p)) fs.unlinkSync(p);

        if (!content || content.length < 50) { bot.safeDelete(chatId, mId.message_id); return bot.sendMessage(chatId, '⚠️ Matn topilmadi.'); }
        bot.safeDelete(chatId, mId.message_id);
        session.data = { fileContent: content, topic: doc.file_name.replace(/\.[^/.]+$/, '') }; 
        session.step = 'create_option';
        bot.sendMessage(chatId, `✅ <b>Fayl o'qildi!</b>\n📝 Jami: ${content.length} belgi.\n\n🛠 Nima yaratamiz?`, { parse_mode: 'HTML', reply_markup: creationOptionKeyboard() });
      } catch (e) { bot.safeDelete(chatId, mId.message_id); bot.sendMessage(chatId, '❌ Xatolik.'); }
    },
    sendMyDocuments: async (chatId) => {
      const session = getSession(chatId);
      const docs = await Document.find({ userId: session.userId }).sort({ createdAt: -1 }).limit(10);
      if (!docs.length) return bot.sendMessage(chatId, '📭 Hujjatlar hali yo\'q.');
      
      let text = '📚 <b>Sizning hujjatlaringiz:</b>\n\n';
      const inline_keyboard = docs.map(d => ([{ text: `📄 ${d.title}`, callback_data: `dview_${d._id}` }]));
      return bot.sendMessage(chatId, text, { parse_mode: 'HTML', reply_markup: { inline_keyboard } });
    }
  };
};
