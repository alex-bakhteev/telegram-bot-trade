import { Bunches } from '../enum/bunches';

import { sendSignal } from '../../telegram';
import { getSpotPrices } from '../binance/spot';
import { getSignals } from '../../utils/redis';
import { SupportedCrypto } from '../enum/crypto';
import { succesListenSignal, rejectListenSignal } from '../../telegram';

export const handleP2P_Spot_P2P = async (p2pBuy, p2pSell) => {
  // Find
  const prices = await getSpotPrices();

  const signal = findSpread(p2pBuy, p2pSell, prices);

  if (signal.length) {
    console.log('[P2P-Spot-P2P] Found spread');

    await sendSignal(signal, { type: Bunches.P2P_SPOT_P2P });
  }

  // Listen
  const currentSignals = await getSignals();

  currentSignals
    .filter((signal) => signal.type === Bunches.P2P_SPOT_P2P)
    .forEach((signal) => listenSignal(signal, p2pBuy, p2pSell, prices));
};

export const findSpread = (buyList, sellList, prices) => {
  const { SETTINGS_AMOUNT, SETTINGS_SPREAD } = process.env;

  const spreads = buyList.map((buy) => {
    const amountInitial = Number(SETTINGS_AMOUNT) / buy.adv.price;

    if (buy.adv.asset === SupportedCrypto.BTC) {
      const swapEthPrice = prices.find((item) => item.symbol === 'ETHBTC')
        .price;

      const swapEthAmount =
        amountInitial / swapEthPrice - (amountInitial / swapEthPrice) * 0.00075;

      const swapUsdtPrice = prices.find((item) => item.symbol === 'BTCUSDT')
        .price;

      const swapUsdtAmount =
        amountInitial * swapUsdtPrice - amountInitial * swapUsdtPrice * 0.00075;

      return sellList.map((sell) => {
        let spreadRub;
        let price;

        if (sell.adv.asset === 'ETH') {
          spreadRub = sell.adv.price * swapEthAmount - Number(SETTINGS_AMOUNT);
          price = swapEthPrice;
        } else if (sell.adv.asset === 'USDT') {
          spreadRub = sell.adv.price * swapUsdtAmount - Number(SETTINGS_AMOUNT);
          price = swapUsdtPrice;
        } else {
          return null;
        }

        const spread = (spreadRub / Number(SETTINGS_AMOUNT)) * 100;

        if (spread > Number(SETTINGS_SPREAD)) {
          return {
            buy,
            sell,
            spread,
            type: Bunches.P2P_SPOT_P2P,
            id:
              Bunches.P2P_SPOT_P2P +
              buy.advertiser.id +
              sell.advertiser.id +
              sell.adv.asset,
            swap: {
              asset: sell.adv.asset,
              price,
              market: prices.find(
                (item) =>
                  item.symbol.includes(buy.adv.asset) &&
                  item.symbol.includes(sell.adv.asset)
              ).symbol
            }
          };
        }

        return null;
      });
    }

    if (buy.adv.asset === SupportedCrypto.ETH) {
      const swapBtcPrice = prices.find((item) => item.symbol === 'ETHBTC')
        .price;

      const swapBtcAmount =
        amountInitial * swapBtcPrice - amountInitial * swapBtcPrice * 0.00075;

      const swapUsdtPrice = prices.find((item) => item.symbol === 'ETHUSDT')
        .price;

      const swapUsdtAmount =
        amountInitial * swapUsdtPrice - amountInitial * swapUsdtPrice * 0.00075;

      return sellList.map((sell) => {
        let spreadRub;
        let price;

        if (sell.adv.asset === 'BTC') {
          spreadRub = sell.adv.price * swapBtcAmount - Number(SETTINGS_AMOUNT);
          price = swapBtcAmount;
        } else if (sell.adv.asset === 'USDT') {
          spreadRub = sell.adv.price * swapUsdtAmount - Number(SETTINGS_AMOUNT);
          price = swapUsdtPrice;
        } else {
          return null;
        }

        const spread = (spreadRub / Number(SETTINGS_AMOUNT)) * 100;

        if (spread > Number(SETTINGS_SPREAD)) {
          return {
            buy,
            sell,
            spread,
            id:
              Bunches.P2P_SPOT_P2P +
              buy.advertiser.id +
              sell.advertiser.id +
              sell.adv.asset,
            type: Bunches.P2P_SPOT_P2P,
            swap: {
              asset: sell.adv.asset,
              price,
              market: prices.find(
                (item) =>
                  item.symbol.includes(buy.adv.asset) &&
                  item.symbol.includes(sell.adv.asset)
              ).symbol
            }
          };
        }

        return null;
      });
    }

    if (buy.adv.asset === SupportedCrypto.USDT) {
      const swapBtcPrice = prices.find((item) => item.symbol === 'BTCUSDT')
        .price;

      const swapBtcAmount =
        amountInitial / swapBtcPrice - (amountInitial / swapBtcPrice) * 0.00075;

      const swapEthPrice = prices.find((item) => item.symbol === 'ETHUSDT')
        .price;

      const swapEthAmount =
        amountInitial / swapEthPrice - (amountInitial / swapEthPrice) * 0.00075;

      return sellList.map((sell) => {
        let spreadRub;
        let price;

        if (sell.adv.asset === 'BTC') {
          spreadRub = sell.adv.price * swapBtcAmount - Number(SETTINGS_AMOUNT);
          price = swapBtcAmount;
        } else if (sell.adv.asset === 'ETH') {
          spreadRub = sell.adv.price * swapEthAmount - Number(SETTINGS_AMOUNT);
          price = swapEthPrice;
        } else {
          return null;
        }

        const spread = (spreadRub / Number(SETTINGS_AMOUNT)) * 100;

        if (spread > Number(SETTINGS_SPREAD)) {
          return {
            buy,
            sell,
            spread,
            type: Bunches.P2P_SPOT_P2P,
            id:
              Bunches.P2P_SPOT_P2P +
              buy.advertiser.id +
              sell.advertiser.id +
              sell.adv.asset,
            swap: {
              asset: sell.adv.asset,
              price,
              market: prices.find(
                (item) =>
                  item.symbol.includes(buy.adv.asset) &&
                  item.symbol.includes(sell.adv.asset)
              ).symbol
            }
          };
        }

        return null;
      });
    }
  });

  return spreads.flat(2).filter((item) => !!item);
};

export const listenSignal = async (signal, buyList, sellList, prices) => {
  const { SETTINGS_SPREAD } = process.env;

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

  console.log('[P2P-Spot-P2P] Checking exist signal');

  const currentSpread = await findSingleSpread(buy, sell, signal, prices);

  if (currentSpread.spread < Number(SETTINGS_SPREAD) - 0.1) {
    console.log(
      `[P2P-Spot-P2P] Checking exist signal: Rejected, current spread: ${currentSpread.spread}`
    );

    return rejectListenSignal(signal);
  }

  if (currentSpread.spread.toFixed(2) !== signal.spread.toFixed(2)) {
    console.log(
      '[P2P-Spot-P2P] Checking exist signal: Changed spread',
      currentSpread.spread.toFixed(2),
      signal.spread.toFixed(2)
    );

    await succesListenSignal(signal, currentSpread);
  }
};

export const findSingleSpread = async (buy, sell, signal, prices) => {
  const { SETTINGS_AMOUNT } = process.env;

  let swapPrice;
  let amountSwap;

  const amountInitial = Number(SETTINGS_AMOUNT) / buy.adv.price;

  if (signal.buy.adv.asset === SupportedCrypto.BTC) {
    if (signal.swap.asset === SupportedCrypto.ETH) {
      swapPrice = prices.find((item) => item.symbol === 'ETHBTC').price;
      amountSwap = amountInitial / swapPrice;
    }

    if (signal.swap.asset === SupportedCrypto.USDT) {
      swapPrice = prices.find((item) => item.symbol === 'BTCUSDT').price;
      amountSwap = amountInitial * swapPrice;
    }
  }

  if (signal.buy.adv.asset === SupportedCrypto.ETH) {
    if (signal.swap.asset === SupportedCrypto.BTC) {
      swapPrice = prices.find((item) => item.symbol === 'ETHBTC').price;
      amountSwap = amountInitial * swapPrice;
    }

    if (signal.swap.asset === SupportedCrypto.USDT) {
      swapPrice = prices.find((item) => item.symbol === 'ETHUSDT').price;
      amountSwap = amountInitial * swapPrice;
    }
  }

  if (signal.buy.adv.asset === SupportedCrypto.USDT) {
    if (signal.swap.asset === SupportedCrypto.BTC) {
      swapPrice = prices.find((item) => item.symbol === 'BTCUSDT').price;
      amountSwap = amountInitial / swapPrice;
    }

    if (signal.swap.asset === SupportedCrypto.ETH) {
      swapPrice = prices.find((item) => item.symbol === 'ETHUSDT').price;
      amountSwap = amountInitial / swapPrice;
    }
  }

  amountSwap = amountSwap - amountSwap * 0.00075;

  const spreadRub = sell.adv.price * amountSwap - Number(SETTINGS_AMOUNT);
  const spread = (spreadRub / Number(SETTINGS_AMOUNT)) * 100;

  return {
    ...signal,
    buy,
    sell,
    spread,
    swap: {
      asset: signal.swap.asset,
      price: swapPrice,
      market: prices.find((item) => item.symbol.includes(sell.adv.asset)).symbol
    }
  };
};
