
const User = require('../../models/User');
async function checkRateLimit(userId) {
  const user = await User.findById(userId);
  if (!user || user.role === 'Admin') return true;
  const today = new Date().toISOString().split('T')[0];
  if (!user.dailyGenerations || user.dailyGenerations.date !== today) {
    user.dailyGenerations = { date: today, count: 0 };
  }
  if (user.dailyGenerations.count >= 10) return false;
  user.dailyGenerations.count += 1;
  await user.save();
  return true;
}
module.exports = { checkRateLimit };
