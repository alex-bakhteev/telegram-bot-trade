import { Bunches } from '../enum/bunches';

import { sendSignal } from '../../telegram';
import { getSignals } from '../../utils/redis';
import { SupportedCrypto } from '../enum/crypto';
import { succesListenSignal, rejectListenSignal } from '../../telegram';

export const handleP2P_P2P = async (p2pBuy, p2pSell) => {
  // Find
  const signal = findSpread(p2pBuy, p2pSell);

  if (signal.length) {
    console.log('[P2P-P2P] Found spread');

    await sendSignal(signal, { type: Bunches.P2P_P2P });
  }

  // Listen
  const currentSignals = await getSignals();
  currentSignals
    .filter((signal) => signal.type === Bunches.P2P_P2P)
    .forEach((signal) => listenSignal(signal, p2pBuy, p2pSell));
};

export const findSpread = (buyList, sellList) => {
  const { SETTINGS_SPREAD } = process.env;

  const spreads = Object.values(SupportedCrypto).map((crypto) => {
    const buyCryptoList = buyList.filter((item) => item.adv.asset === crypto);
    const sellCryptoList = sellList.filter((item) => item.adv.asset === crypto);

    return buyCryptoList.map((buy) => {
      return sellCryptoList.map((sell) => {
        const spread = (1 - buy.adv.price / sell.adv.price) * 100;

        if (spread > Number(SETTINGS_SPREAD)) {
          return {
            buy,
            sell,
            spread,
            id: Bunches.P2P_P2P + buy.advertiser.id + sell.advertiser.id,
            type: Bunches.P2P_P2P
          };
        }

        return null;
      });
    });
  });

  return spreads.flat(2).filter((item) => item);
};

export const listenSignal = async (signal, buyList, sellList) => {
  const { SETTINGS_SPREAD } = process.env;

  console.log('[P2P-P2P] Checking exist signal');

  const buy = buyList.find(
    (item) =>
      item.advertiser.id === signal.buy.advertiser.id &&
      item.adv.asset === signal.buy.adv.asset
  );

  const sell = sellList.find(
    (item) =>
      item.advertiser.id === signal.sell.advertiser.id &&
      item.adv.asset === signal.sell.adv.asset
  );

  if (!buy || !sell) {
    return rejectListenSignal(signal);
  }

  const currentSpread = findSingleSpread(buy, sell, signal);

  if (currentSpread.spread < Number(SETTINGS_SPREAD) - 0.1) {
    console.log(
      `[P2P-P2P] Checking exist signal: Rejected, current spread: ${currentSpread.spread}`
    );
    return rejectListenSignal(signal);
  }

  if (currentSpread.spread.toFixed(2) !== signal.spread.toFixed(2)) {
    console.log(
      '[P2P-P2P] Checking exist signal: Changed spread',
      currentSpread.spread.toFixed(2),
      signal.spread.toFixed(2)
    );

    await succesListenSignal(signal, currentSpread);
  }
};

export const findSingleSpread = (buy, sell, signal) => {
  const spread = (1 - buy.adv.price / sell.adv.price) * 100;

  return {
    ...signal,
    buy,
    sell,
    spread
  };
};
