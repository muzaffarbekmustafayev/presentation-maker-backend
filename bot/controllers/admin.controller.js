
const User = require('../../models/User');
const Presentation = require('../../models/Presentation');
const { getSession } = require('../utils/session');

module.exports = (bot) => {
  return {
    handle: async (msg) => {
      const chatId = msg.chat.id;
      const user = await User.findById(getSession(chatId).userId);
      if (!user || user.role !== 'Admin') return bot.sendMessage(chatId, '❌ Ruxsat yo\'q.');
      
      const uCount = await User.countDocuments();
      const pCount = await Presentation.countDocuments();
      const today = new Date().toISOString().split('T')[0];
      const tUsers = await User.countDocuments({ updatedAt: { $gte: new Date(today) } });
      
      const text = `⚙️ <b>Admin Dashboard</b>\n\n👥 Jami Foydalanuvchilar: ${uCount}\n📉 Bugungi faollar (updates): ${tUsers}\n\n📊 Jami Prezentatsiyalar: ${pCount}`;
      bot.sendMessage(chatId, text, { parse_mode: 'HTML' });
    }
  };
};
