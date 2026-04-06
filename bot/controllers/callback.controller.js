
const Presentation = require('../../models/Presentation');
const { getSession, saveSessions } = require('../utils/session');
const { escapeHtml } = require('../utils/helpers');
const { mainMenuKeyboard, presentationActionKeyboard, editOptionsKeyboard, docFormatKeyboard, docPageCountKeyboard, docTypeKeyboard, docActionKeyboard, templateKeyboard, languageKeyboard, slideCountKeyboard } = require('../keyboards');
const { generateSlides, generateSlidesFromDoc, translatePresentation, generateDocument, generateDocumentFromDoc } = require('../../services/ai.service');
const { generateDocPDF, generatePPTX, generatePDF, generateDocDOCX } = require('../../services/export.service');
const Document = require('../../models/Document');
const { checkRateLimit } = require('../middlewares/rateLimit');
const userController = require('./user.controller');

async function showProgress(bot, chatId, stages) {
  const msgObj = await bot.sendMessage(chatId, `⏳ ${stages[0]}...`);
  // Run asynchronously without blocking
  (async () => {
    for (let i = 1; i < stages.length; i++) {
      await new Promise(r => setTimeout(r, 800));
      const bar = '█'.repeat(i) + '░'.repeat(stages.length - i - 1);
      await bot.editMessageText(`⏳ ${stages[i]}...\n\n[${bar}] ${Math.round((i / stages.length) * 100)}%`, { chat_id: chatId, message_id: msgObj.message_id }).catch(() => {});
    }
  })();
  return msgObj.message_id;
}

module.exports = (bot) => {
  bot.on('callback_query', async (query) => {
    const chatId = query.message.chat.id;
    const msgId = query.message.message_id;
    const data = query.data;
    const session = getSession(chatId);

    if (session.activeTask) {
      return bot.answerCallbackQuery(query.id, { text: '⏳ Iltimos, oldingi jarayon tugashini kuting...', show_alert: true }).catch(() => {});
    }
    bot.answerCallbackQuery(query.id).catch(() => {});
    if (data === 'cancel') { session.step = null; session.data = {}; return bot.editMessageText('❌ Bekor qilindi.', { chat_id: chatId, message_id: msgId }); }
    
    // Upload Option Selection
    if (session.step === 'create_option') {
      if (data === 'opt_pres') {
        session.step = 'create_slideCount';
        return bot.editMessageText('📊 Slaydlar sonini tanlang:', { chat_id: chatId, message_id: msgId, reply_markup: slideCountKeyboard() });
      }
      if (data === 'opt_doc') {
        session.step = 'create_doc_pageCount';
        const { docPageCountKeyboard } = require('../keyboards');
        return bot.editMessageText('📊 Sahifalar sonini tanlang:', { chat_id: chatId, message_id: msgId, reply_markup: docPageCountKeyboard() });
      }
    }

    // Creation Steps
    if (session.step === 'create_slideCount' && data.startsWith('sc_')) {
      session.data.slideCount = parseInt(data.split('_')[1]);
      session.step = 'create_template';
      return bot.editMessageText(`✅ Slaydlar: ${session.data.slideCount} ta\n\n🎨 Shablonni tanlang:`, { chat_id: chatId, message_id: msgId, reply_markup: templateKeyboard() });
    }
    if (session.step === 'create_template' && data.startsWith('tpl_')) {
      session.data.template = data.split('_')[1];
      session.step = 'create_lang';
      return bot.editMessageText(`✅ Shablon: ${session.data.template}\n\n🌐 Tilni tanlang:`, { chat_id: chatId, message_id: msgId, reply_markup: languageKeyboard() });
    }
    // Document Creation Flow
    if (session.step === 'select_doc_type' && data.startsWith('dtype_')) {
      session.data.docType = data.split('_')[1];
      session.step = 'create_doc_topic';
      return bot.editMessageText(`✅ Hujjat turi: <b>${session.data.docType}</b>\n\n✏️ Mavzuni kiriting (Matn xabar yuboring):`, { chat_id: chatId, message_id: msgId, parse_mode: 'HTML' });
    }

    // Document Creation Steps
    if (session.step === 'create_doc_pageCount' && data.startsWith('dpc_')) {
      session.data.pageCount = parseInt(data.split('_')[1]);
      session.step = 'create_doc_format';
      return bot.editMessageText(`✅ Sahifalar: ${session.data.pageCount} ta\n\n📄 Formatni tanlang:`, { chat_id: chatId, message_id: msgId, reply_markup: docFormatKeyboard() });
    }
    if (session.step === 'create_doc_format' && data.startsWith('dfmt_')) {
      session.data.format = data.split('_')[1];
      session.step = 'create_doc_lang';
      return bot.editMessageText(`✅ Format: ${session.data.format}\n\n🌐 Tilni tanlang:`, { chat_id: chatId, message_id: msgId, reply_markup: languageKeyboard() });
    }

    if ((session.step === 'create_lang' || session.step === 'create_doc_lang') && data.startsWith('lang_')) {
      const isDoc = session.step === 'create_doc_lang';
      session.data.language = data.split('_')[1];
      bot.safeDelete(chatId, msgId);
      
      const allowed = await checkRateLimit(session.userId);
      if (!allowed) { session.step = null; return bot.sendMessage(chatId, '❌ Kechirasiz, sizning kunlik kvotangiz bepul hisob uchun yakunlandi (Limit: 10 ta). Referal orqali ulashib yoki ertasini kuting!', { reply_markup: mainMenuKeyboard(true) }); }

      const stages = isDoc 
        ? ['Mavzu tahlil qilinmoqda', 'Hujjat tuzilmasi yozilmoqda', 'Ma\'lumotlar tahlili', 'Tayyorlanmoqda']
        : ['Mavzu tahlil qilinmoqda', 'Dizayn qolipga solinmoqda', 'Asosiy slaydlar yozilmoqda', 'Birlashtirilmoqda'];
      
      const progId = await showProgress(bot, chatId, stages);
      try {
        session.activeTask = true;
        if (isDoc) {
          const pages = session.data.fileContent 
            ? await generateDocumentFromDoc(session.data.fileContent, session.data.pageCount, session.data.language, session.data.docType)
            : await generateDocument(session.data.topic, session.data.pageCount, session.data.language, session.data.docType);
          
          const doc = new Document({ userId: session.userId, title: session.data.topic, format: session.data.format, pageCount: session.data.pageCount, language: session.data.language, pages, docType: session.data.docType });
          await doc.save();
          bot.safeDelete(chatId, progId);
          session.step = null; session.data = {}; session.activeTask = false; saveSessions();
          const text = `✨ <b>HAMMOM! HUJJAT TAYYOR!</b> ✨\n\n📌 <b>Mavzu:</b> <code>${escapeHtml(doc.title)}</code>\n📗 <b>Turi:</b> ${doc.docType}\n📄 <b>Format:</b> ${doc.format}\n📊 <b>Sahifalar:</b> ${doc.pages.length} ta\n🌐 <b>Til:</b> ${doc.language}\n\n━━━━━━━━━━━━━━━━━━━━\n💎 <i>Academic Standard AI yordamida yaratildi.</i>\n\n👇 <b>Faylni yuklab olish yoki tahrirlash:</b>`;
          return bot.sendMessage(chatId, text, { parse_mode: 'HTML', reply_markup: docActionKeyboard(doc.id) });
        } else {
          let slides;
          if (session.data.fileContent) slides = await generateSlidesFromDoc(session.data.fileContent, session.data.slideCount, session.data.template, session.data.language);
          else slides = await generateSlides(session.data.topic, session.data.slideCount, session.data.template, session.data.language);

          const pres = new Presentation({ userId: session.userId, title: session.data.topic, template: session.data.template, slideCount: session.data.slideCount, language: session.data.language, slides });
          await pres.save();
          bot.safeDelete(chatId, progId);
          session.step = null; session.data = {}; session.activeTask = false; saveSessions();
          
          const text = `🚀 <b>PREZENTATSIYA TAYYOR!</b> 🚀\n\n📌 <b>Mavzu:</b> <code>${escapeHtml(pres.title)}</code>\n🎨 <b>Shablon:</b> ${pres.template}\n📊 <b>Slaydlar:</b> ${pres.slides.length} ta\n🌐 <b>Til:</b> ${pres.language}\n\n━━━━━━━━━━━━━━━━━━━━\n💎 <i>Sizning professional taqdimotingiz tayyor.</i>\n\n👇 <b>Amallar:</b>`;
          return bot.sendMessage(chatId, text, { parse_mode: 'HTML', reply_markup: presentationActionKeyboard(pres.id, pres.isPublic) });
        }
      } catch (e) {
        console.error(e);
        bot.safeDelete(chatId, progId); session.step = null; session.activeTask = false; return bot.sendMessage(chatId, '❌ AI da xatolik. Qayta urinib ko\'ring.');
      }
    }

    // View Presentation
    if (data.startsWith('view_')) {
      const p = await Presentation.findById(data.split('_')[1]);
      if (!p) return bot.sendMessage(chatId, '❌ Topilmadi.');
      const text = `📌 <b>${escapeHtml(p.title)}</b>\n🎨 Shablon: ${p.template}\n📊 Slaydlar: ${p.slides.length} ta\n👁 Ko'rishlar: ${p.views}`;
      return bot.editMessageText(text, { chat_id: chatId, message_id: msgId, parse_mode: 'HTML', reply_markup: presentationActionKeyboard(p.id, p.isPublic) });
    }

    // Edit Presentation options
    if (data.startsWith('edit_') && !data.startsWith('edit_text_')) {
      const p = await Presentation.findById(data.split('_')[1]);
      if (!p) return bot.sendMessage(chatId, '❌ Topilmadi.');
      const text = `⚙️ <b>${escapeHtml(p.title)}</b>\nQanday tahrirni amalga oshiramiz?`;
      return bot.editMessageText(text, { chat_id: chatId, message_id: msgId, parse_mode: 'HTML', reply_markup: editOptionsKeyboard(p.id) });
    }

    // Toggle Public (Catalog)
    if (data.startsWith('togglepub_')) {
      const p = await Presentation.findById(data.split('_')[1]);
      if (p.userId.toString() !== session.userId) return;
      p.isPublic = !p.isPublic; await p.save();
      const text = `📌 <b>${escapeHtml(p.title)}</b>\n🎨 Shablon: ${p.template}\n📊 Slaydlar: ${p.slides.length} ta\n👁 Ko'rishlar: ${p.views}`;
      return bot.editMessageText(text, { chat_id: chatId, message_id: msgId, parse_mode: 'HTML', reply_markup: presentationActionKeyboard(p.id, p.isPublic) });
    }

    // Export PDF/PPTX
    if (data.startsWith('pptx_') || data.startsWith('pdf_')) {
      const id = data.split('_')[1]; const type = data.split('_')[0];
      const p = await Presentation.findById(id);
      if (!p) return bot.sendMessage(chatId, '❌ Topilmadi.');
      
      session.activeTask = true;
      try {
        await showProgress(bot, chatId, ['Fayl tayyorlanmoqda', 'Rasmlar olinmoqda', 'Formatlanmoqda']);
        const loadMsg = await bot.sendMessage(chatId, `⏳ Fayl yuklanmoqda...`);
        const { generatePPTX, generatePDF } = require('../../services/export.service');
        const buf = type === 'pptx' ? await generatePPTX(p) : await generatePDF(p);
        p.views += 1; await p.save();
        await bot.sendDocument(chatId, buf, {}, { filename: `${p.title.replace(/[^a-z0-9]/gi, '_')}.${type}`, contentType: type==='pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.presentationml.presentation' });
        bot.safeDelete(chatId, loadMsg.message_id);
      } catch (e) {
        console.error('Export Error:', e);
        bot.sendMessage(chatId, '❌ Fayl yasashda xatolik yuz berdi.');
      } finally {
        session.activeTask = false;
      }
      return;
    }

    // Delete
    if (data.startsWith('del_')) {
      await Presentation.findByIdAndDelete(data.split('_')[1]);
      return bot.editMessageText('✅ O\'chirildi.', { chat_id: chatId, message_id: msgId });
    }
    
    // Translations
    if (data.startsWith('trans_')) {
      const parts = data.split('_'); const langMap = { 'ru': 'Russian', 'en': 'English' }; const lang = langMap[parts[1]]; const id = parts[2];
      const p = await Presentation.findById(id);
      if (p.userId.toString() !== session.userId) return bot.sendMessage(chatId, '❌ Xato.');
      const prog = await bot.sendMessage(chatId, `⏳ ${lang} tiliga tarjima qilinmoqda...`);
      session.activeTask = true;
      try {
        const newSlides = await translatePresentation(p.slides, lang, p.template);
        p.slides = newSlides; p.language = lang; await p.save();
        bot.safeDelete(chatId, prog.message_id);
        const t = `✅ Tarjima qilindi!\n📌 <b>${escapeHtml(p.title)}</b>\n🌐 Til: ${lang}`;
        bot.editMessageText(t, { chat_id: chatId, message_id: msgId, parse_mode: 'HTML', reply_markup: presentationActionKeyboard(p.id, p.isPublic) });
      } catch (e) {
        bot.safeDelete(chatId, prog.message_id);
        bot.sendMessage(chatId, '❌ Tarjimada xatolik.');
      } finally {
        session.activeTask = false;
      }
      return;
    }

    if (data.startsWith('dexp_')) {
      const docId = data.split('_')[1];
      const docData = await Document.findById(docId);
      if (!docData) return bot.answerCallbackQuery(query.id, { text: 'Hujjat topilmadi.' });
      
      bot.sendMessage(chatId, '⌛ PDF tayyorlanmoqda...');
      try {
        const pdf = await generateDocPDF(docData);
        return bot.sendDocument(chatId, pdf, { caption: `📄 ${docData.title}.pdf` }, { filename: `${docData.title}.pdf`, contentType: 'application/pdf' });
      } catch (e) {
        console.error('Bot Export Error:', e);
        return bot.sendMessage(chatId, '❌ Export xatosi.');
      }
    }

    if (data.startsWith('ddocx_')) {
      const docId = data.split('_')[1];
      const docData = await Document.findById(docId);
      if (!docData) return bot.answerCallbackQuery(query.id, { text: 'Hujjat topilmadi.' });
      
      bot.sendMessage(chatId, '⌛ Word fayl tayyorlanmoqda...');
      try {
        const buffer = await generateDocDOCX(docData);
        return bot.sendDocument(chatId, buffer, { caption: `📝 ${docData.title}.docx` }, { filename: `${docData.title}.docx`, contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
      } catch (e) {
        console.error('Bot Word Export Error:', e);
        return bot.sendMessage(chatId, '❌ Export xatosi.');
      }
    }

    if (data.startsWith('ddel_')) {
      const docId = data.split('_')[1];
      await Document.findByIdAndDelete(docId);
      bot.safeDelete(chatId, msgId);
      return bot.answerCallbackQuery(query.id, { text: 'Hujjat o\'chirildi.' });
    }

    if (data.startsWith('dview_')) {
      const docId = data.split('_')[1];
      const doc = await Document.findById(docId);
      if (!doc) return bot.answerCallbackQuery(query.id, { text: 'Hujjat topilmadi.' });
      
      const text = `📄 <b>${escapeHtml(doc.title)}</b>\n📊 Sahifalar: ${doc.pages?.length || 0}\n🌐 Til: ${doc.language || 'Noma\'lum'}\n📅 Yaratildi: ${new Date(doc.createdAt).toLocaleDateString()}`;
      return bot.editMessageText(text, { chat_id: chatId, message_id: msgId, parse_mode: 'HTML', reply_markup: docActionKeyboard(doc.id) });
    }

    if (data === 'docs_list') {
      bot.safeDelete(chatId, msgId);
      return require('./document.controller')(bot).sendMyDocuments(chatId);
    }

    if (data === 'pres_list') {
      bot.safeDelete(chatId, msgId);
      return require('./presentation.controller')(bot).sendMyPresentations(chatId);
    }
  });
};
