const fs = require('fs');
const path = require('path');
const SESSIONS_FILE = path.join(__dirname, '..', '..', 'sessions.json');
let sessions = {};
try { if (fs.existsSync(SESSIONS_FILE)) sessions = JSON.parse(fs.readFileSync(SESSIONS_FILE, 'utf8')); } catch (e) { }

function saveSessions() { try { fs.writeFileSync(SESSIONS_FILE, JSON.stringify(sessions, null, 2)); } catch (e) {} }
function getSession(chatId) { if (!sessions[chatId]) sessions[chatId] = { step: null, data: {} }; return sessions[chatId]; }
function isLoggedIn(chatId) { return !!(sessions[chatId] && sessions[chatId].token); }

module.exports = { sessions, saveSessions, getSession, isLoggedIn };