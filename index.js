import { config } from 'dotenv'
import TelegramBot from 'node-telegram-bot-api';

import { commands } from './settings.js'
import { handlerStart, handlerHelp, handlerText, handlerPreCheckoutQuery, handlerSuccessfulPayment } from './handlers.js'

config();

// Меню команд бота
const bot = new TelegramBot(process.env.API_KEY_BOT, {
    polling: true
});

bot.setMyCommands(commands);

// Слушаем ошибки
bot.on("polling_error", err => console.log(err.data.error.message));

// Подтверждение перед оформлением заказа last_message
bot.on('pre_checkout_query', async ctx => {
  try {
    await handlerPreCheckoutQuery(bot, ctx)
  } catch(error) {
    console.log(error);
  }
})

// Слушаем успешную оплату
bot.on('successful_payment', async (msg) => {
  try {
    await handlerSuccessfulPayment(bot, msg)
  }  catch(error) {
    console.log(error);
  }
  // bot.sendMessage(chatId, 'Спасибо за ваш донат! Ваш вклад поможет развитию проекта.');
});

// Слушаем сообщения от пользователя
bot.on('text', async msg => {
  try {
    if(msg.text.startsWith('/start')) {
      await handlerStart(bot, msg)
    } else  if(msg.text.startsWith('/help')) {
      await handlerHelp(bot, msg)
    }
    else {
      await handlerText(bot, msg)
    }
  }
  catch(error) {
    console.error(error);
  }
})



// Слушаем сообщения от пользователя команды /start
// bot.onText(/\/start/, async msg => {
//     try {

//         await bot.sendMessage(msg.chat.id, `Вы запустили бота!`);

//         if(msg.text.length > 6) {

//             const refID = msg.text.slice(7);

//             await bot.sendMessage(msg.chat.id, `Вы зашли по ссылке пользователя с ID ${refID}`);

//         }

//     }
//     catch(error) {

//         console.log(error);

//     }
// })
