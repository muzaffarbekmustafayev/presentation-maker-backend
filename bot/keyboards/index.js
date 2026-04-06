
const TEMPLATES = ['Business', 'Minimal', 'Technology', 'Education', 'Startup', 'Creative', 'Dark', 'Corporate'];
const SLIDE_COUNTS = [5, 8, 10, 15, 20];
const PAGE_COUNTS = [5, 10, 15, 20, 30, 50];
const DOC_TYPES = ['Diplom ishi', 'Referat', 'Mustaqil ish', 'Laboratoriya ishi', 'Amaliy ish'];
const LANGUAGES = ['🇺🇸 English', '🇺🇿 Uzbek', '🇷🇺 Russian'];
const TEMPLATE_ICONS = { Business: '💼', Minimal: '⚪', Technology: '💻', Education: '📚', Startup: '🚀', Creative: '🎨', Dark: '🌑', Corporate: '🏢' };

function mainMenuKeyboard(loggedIn, isAdmin = false) {
  if (loggedIn) {
    const keys = [
      [{ text: '✨ Yangi prezentatsiya' }, { text: '📄 Yangi hujjat' }],
      [{ text: '📂 Prezentatsiyalarim' }, { text: '📚 Hujjatlarim' }],
      [{ text: '🏫 Katalog' }, { text: '👤 Profil' }],
      [{ text: '👥 Referallar' }, { text: '📋 Yordam' }],
      [{ text: '⚙️ Sozlamalar' }, { text: '🌐 Saytga o\'tish' }],
      [{ text: '🚪 Chiqish' }]
    ];
    if (isAdmin) keys.splice(4, 0, [{ text: '🛡 Admin Panel' }]);
    return { keyboard: keys, resize_keyboard: true };
  }
  return { 
    keyboard: [[{ text: '📝 Ro\'yxatdan o\'tish' }, { text: '🔑 Kirish' }], [{ text: '📋 Yordam' }]],
    resize_keyboard: true 
  };
}

function templateKeyboard() {
  const rows = [];
  for (let i = 0; i < TEMPLATES.length; i += 2) {
    const row = [{ text: `${TEMPLATE_ICONS[TEMPLATES[i]]} ${TEMPLATES[i]}`, callback_data: `tpl_${TEMPLATES[i]}` }];
    if (TEMPLATES[i + 1]) row.push({ text: `${TEMPLATE_ICONS[TEMPLATES[i + 1]]} ${TEMPLATES[i + 1]}`, callback_data: `tpl_${TEMPLATES[i + 1]}` });
    rows.push(row);
  }
  rows.push([{ text: '❌ Bekor qilish', callback_data: 'cancel' }]);
  return { inline_keyboard: rows };
}

function slideCountKeyboard() { 
  return { inline_keyboard: [
    SLIDE_COUNTS.map(n => ({ text: `📊 ${n}`, callback_data: `sc_${n}` })), 
    [{ text: '❌ Bekor qilish', callback_data: 'cancel' }]
  ]}; 
}

function languageKeyboard() { 
  return { inline_keyboard: [
    LANGUAGES.map(l => ({ text: l, callback_data: `lang_${l.split(' ')[1]}` })), 
    [{ text: '❌ Bekor qilish', callback_data: 'cancel' }]
  ]}; 
}

function docPageCountKeyboard() { 
  return { inline_keyboard: [
    PAGE_COUNTS.map(n => ({ text: `📄 ${n}`, callback_data: `dpc_${n}` })), 
    [{ text: '❌ Bekor qilish', callback_data: 'cancel' }]
  ]}; 
}

function docTypeKeyboard() {
  const rows = [];
  for (let i = 0; i < DOC_TYPES.length; i += 1) {
    rows.push([{ text: `📗 ${DOC_TYPES[i]}`, callback_data: `dtype_${DOC_TYPES[i]}` }]);
  }
  rows.push([{ text: '❌ Bekor qilish', callback_data: 'cancel' }]);
  return { inline_keyboard: rows };
}

function docFormatKeyboard() { 
  return { inline_keyboard: [
    [{ text: '📏 A4 Format (Standart)', callback_data: 'dfmt_A4' }], 
    [{ text: '❌ Bekor qilish', callback_data: 'cancel' }]
  ]}; 
}

function presentationActionKeyboard(presId, isPublic = false) {
  return { inline_keyboard: [
    [{ text: '📥 PPTX Yuklab olish', callback_data: `pptx_${presId}` }, { text: '📥 PDF Yuklab olish', callback_data: `pdf_${presId}` }],
    [{ text: '✏️ Tahrirlash', callback_data: `edit_${presId}` }, { text: isPublic ? '🔒 Yashirish' : '🌐 Ulashish', callback_data: `togglepub_${presId}` }],
    [{ text: '🗑 O\'chirish', callback_data: `del_${presId}` }],
    [{ text: '🔙 Orqaga', callback_data: 'pres_list' }]
  ] };
}

function editOptionsKeyboard(presId) {
  return { inline_keyboard: [
    [{ text: '📝 Slaydni tahrirlash (AI)', callback_data: `edit_text_${presId}` }],
    [{ text: '🇺🇿 O\'zbekcha', callback_data: `trans_uz_${presId}` }, { text: '🇷🇺 Ruscha', callback_data: `trans_ru_${presId}` }, { text: '🇺🇸 Inglizcha', callback_data: `trans_en_${presId}` }],
    [{ text: '🔙 Orqaga', callback_data: `view_${presId}` }]
  ]};
}

function docActionKeyboard(docId) {
  return { inline_keyboard: [
    [{ text: '📥 PDF Yuklab olish', callback_data: `dexp_${docId}` }, { text: '📝 Word Yuklab olish', callback_data: `ddocx_${docId}` }],
    [{ text: '🗑 O\'chirish', callback_data: `ddel_${docId}` }],
    [{ text: '🔙 Orqaga', callback_data: 'docs_list' }]
  ] };
}

function settingsKeyboard() {
  return { inline_keyboard: [
    [{ text: '✏️ Ismni o\'zgartirish', callback_data: 'settings_name' }],
    [{ text: '🔒 Parolni o\'zgartirish', callback_data: 'settings_pass' }],
    [{ text: '❌ Yopish', callback_data: 'cancel' }]
  ]};
}

module.exports = { 
  mainMenuKeyboard, templateKeyboard, slideCountKeyboard, languageKeyboard, 
  docPageCountKeyboard, docFormatKeyboard, docTypeKeyboard, presentationActionKeyboard, editOptionsKeyboard, 
  docActionKeyboard, settingsKeyboard,
  TEMPLATES, TEMPLATE_ICONS, DOC_TYPES 
};
