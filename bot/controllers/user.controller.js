
const User = require('../../models/User');
const { getSession } = require('../utils/session');

module.exports = (bot) => {
  return {
    handleReferral: async (msg) => {
      const user = await User.findById(getSession(msg.chat.id).userId);
      if (!user) return;
      if (!user.referralCode) { user.referralCode = Math.random().toString(36).substring(2, 8).toUpperCase(); await user.save(); }
      const count = await User.countDocuments({ referredBy: user._id });
      const link = `https://t.me/AIPresentationUzBot?start=${user.referralCode}`;
      const text = `👥 <b>Sizning referal tizimingiz</b>\n\n🔗 Maxsus havola: \n${link}\n\n📊 Taklif qilingan do'stlar: ${count} ta\n\n💡 Har bir taklif uchun bepul kvota miqdoringiz qulaylashadi!`;
      bot.sendMessage(msg.chat.id, text, { parse_mode: 'HTML' });
    }
  };
};
