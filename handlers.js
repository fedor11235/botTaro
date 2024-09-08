import OpenAI from "openai";
import { config } from 'dotenv'
import { prisma } from './prisma.js'
import { meaningOfCards } from './settings.js'

config()

const openai = new OpenAI({apiKey: process.env.API_KEY_CGPT});

export async function handlerHelp(bot, msg) {
  await bot.sendMessage(msg.chat.id, `
    Для решения вопросов по оплате, пожалуйста, свяжитесь с нашей службой поддержки: <a href="https://t.me/fedor11235b">@support</a> Мы всегда готовы помочь вам решить любые возникшие проблемы или услышать предложения.
  `, {parse_mode: 'HTML'});
}

export async function handlerStart(bot, msg) {
    const user = await prisma.user.findUnique({
      where: {
        chat_id: msg.chat.id,
      },
    })
    if(user) {
      if(user.step === 0) {
        await bot.sendMessage(msg.chat.id, `
          Давайте познакомимся и начнем с небольшой анкеты.\n\nПожалуйста, введите ваше имя:
        `);
      } else if(user.step === 1) {
        await bot.sendMessage(msg.chat.id, `
          Теперь введите вашу дату рождения в формате ДД.ММ.ГГГГ (например, 01.01.2000):
        `);
      } else if(user.step === 2) {
        await prisma.user.update({
          where: {
            chat_id: msg.chat.id,
          },
          data: {
            step: 2
          },
        })
        await bot.sendMessage(msg.chat.id, `
          Задайте ваш вопрос в следующем сообщении.\n\nДля вашего удобства я принимаю и текстовые сообщения.\n\nЧтобы опробовать функционал вам доступны ответы ${user.actions_number} бесплатных расклада.
        `);
      }
    } else {
      await prisma.user.create({
        data: {
            chat_id: msg.chat.id,
        }
      })
      await bot.sendMessage(msg.chat.id, `
        Привет, я здесь, чтобы помочь вам раскрыть тайны и получить ответы на волнующие вопросы с помощью карт Таро.\n\nЧтобы опробовать функционал вам доступны ответы три бесплатных расклада.
      `);
      await bot.sendMessage(msg.chat.id, `
        Давайте познакомимся и начнем с небольшой анкеты.\n\nПожалуйста, введите ваше имя:
      `);
    }
}

export async function handlerPreCheckoutQuery(bot, ctx) {
  await bot.answerPreCheckoutQuery(ctx.id, true);
}

export async function handlerSuccessfulPayment(bot, msg) {
  const user = await prisma.user.findUnique({
    where: {
      chat_id: msg.chat.id,
    },
  })
  await prisma.user.update({
    where: {
      chat_id: msg.chat.id,
    },
    data: {
      actions_number: user.actions_number + 1,
    },
  })
  await bot.deleteMessage(msg.chat.id, user.last_message);
  await bot.sendMessage(msg.chat.id, "Спасибо, вы успешно купили один расклад");
}

export async function handlerAddAttempt(bot, msg) {
  const user = await prisma.user.findUnique({
    where: {
      chat_id: msg.chat.id,
    },
  })
  if(user) {
    await prisma.user.update({
      where: {
        chat_id: msg.chat.id,
      },
      data: {
        actions_number: user.actions_number + 1,
      },
    })
  }
}

export async function handlerText(bot, msg) {
    const user = await prisma.user.findUnique({
      where: {
        chat_id: msg.chat.id,
      },
    })
    if(user) {
      if(user.step === 0) {
        await prisma.user.update({
          where: {
            chat_id: msg.chat.id,
          },
          data: {
            name: msg.text,
            step: 1
          },
        })
        // await bot.sendMessage(msg.chat.id, "Для начала введите команду /start");
        await bot.sendMessage(msg.chat.id, `
          Отлично!Теперь введите вашу дату рождения в формате ДД.ММ.ГГГГ (например, 01.01.2000):
        `);
      } else if(user.step === 1) {
        await prisma.user.update({
          where: {
            chat_id: msg.chat.id,
          },
          data: {
            date_birth: msg.text,
            step: 2
          },
        })
        await bot.sendMessage(msg.chat.id, `
          Спасибо за ответы! Теперь давайте приступим к гаданию.
        `);
        await bot.sendMessage(msg.chat.id, `
          Задайте ваш вопрос в следующем сообщении.\n\nДля вашего удобства я принимаю и текстовые сообщения.\n\nЧтобы опробовать функционал вам доступны ответы ${user.actions_number} бесплатных расклада.
        `);
      } else if(user.step === 2) {
        if(user.actions_number > 0) {
          if(msg.text.length > 50) {
            await bot.sendMessage(msg.chat.id, 'Вы ввели слишком длинный текст');
            return
          }
          await prisma.user.update({
            where: {
              chat_id: msg.chat.id,
            },
            data: {
              actions_number: user.actions_number - 1
            },
          })
          const cardNumber = Math.floor(Math.random() * 21)
          const cardName = meaningOfCards[cardNumber]
          const msgAnimation = await bot.sendAnimation(msg.chat.id, './assets/loader.mp4');
          const completion = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                {"role": "user", "content": `Погадай на таро карте ${cardName}, вопрос ${msg.text}?`}
            ]
          });
          await bot.sendPhoto(msg.chat.id, `./assets/taro/${cardNumber}.webp`, {caption: `Вам выпала карта: "${cardName}"`});
          await bot.sendMessage(msg.chat.id, completion.choices[0].message.content);
          await bot.deleteMessage(msg.chat.id, msgAnimation.message_id);
          await bot.sendMessage(msg.chat.id, `
            Надеюсь, этот расклад был полезен для вас!\n\nГотовы узнать больше?\n\nЗадайте свой следующий вопрос, отправив текстовое или голосовое сообщение.
          `);
        } else {
          const newMsg = await bot.sendInvoice(
            msg.chat.id,
            "Получить расклад на одну карту",
            "Получить расклад на одну карту",
            "first",
            null,
            "XTR",
            [{
              label: "Расклад",
              amount: 50
            }],
          )
          await prisma.user.update({
            where: {
              chat_id: msg.chat.id,
            },
            data: {
              last_message: newMsg.message_id,
            },
          })
        }
      }
    } else {
      await bot.sendMessage(msg.chat.id, "Для начала введите команду /start");
    }
}


// await bot.sendMessage(msg.chat.id, `
// Задайте ваш вопрос в следующем сообщении.\n\nДля вашего удобства я принимаю и текстовые сообщения и голосовые.
// `);

// let msgWait
// try {
//     msgWait = await bot.sendMessage(msg.chat.id, `Бот генерирует ответ...`);
// } catch(error) {
//     console.error(error)
// }

// setTimeout(async () => {

//     // await bot.deleteMessage(msgWait.chat.id, msgWait.message_id);
//     try {
//         await bot.editMessageText(msg.text, {

//             chat_id: msgWait.chat.id,
//             message_id: msgWait.message_id

//         });
//     } catch(error) {
//         console.error(error)
//     }

// }, 5000);

// export async function handlerPreview(bot, msg) {
//     bot.sendPhoto(
//       msg.chat.id,
//       './assets/description.jpg', {
//         caption: '*Что умеет этот бот?\n*TaroMaster \\- ваш личный помощник для гадания на картах Таро\\. Задавайте вопросы, выбирайте расклад и получайте интерпритации и советы\\. Начните с команды start, чтобы пройти анкету и начать гадание\\!',
//         parse_mode: 'MarkdownV2'
//     })
// }