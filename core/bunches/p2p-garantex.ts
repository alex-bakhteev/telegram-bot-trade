import { Bunches } from '../enum/bunches';

import { sendSignal } from '../../telegram';
import { EXCHANGE_COMISSION, getSpotPrices } from '../garantex/spot';
import { getSignals } from '../../utils/redis';
import { succesListenSignal, rejectListenSignal } from '../../telegram';

export const handleP2P_Garantex = async (p2pBuy) => {
  // Find
  const prices = await getSpotPrices();

  const signal = findSpread(p2pBuy, prices);

  if (signal.length) {
    console.log('[P2P-Garantex] Found spread');

    await sendSignal(signal, { type: Bunches.P2P_GARANTEX });
  }

  // Listen
  const currentSignals = await getSignals();

  currentSignals
    .filter((signal) => signal.type === Bunches.P2P_GARANTEX)
    .forEach((signal) => listenSignal(signal, p2pBuy, prices));
};

export const findSpread = (buyList, prices) => {
  const { SETTINGS_AMOUNT, SETTINGS_SPREAD } = process.env;

  const spreads = buyList.map((buy) => {
    const amountInitial =
      Number(SETTINGS_AMOUNT) / buy.adv.price -
      EXCHANGE_COMISSION[buy.adv.asset];

    const priceItem = prices.find((item) => {
      if (buy.adv.asset === 'BTC') {
        return item.market === 'btcrub';
      }

      if (buy.adv.asset === 'ETH') {
        return item.market === 'ethrub';
      }

      if (buy.adv.asset === 'USDT') {
        return item.market === 'usdtrub';
      }
    });

    const { price, market } = priceItem;

    const amountTrade = amountInitial * price - amountInitial * price * 0.002;

    const spreadRub = amountTrade - Number(SETTINGS_AMOUNT);

    const spread = (spreadRub / Number(SETTINGS_AMOUNT)) * 100;

    if (spread > Number(SETTINGS_SPREAD)) {
      return {
        buy,
        spread,
        id: Bunches.P2P_GARANTEX + buy.advertiser.id + buy.adv.asset,
        type: Bunches.P2P_GARANTEX,
        sell: {
          price,
          market
        }
      };
    }

    return null;
  });

  return spreads.filter((item) => item);
};

export const listenSignal = async (signal, buyList, prices) => {
  const { SETTINGS_SPREAD } = process.env;

  const buy = buyList.find(
    (item) =>
      item.advertiser.id === signal.buy.advertiser.id &&
      item.adv.asset === signal.buy.adv.asset
  );

  if (!buy) {
    return rejectListenSignal(signal);
  }

  console.log('[P2P-Garantex] Checking exist signal');

  const currentSpread = await findSingleSpread(buy, signal, prices);

  if (currentSpread.spread < Number(SETTINGS_SPREAD) - 0.1) {
    console.log(
      `[P2P-Garantex] Checking exist signal: Rejected, prev spread: ${signal.spread} current spread: ${currentSpread.spread}`
    );

    return rejectListenSignal(signal);
  }

  if (currentSpread.spread.toFixed(2) !== signal.spread.toFixed(2)) {
    console.log(
      '[P2P-Garantex] Checking exist signal: Changed spread',
      currentSpread.spread.toFixed(2),
      signal.spread.toFixed(2)
    );

    await succesListenSignal(signal, currentSpread);
  }
};

export const findSingleSpread = async (buy, signal, prices) => {
  const { SETTINGS_AMOUNT } = process.env;

  const amountInitial =
    Number(SETTINGS_AMOUNT) / buy.adv.price - EXCHANGE_COMISSION[buy.adv.asset];

  const priceItem = prices.find((item) => item.market === signal.sell.market);

  const { price, market } = priceItem;

  const amountTrade = amountInitial * price - amountInitial * price * 0.002;

  const spreadRub = amountTrade - Number(SETTINGS_AMOUNT);

  const spread = (spreadRub / Number(SETTINGS_AMOUNT)) * 100;

  return {
    ...signal,
    buy,
    spread,
    sell: {
      price,
      market
    }
  };
};
