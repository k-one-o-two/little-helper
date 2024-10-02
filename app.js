const dotenv = require('dotenv');

dotenv.config();

const TelegramBot = require('node-telegram-bot-api');

const locallydb = require('locallydb');
const db = new locallydb('./mydb');

const warnedUsers = db.collection('warnedUsers');

const token = process.env.TOKEN;

const adminList = process.env.ADMINS.split(',').map((id) => Number(id));

const isFromAdmin = (message) => adminList.includes(message.from.id);

const bot = new TelegramBot(token, { polling: true });

bot.on('polling_error', console.log);

bot.onText(/#warn\s?(.*)/, (message, match) => {
  const groupId = message.chat.id;

  if (!isFromAdmin(message)) {
    return;
  }

  if (!message.reply_to_message) {
    return;
  }

  const userToRestrict = {
    id: message.reply_to_message.from.id,
    username: message.reply_to_message.from.username,
    name: message.reply_to_message.from.first_name,
    cnt: 1,
    reason: match.length ? match[1] : '',
  };

  const foundInCollection = warnedUsers.where({ id: userToRestrict.id }).items;

  if (foundInCollection.length) {
    if (foundInCollection[0].cnt === 1) {
      warnedUsers.update(foundInCollection[0].cid, { cnt: 2 });
      bot.sendMessage(
        groupId,
        `${userToRestrict.name}: второе предупреждение, нужно выдать РО на неделю.`,
      );

      return;
    }
    if (foundInCollection[0].cnt === 2) {
      warnedUsers.update(foundInCollection[0].cid, { cnt: 3 });
      bot.sendMessage(
        groupId,
        `${userToRestrict.name}: третье предупреждение, нужно забанить.`,
      );

      return;
    }

    return;
  }

  warnedUsers.insert(userToRestrict);
  bot.sendMessage(groupId, `${userToRestrict.name} записан.`);
});

bot.onText(/list/, (message) => {
  const groupId = message.chat.id;

  const entities = message.entities;
  if (!entities) {
    return;
  }

  if (entities.find((entity) => entity.type === 'mention')) {
    if (warnedUsers.items.length > 0) {
      const string = warnedUsers.items
        .sort((iA, iB) => iB.cnt - iA.cnt)
        .map((item) => {
          const flags = Array(item.cnt).fill('🏴‍☠️', 0, item.cnt).join('');
          const lastActivity = `время последнего предупреждения: ${new Date(
            item['$updated'],
          ).toDateString()}`;

          return `${flags} ${item.name} (@${
            item.username
          }), ${lastActivity}, причина: ${
            item.reason ? item.reason : 'не указана'
          }`;
        })
        .join('\n');
      bot.sendMessage(groupId, `${string}`);
    } else {
      bot.sendMessage(groupId, `В моем списке никого нет. Пока.`);
    }
  }
});
