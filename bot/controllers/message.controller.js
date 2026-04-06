
const User = require('../../models/User');
const Presentation = require('../../models/Presentation');
const Document = require('../../models/Document');
const { getSession, saveSessions, sessions, isLoggedIn } = require('../utils/session');
const { escapeHtml } = require('../utils/helpers');
const { mainMenuKeyboard, slideCountKeyboard, docPageCountKeyboard, docTypeKeyboard } = require('../keyboards');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

module.exports = (bot) => {
  bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;
    const from = msg.from ? `${msg.from.first_name || ''} (${msg.from.id})` : 'unknown';

    if (msg.document) {
      console.log(`📥 [${new Date().toLocaleTimeString()}] ← ${from} | 📄 Fayl: ${msg.document.file_name}`);
      // route to document controller
      return require('./document.controller')(bot).handle(msg);
    }
    if (msg.voice) {
      console.log(`📥 [${new Date().toLocaleTimeString()}] ← ${from} | 🎤 Ovozli xabar`);
      return require('./voice.controller')(bot).handle(msg);
    }

    if (!text) return;
    console.log(`📥 [${new Date().toLocaleTimeString()}] ← ${from} | ${text.substring(0, 80)}`);

    if (text.startsWith('/start')) {
      const refCode = text.split(' ')[1];
      const session = getSession(chatId);
      session.step = null; session.data = {};
      if (refCode && !isLoggedIn(chatId)) session.data.refCode = refCode;
      return bot.sendMessage(chatId, "🎨 <b>AI Presentation Maker ga xush kelibsiz!</b>\n🤖 Sun'iy intellekt yordamida professional taqdimotlar yarating.", { parse_mode: 'HTML', reply_markup: mainMenuKeyboard(isLoggedIn(chatId)) });
    }

    if (text.startsWith('/admin')) {
      return require('./admin.controller')(bot).handle(msg);
    }

    if (text === '/cancel' || text === '❌ Bekor qilish') {
      const s = getSession(chatId);
      s.step = null; s.data = {};
      return bot.sendMessage(chatId, '❌ Amal bekor qilindi.', { reply_markup: mainMenuKeyboard(isLoggedIn(chatId)) });
    }

    if (text === '/new_pres') { if (!isLoggedIn(chatId)) return bot.sendMessage(chatId, '⚠️ Avval tizimga kiring.'); const s = getSession(chatId); s.step = 'create_topic'; s.data = {}; return bot.sendMessage(chatId, '✨ <b>Yangi prezentatsiya</b>\n\n✏️ Mavzuni kiriting:', { parse_mode: 'HTML', reply_markup: { reply_keyboard_remove: true } }); }
    if (text === '/new_doc') { if (!isLoggedIn(chatId)) return bot.sendMessage(chatId, '⚠️ Avval tizimga kiring.'); const s = getSession(chatId); s.step = 'select_doc_type'; s.data = {}; return bot.sendMessage(chatId, '📄 <b>Yangi hujjat yaratish</b>\n\n⬇️ Hujjat turini tanlang:', { parse_mode: 'HTML', reply_markup: docTypeKeyboard() }); }
    if (text === '/my_pres') { if (!isLoggedIn(chatId)) return bot.sendMessage(chatId, '⚠️ Avval tizimga kiring.'); return require('./presentation.controller')(bot).sendMyPresentations(chatId); }
    if (text === '/my_docs') { if (!isLoggedIn(chatId)) return bot.sendMessage(chatId, '⚠️ Avval tizimga kiring.'); return require('./document.controller')(bot).sendMyDocuments(chatId); }
    if (text === '/profile') { return bot.sendMessage(chatId, '👤 Profilingizni ko\'rish uchun "👤 Profil" tugmasini bosing yoki ismingizni yuboring.'); }

    const session = getSession(chatId);

    // Main Menu Buttons (Exact Match with Emojis)
    if (text.includes('Yangi prezentatsiya')) { if (!isLoggedIn(chatId)) return bot.sendMessage(chatId, '⚠️ Avval tizimga kiring.'); session.step = 'create_topic'; session.data = {}; return bot.sendMessage(chatId, '✨ <b>Yangi prezentatsiya</b>\n\n✏️ Mavzuni kiriting (yoki ovozli xabar yuboring):', { parse_mode: 'HTML', reply_markup: { reply_keyboard_remove: true } }); }
    if (text.includes('Yangi hujjat')) { if (!isLoggedIn(chatId)) return bot.sendMessage(chatId, '⚠️ Avval tizimga kiring.'); session.step = 'select_doc_type'; session.data = {}; return bot.sendMessage(chatId, '📄 <b>Yangi hujjat yaratish</b>\n\n⬇️ Hujjat turini tanlang:', { parse_mode: 'HTML', reply_markup: docTypeKeyboard() }); }
    if (text.includes('Prezentatsiyalarim')) { if (!isLoggedIn(chatId)) return bot.sendMessage(chatId, '⚠️ Avval tizimga kiring.'); return require('./presentation.controller')(bot).sendMyPresentations(chatId); }
    if (text.includes('Hujjatlarim')) { if (!isLoggedIn(chatId)) return bot.sendMessage(chatId, '⚠️ Avval tizimga kiring.'); return require('./document.controller')(bot).sendMyDocuments(chatId); }
    if (text.includes('Katalog')) { return require('./catalog.controller')(bot).handle(msg); }
    if (text.includes('Referallar')) { if (!isLoggedIn(chatId)) return bot.sendMessage(chatId, '⚠️ Layoqat yo\'q.'); return require('./user.controller')(bot).handleReferral(msg); }
    if (text.includes('Profil')) {
      const u = await User.findById(session.userId).catch(()=>null);
      if (!u) return;
      const c = await Presentation.countDocuments({userId: u._id});
      const dc = await Document.countDocuments({userId: u._id});
      const t = u.dailyGenerations?.date === new Date().toISOString().split('T')[0] ? u.dailyGenerations.count : 0;
      return bot.sendMessage(chatId, `👤 <b>${escapeHtml(u.name)}</b>\n📧 <code>${escapeHtml(u.email)}</code>\n\n📊 <b>Statistika:</b>\n📂 ${c} ta prezentatsiya\n📄 ${dc} ta hujjat\n🔄 Bugun: ${t}/10 ta yaratildi`, { parse_mode:'HTML' });
    }
    if (text === '🌐 Saytga o\'tish') { return bot.sendMessage(chatId, '🌐 <b>AlphaSlides Web Dashboard</b>\n\nKompyuter orqali tahrirlash uchun saytga kiring:\nhttps://alphaslides.uz', { parse_mode: 'HTML' }); }
    if (text === '🚪 Chiqish') { delete sessions[chatId]; saveSessions(); return bot.sendMessage(chatId, '👋 Chiqdingiz.', { reply_markup: mainMenuKeyboard(false) }); }
    
    if (text === '📝 Ro\'yxatdan o\'tish') { session.step = 'reg_name'; session.data = {}; return bot.sendMessage(chatId, '📝 <b>Ro\'yxatdan o\'tish</b>\n\n👤 Ismingizni kiriting:', { parse_mode: 'HTML', reply_markup: { reply_keyboard_remove: true } }); }
    if (text === '🔑 Kirish') { session.step = 'login_email'; session.data = {}; return bot.sendMessage(chatId, '🔑 <b>Tizimga kirish</b>\n\n📧 Email kiriting:', { parse_mode: 'HTML', reply_markup: { reply_keyboard_remove: true } }); }
    if (text === '📋 Yordam') { return bot.sendMessage(chatId, '📖 <b>Yordam</b>\n\n/start - Boshlash\n/cancel - Amalni bekor qilish\n\nOvozli xabar yoki Matnli hujjat (.docx, .pdf) tashlasangiz ham AI prezentatsiya yasab beradi!', { parse_mode: 'HTML' }); }

    // Logic Steps
    if (session.step === 'reg_name') { 
      session.data.name = text; 
      session.step = 'reg_username'; 
      return bot.sendMessage(chatId, '👤 Taqdimotlarda ko\'rinadigan <b>username</b> kiriting (masalan: muzaffar_slides):', { parse_mode: 'HTML' }); 
    }
    if (session.step === 'reg_username') {
      const existing = await User.findOne({ username: text.toLowerCase() });
      if (existing) return bot.sendMessage(chatId, '⚠️ Bu username allaqachon band. Boshqasini urinib ko\'ring:');
      session.data.username = text.toLowerCase();
      session.step = 'reg_email';
      return bot.sendMessage(chatId, '📧 Email kiriting:');
    }
    if (session.step === 'reg_email') { 
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text)) return bot.sendMessage(chatId, '⚠️ Xato email.'); 
      session.data.email = text.toLowerCase(); 
      session.step = 'reg_pass'; 
      return bot.sendMessage(chatId, '🔒 Parol kiriting:'); 
    }
    if (session.step === 'reg_pass') {
      try {
        if (await User.findOne({ email: session.data.email })) { session.step = null; return bot.sendMessage(chatId, '⚠️ Email band. Kiring.'); }
        const user = new User({ 
          name: session.data.name, 
          username: session.data.username,
          email: session.data.email, 
          password: await bcrypt.hash(text, 10) 
        });
        // Handle referral
        if (session.data.refCode) {
          const refUser = await User.findOne({ referralCode: session.data.refCode });
          if (refUser) { user.referredBy = refUser._id; }
        }
        user.referralCode = Math.random().toString(36).substring(2, 8).toUpperCase();
        await user.save();
        bot.safeDelete(chatId, msg.message_id);
        session.token = jwt.sign({ user: { id: user.id } }, process.env.JWT_SECRET, { expiresIn: '7d' }); session.userId = user.id; session.step = null; saveSessions();
        return bot.sendMessage(chatId, `✅ <b>Muvaffaqiyatli ro'yxatdan o'tdingiz!</b>\n👤 ${escapeHtml(user.name)}`, { parse_mode: 'HTML', reply_markup: mainMenuKeyboard(true) });
      } catch (e) {
        console.error('REG ERROR:', e);
        session.step = null;
        bot.sendMessage(chatId, `❌ Xatolik: ${e.message}`);
      }
      return;
    }

    if (session.step === 'login_email') { session.data.email = text.toLowerCase(); session.step = 'login_pass'; return bot.sendMessage(chatId, '🔒 Parolingizni kiriting:'); }
    if (session.step === 'login_pass') {
      try {
        const user = await User.findOne({ email: session.data.email });
        if (!user || !await bcrypt.compare(text, user.password)) { session.step = null; return bot.sendMessage(chatId, '❌ Parol/Email noto\'g\'ri.'); }
        bot.safeDelete(chatId, msg.message_id);
        session.token = jwt.sign({ user: { id: user.id } }, process.env.JWT_SECRET, { expiresIn: '7d' }); session.userId = user.id; session.step = null; saveSessions();
        const isAdmin = user.role === 'Admin';
        return bot.sendMessage(chatId, `✅ <b>Xush kelibsiz, ${escapeHtml(user.name)}!</b>`, { parse_mode: 'HTML', reply_markup: mainMenuKeyboard(true, isAdmin) });
      } catch (e) {
        console.error('LOGIN ERROR:', e);
        session.step = null;
        bot.sendMessage(chatId, `❌ Xatolik: ${e.message}`);
      }
      return;
    }

    if (session.step === 'create_topic' || session.step === 'file_topic') {
      session.data.topic = text; session.step = 'create_slideCount';
      return bot.sendMessage(chatId, `✅ Mavzu: <b>${escapeHtml(text)}</b>\n\n📊 Slaydlar sonini tanlang:`, { parse_mode: 'HTML', reply_markup: slideCountKeyboard() });
    }
    if (session.step === 'create_doc_topic') {
      session.data.topic = text; session.step = 'create_doc_pageCount';
      return bot.sendMessage(chatId, `✅ Mavzu: <b>${escapeHtml(text)}</b>\n\n📊 Sahifalar sonini tanlang:`, { parse_mode: 'HTML', reply_markup: docPageCountKeyboard() });
    }
  });
};
