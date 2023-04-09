import { Telegraf } from 'telegraf';
import { Markup } from 'telegraf';

import {
  clearUserSession,
  getAuthorizedUsers,
  setAuthorizedUsers,
  setAuthorizedUser,
  setSuccessSignal,
  getSignals,
  removeSignal
} from '../utils/redis';
import { isAuthorized } from '../utils/helpers';
import { Bunches } from '../core/enum/bunches';

export const bootstrap = () => {
  const bot = new Telegraf(process.env.BOT_TOKEN);

  global.bot = bot;

  bot.start(async (ctx) => {
    const authorized = isAuthorized(ctx);

    if (!authorized) {
      return ctx.reply('Доступ запрещен');
    }

    ctx.reply(
      'Добро пожаловать в Trading Bot! Сюда будут приходить сигналы о выгодных сделках.'
    );

    const telegramId = String(ctx.chat.id);

    await clearUserSession(telegramId);

    const authorizedUsers = await getAuthorizedUsers();

    const existUser = authorizedUsers.find((item) => item.id == telegramId);

    if (!existUser) {
      try {
        setAuthorizedUser(ctx);
      } catch {}
    }
  });

  bot.catch((err) => {
    console.log('ERROR', err);
  });

  bot.launch();

  console.log('Telegram bot successfully started');
};

export const sendSignal = async (signals, { type }) => {
  let authorizedUsers = await getAuthorizedUsers();

  console.log(authorizedUsers);

  const currentSignals = await getSignals();

  const filteredSignals = signals.filter(
    (item) => !currentSignals.some((signal) => signal.id === item.id)
  );

  const users = [];

  if (authorizedUsers.length !== 0) {
    for (let item of filteredSignals) {
      let user = authorizedUsers.find((item) => !item.receivedMessage);

      if (!user) {
        authorizedUsers = authorizedUsers.map((user) => ({
          ...user,
          receivedMessage: false
        }));

        user = authorizedUsers[0];
      }

      authorizedUsers = authorizedUsers.map((item) =>
        item.id === user.id ? { ...user, receivedMessage: true } : item
      );

      users.push(user);
    }
  }

  await setAuthorizedUsers(authorizedUsers);

  if (users.length) {
    await Promise.all(
      filteredSignals.map(async (signal, index) => {
        const user = users[index];

        const { content, markup } = getSignalContent(type, signal);

        try {
          const message = await global.bot.telegram.sendMessage(
            user.id,
            `${content}\n\n✅ Связка актуальна.`,
            {
              parse_mode: 'Markdown',
              ...markup
            }
          );

          await setSuccessSignal(signal, message, user);
        } catch (e) {
          console.log('Error send message', e.message);
        }
      })
    );
  }
};

export const succesListenSignal = async (signal, currentSpread) => {
  try {
    const { SETTINGS_AMOUNT } = process.env;
    const { content } = getSignalContent(signal.type, signal);

    await global.bot.telegram.editMessageText(
      signal.user.id,
      signal.message.message_id,
      signal.message.message_id,
      `${content}\n\n✅ Связка актуальна.\nТекущий спред: ${currentSpread.spread.toFixed(
        2
      )}%\nТекущий профит: ${Math.round(
        (Number(SETTINGS_AMOUNT) * currentSpread.spread) / 100
      )} RUB`,
      {
        parse_mode: 'Markdown',
        reply_markup: signal.message.reply_markup
      }
    );

    await removeSignal(signal.id);
    await setSuccessSignal(currentSpread, signal.message, signal.user);
  } catch (e) {
    console.log('Error success listen signal', e.message);
  }
};

export const rejectListenSignal = async (signal) => {
  try {
    const { content } = getSignalContent(signal.type, signal);

    await global.bot.telegram.editMessageText(
      signal.user.id,
      signal.message.message_id,
      signal.message.message_id,
      `${content}\n\n❌ Связка неактуальна.`,
      {
        parse_mode: 'Markdown',
        reply_markup: signal.message.reply_markup
      }
    );

    await removeSignal(signal.id);
  } catch (e) {
    console.log('Error reject listen signal', e.message);
  }
};

const getSignalContent = (type, { buy, sell, swap, spread }) => {
  const { SETTINGS_AMOUNT } = process.env;

  switch (type) {
    case Bunches.P2P_P2P:
      return {
        content: `💸 Спред: ${spread.toFixed(2)}%\nПрофит: ${Math.round(
          (Number(SETTINGS_AMOUNT) * spread) / 100
        )} RUB\nОбъём: ${SETTINGS_AMOUNT} РУБ.\nБиржа: BINANCE\n\n🟢 ТЕЙКЕР - ТЕЙКЕР.\n1. [Купить ${
          buy.adv.asset
        }](https://p2p.binance.com/ru/advertiserDetail?advertiserNo=${
          buy.advertiser.id
        }) (${buy.adv.types.map((item) => item.identifier).join(', ')} -> ${
          buy.adv.price
        })\n2. [Продать ${
          sell.adv.asset
        }](https://p2p.binance.com/ru/advertiserDetail?advertiserNo=${
          sell.advertiser.id
        }) (${sell.adv.types.map((item) => item.identifier).join(', ')} -> ${
          sell.adv.price
        })\n\n⬇️ Сверить курсы:\n${buy.adv.asset}: ${buy.adv.price}\n${
          sell.adv.asset
        }: ${sell.adv.price}`,
        markup: Markup.inlineKeyboard(
          sell.adv.asset === 'BTC' || sell.adv.asset === 'ETH'
            ? [
                [
                  Markup.button.url(
                    `Купить ${buy.adv.asset}`,
                    `https://p2p.binance.com/ru/advertiserDetail?advertiserNo=${buy.advertiser.id}`
                  )
                ],
                [
                  Markup.button.url(
                    `Хеджировать ${sell.adv.asset}`,
                    `https://www.binance.com/ru/futures/${sell.adv.asset}USDT`
                  )
                ],
                [
                  Markup.button.url(
                    `Продать ${sell.adv.asset}`,
                    `https://p2p.binance.com/ru/advertiserDetail?advertiserNo=${sell.advertiser.id}`
                  )
                ]
              ]
            : [
                [
                  Markup.button.url(
                    `Купить ${buy.adv.asset}`,
                    `https://p2p.binance.com/ru/advertiserDetail?advertiserNo=${buy.advertiser.id}`
                  )
                ],
                [
                  Markup.button.url(
                    `Продать ${sell.adv.asset}`,
                    `https://p2p.binance.com/ru/advertiserDetail?advertiserNo=${sell.advertiser.id}`
                  )
                ]
              ]
        )
      };

    case Bunches.P2P_SPOT_P2P:
      return {
        content: `💸 Спред: ${spread.toFixed(2)}%\nПрофит: ${Math.round(
          (Number(SETTINGS_AMOUNT) * spread) / 100
        )} RUB\nОбъём: ${SETTINGS_AMOUNT} РУБ.\nБиржа: BINANCE\n\n🟢 ТЕЙКЕР - ТЕЙКЕР.\n1. [Купить ${
          buy.adv.asset
        }](https://p2p.binance.com/ru/advertiserDetail?advertiserNo=${
          buy.advertiser.id
        }) (${buy.adv.types.map((item) => item.identifier).join(', ')} -> ${
          buy.adv.price
        })\n2. [Обменять ${buy.adv.asset} на ${
          sell.adv.asset
        }](https://www.binance.com/ru/trade/${swap.market}) (Спот -> ${
          swap.price
        })\n3. [Продать ${
          sell.adv.asset
        }](https://p2p.binance.com/ru/advertiserDetail?advertiserNo=${
          sell.advertiser.id
        }) (${sell.adv.types.map((item) => item.identifier).join(', ')} -> ${
          sell.adv.price
        })\n\n⬇️ Сверить курсы:\n${buy.adv.asset}: ${buy.adv.price}\n${
          swap.asset
        } (Спот): ${swap.price}\n${sell.adv.asset}: ${sell.adv.price}`,
        markup: Markup.inlineKeyboard(
          sell.adv.asset === 'BTC' || sell.adv.asset === 'ETH'
            ? [
                [
                  Markup.button.url(
                    `Купить ${buy.adv.asset}`,
                    `https://p2p.binance.com/ru/advertiserDetail?advertiserNo=${buy.advertiser.id}`
                  )
                ],
                [
                  Markup.button.url(
                    `Обменять ${buy.adv.asset} -> ${sell.adv.asset}`,
                    `https://www.binance.com/ru/trade/${swap.market}`
                  )
                ],
                [
                  Markup.button.url(
                    `Хеджировать ${sell.adv.asset}`,
                    `https://www.binance.com/ru/futures/${sell.adv.asset}USDT`
                  )
                ],
                [
                  Markup.button.url(
                    `Продать ${sell.adv.asset}`,
                    `https://p2p.binance.com/ru/advertiserDetail?advertiserNo=${sell.advertiser.id}`
                  )
                ]
              ]
            : [
                [
                  Markup.button.url(
                    `Купить ${buy.adv.asset}`,
                    `https://p2p.binance.com/ru/advertiserDetail?advertiserNo=${buy.advertiser.id}`
                  )
                ],
                [
                  Markup.button.url(
                    `Обменять ${buy.adv.asset} -> ${sell.adv.asset}`,
                    `https://www.binance.com/ru/trade/${swap.market}`
                  )
                ],
                [
                  Markup.button.url(
                    `Продать ${sell.adv.asset}`,
                    `https://p2p.binance.com/ru/advertiserDetail?advertiserNo=${sell.advertiser.id}`
                  )
                ]
              ]
        )
      };

    case Bunches.P2P_GARANTEX:
      return {
        content: `💸 Спред: ${spread.toFixed(2)}%\nПрофит: ${Math.round(
          (Number(SETTINGS_AMOUNT) * spread) / 100
        )} RUB\nОбъём: ${SETTINGS_AMOUNT} РУБ.\nБиржа: BINANCE -> GARANTEX\n\n🟢 ТЕЙКЕР - ТЕЙКЕР.\n1. [Купить ${
          buy.adv.asset
        }](https://p2p.binance.com/ru/advertiserDetail?advertiserNo=${
          buy.advertiser.id
        }) (${buy.adv.types.map((item) => item.identifier).join(', ')} -> ${
          buy.adv.price
        })\n2. [Продать ${buy.adv.asset}](https://garantex.io/trading/${
          sell.market
        }) (Garantex -> ${sell.price})\n\n⬇️ Сверить курсы:\n${
          buy.adv.asset
        }: ${buy.adv.price}\n${buy.adv.asset}: ${sell.price}`,
        markup: Markup.inlineKeyboard(
          buy.adv.asset === 'BTC' || buy.adv.asset === 'ETH'
            ? [
                [
                  Markup.button.url(
                    `Купить ${buy.adv.asset}`,
                    `https://p2p.binance.com/ru/advertiserDetail?advertiserNo=${buy.advertiser.id}`
                  )
                ],
                [
                  Markup.button.url(
                    `Хеджировать ${buy.adv.asset}`,
                    `https://www.binance.com/ru/futures/${buy.adv.asset}USDT`
                  )
                ],
                [
                  Markup.button.url(
                    `Продать ${buy.adv.asset}`,
                    `https://garantex.io/trading/${sell.market}`
                  )
                ]
              ]
            : [
                [
                  Markup.button.url(
                    `Купить ${buy.adv.asset}`,
                    `https://p2p.binance.com/ru/advertiserDetail?advertiserNo=${buy.advertiser.id}`
                  )
                ],
                [
                  Markup.button.url(
                    `Продать ${buy.adv.asset}`,
                    `https://garantex.io/trading/${sell.market}`
                  )
                ]
              ]
        )
      };

    case Bunches.P2P_SPOT_GARANTEX:
      return {
        content: `💸 Спред: ${spread.toFixed(2)}%\nПрофит: ${Math.round(
          (Number(SETTINGS_AMOUNT) * spread) / 100
        )} RUB\nОбъём: ${SETTINGS_AMOUNT} РУБ.\nБиржа: BINANCE -> GARANTEX\n\n🟢 ТЕЙКЕР - ТЕЙКЕР.\n1. [Купить ${
          buy.adv.asset
        }](https://p2p.binance.com/ru/advertiserDetail?advertiserNo=${
          buy.advertiser.id
        }) (${buy.adv.types.map((item) => item.identifier).join(', ')} -> ${
          buy.adv.price
        })\n2. [Обменять ${buy.adv.asset} на ${
          swap.asset
        }](https://www.binance.com/ru/trade/${swap.market}) (Спот -> ${
          swap.price
        })\n3. [Продать ${buy.adv.asset}](https://garantex.io/trading/${
          sell.market
        }) (Garantex -> ${sell.price})\n\n⬇️ Сверить курсы:\n${
          buy.adv.asset
        }: ${buy.adv.price}\n${swap.asset} (Спот): ${swap.price}\n${
          swap.asset
        }: ${sell.price}`,
        markup: Markup.inlineKeyboard(
          swap.asset === 'BTC' || swap.asset === 'ETH'
            ? [
                [
                  Markup.button.url(
                    `Купить ${buy.adv.asset}`,
                    `https://p2p.binance.com/ru/advertiserDetail?advertiserNo=${buy.advertiser.id}`
                  )
                ],
                [
                  Markup.button.url(
                    `Обменять ${buy.adv.asset} -> ${swap.asset}`,
                    `https://www.binance.com/ru/trade/${swap.market}`
                  )
                ],
                [
                  Markup.button.url(
                    `Хеджировать ${swap.asset}`,
                    `https://www.binance.com/ru/futures/${swap.asset}USDT`
                  )
                ],
                [
                  Markup.button.url(
                    `Продать ${swap.asset}`,
                    `https://garantex.io/trading/${sell.market}`
                  )
                ]
              ]
            : [
                [
                  Markup.button.url(
                    `Купить ${buy.adv.asset}`,
                    `https://p2p.binance.com/ru/advertiserDetail?advertiserNo=${buy.advertiser.id}`
                  )
                ],
                [
                  Markup.button.url(
                    `Обменять ${buy.adv.asset} -> ${swap.asset}`,
                    `https://www.binance.com/ru/trade/${swap.market}`
                  )
                ],
                [
                  Markup.button.url(
                    `Продать ${swap.asset}`,
                    `https://garantex.io/trading/${sell.market}`
                  )
                ]
              ]
        )
      };
  }
};
