const dotenv = require('dotenv');

dotenv.config();

const TelegramBot = require('node-telegram-bot-api');

const locallydb = require('locallydb');
const db = new locallydb('./mydb');

const warnedUsers = db.collection('warnedUsers');

const token = process.env.TOKEN;

const adminList = [197668719];

const isFromAdmin = (message) => adminList.includes(message.from.id);

const bot = new TelegramBot(token, { polling: true });

console.info({ bot });

// bot.onText(/.*/, (message) => {
//   console.info(message.entities);
// });

bot.onText(/warn/, (message) => {
  const groupId = message.chat.id;

  if (!message.reply_to_message) {
    return;
  }

  const userToRestrict = {
    id: message.reply_to_message.from.id,
    username: message.reply_to_message.from.username,
    name: message.reply_to_message.from.first_name,
  };

  if (warnedUsers.where({ id: userToRestrict.id }).length()) {
    bot.sendMessage(groupId, `${userToRestrict.name} уже пора забанить!`);
    return;
  }

  warnedUsers.insert(userToRestrict);
  bot.sendMessage(groupId, `${userToRestrict.name} записан`);
});

bot.onText(/list/, (message) => {
  const groupId = message.chat.id;
  console.info(message.entities);

  const entities = message.entities;

  if (entities.find((entity) => entity.type === 'mention')) {
    console.info(warnedUsers.items);
    const string = warnedUsers.items
      .map((item) => `${item.name} (@${item.username})`)
      .join('\n');
    bot.sendMessage(groupId, `${string}`);
  }
});
