
const Presentation = require('../../models/Presentation');
const { presentationActionKeyboard } = require('../keyboards');
const { escapeHtml } = require('../utils/helpers');

module.exports = (bot) => {
  return {
    handle: async (msg) => {
      const p = await Presentation.find({ isPublic: true }).sort({ views: -1, createdAt: -1 }).limit(10);
      if (p.length === 0) return bot.sendMessage(msg.chat.id, '📚 Katalog hozircha bo\'sh.');
      let tx = '📚 <b>Jamoat Prezentatsiyalari (Eng yaxshilari)</b>\n━━━━━━━━━━━━━━━━━━━━━━━\n';
      p.forEach((x, i) => { tx += `${i+1}️⃣ <b>${escapeHtml(x.title)}</b> (👁 ${x.views})\n`; });
      for (const pr of p) {
         bot.sendMessage(msg.chat.id, `📌 <b>${escapeHtml(pr.title)}</b>\n🎨 Shablon: ${pr.template}\n👁 Ko'rishlar: ${pr.views}`, { parse_mode: 'HTML', reply_markup: presentationActionKeyboard(pr.id, true) });
      }
    }
  };
};
