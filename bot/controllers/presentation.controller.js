const Presentation = require('../../models/Presentation');
const { getSession } = require('../utils/session');

module.exports = (bot) => {
  return {
    sendMyPresentations: async (chatId) => {
      const session = getSession(chatId);
      const prs = await Presentation.find({ userId: session.userId }).sort({ createdAt: -1 }).limit(10);
      if (prs.length === 0) return bot.sendMessage(chatId, '📂 Hali prezentatsiyalar yo\'q.');
      
      const text = '📂 <b>Sizning prezentatsiyalaringiz:</b>\n\nQuyidagilardan birini tanlang:';
      const inline_keyboard = prs.map(p => ([{ text: `📌 ${p.title}`, callback_data: `view_${p._id}` }]));
      return bot.sendMessage(chatId, text, { parse_mode: 'HTML', reply_markup: { inline_keyboard } });
    }
  };
};
