import { Bunches } from '../enum/bunches';

import { sendSignal } from '../../telegram';
import { getSpotPrices as getBinanceSpotPrices } from '../binance/spot';
import {
  EXCHANGE_COMISSION,
  getSpotPrices as getGarantexSpotPrices
} from '../garantex/spot';
import { getSignals } from '../../utils/redis';
import { SupportedCrypto } from '../enum/crypto';
import { succesListenSignal, rejectListenSignal } from '../../telegram';

export const handleP2P_Spot_Garantex = async (p2pBuy) => {
  // Find
  const binancePrices = await getBinanceSpotPrices();
  const garantexPrices = await getGarantexSpotPrices();

  const signal = findSpread(p2pBuy, binancePrices, garantexPrices);

  if (signal.length) {
    console.log('[P2P-Spot-Garantex] Found spread');

    await sendSignal(signal, { type: Bunches.P2P_SPOT_GARANTEX });
  }

  // Listen
  const currentSignals = await getSignals();

  currentSignals
    .filter((signal) => signal.type === Bunches.P2P_SPOT_GARANTEX)
    .forEach((signal) =>
      listenSignal(signal, p2pBuy, binancePrices, garantexPrices)
    );
};

export const findSpread = (buyList, binancePrices, garantexPrices) => {
  const { SETTINGS_AMOUNT, SETTINGS_SPREAD } = process.env;

  const spreads = buyList.map((buy) => {
    const amountInitial = Number(SETTINGS_AMOUNT) / buy.adv.price;

    const spreads = [];

    if (buy.adv.asset === SupportedCrypto.BTC) {
      // Swap ETH
      const swapEthPrice = binancePrices.find(
        (item) => item.symbol === 'ETHBTC'
      ).price;

      const swapEthAmount =
        amountInitial / swapEthPrice -
        (amountInitial / swapEthPrice) * 0.00075 -
        EXCHANGE_COMISSION[SupportedCrypto.ETH];

      const sellEthPrice = garantexPrices.find((item) => {
        return item.market === 'ethrub';
      });

      const { price: ethPrice, market: ethMarket } = sellEthPrice;

      const sellEthRub =
        swapEthAmount * ethPrice - swapEthAmount * ethPrice * 0.002;

      const spreadEthRub = sellEthRub - Number(SETTINGS_AMOUNT);

      const spreadEth = (spreadEthRub / Number(SETTINGS_AMOUNT)) * 100;

      if (spreadEth > Number(SETTINGS_SPREAD)) {
        const spread = {
          buy,
          spread: spreadEth,
          id:
            Bunches.P2P_SPOT_GARANTEX +
            buy.advertiser.id +
            SupportedCrypto.BTC +
            SupportedCrypto.ETH,
          type: Bunches.P2P_SPOT_GARANTEX,
          swap: {
            asset: 'ETH',
            price: swapEthPrice,
            market: binancePrices.find(
              (item) =>
                item.symbol.includes(SupportedCrypto.BTC) &&
                item.symbol.includes(SupportedCrypto.ETH)
            ).symbol
          },
          sell: {
            price: ethPrice,
            market: ethMarket
          }
        };

        spreads.push(spread);
      }

      // SWAP USDT
      const swapUsdtPrice = binancePrices.find(
        (item) => item.symbol === 'BTCUSDT'
      ).price;

      const swapUsdtAmount =
        amountInitial * swapUsdtPrice -
        amountInitial * swapUsdtPrice * 0.00075 -
        EXCHANGE_COMISSION[SupportedCrypto.USDT];

      const sellUsdtPrice = garantexPrices.find((item) => {
        return item.market === 'usdtrub';
      });

      const { price: usdtPrice, market: usdtMarket } = sellUsdtPrice;

      const sellUsdtRub =
        swapUsdtAmount * usdtPrice - swapUsdtAmount * usdtPrice * 0.002;

      const spreadUsdtRub = sellUsdtRub - Number(SETTINGS_AMOUNT);

      const spreadUsdt = (spreadUsdtRub / Number(SETTINGS_AMOUNT)) * 100;

      if (spreadUsdt > Number(SETTINGS_SPREAD)) {
        const spread = {
          buy,
          spread: spreadUsdt,
          id:
            Bunches.P2P_SPOT_GARANTEX +
            buy.advertiser.id +
            SupportedCrypto.BTC +
            SupportedCrypto.USDT,
          type: Bunches.P2P_SPOT_GARANTEX,
          swap: {
            asset: SupportedCrypto.USDT,
            price: swapUsdtPrice,
            market: binancePrices.find(
              (item) =>
                item.symbol.includes(SupportedCrypto.BTC) &&
                item.symbol.includes(SupportedCrypto.USDT)
            ).symbol
          },
          sell: {
            price: usdtPrice,
            market: usdtMarket
          }
        };

        spreads.push(spread);
      }
    }

    if (buy.adv.asset === SupportedCrypto.ETH) {
      // Swap BTC
      const swapBtcPrice = binancePrices.find(
        (item) => item.symbol === 'ETHBTC'
      ).price;

      const swapBtcAmount =
        amountInitial * swapBtcPrice -
        amountInitial * swapBtcPrice * 0.00075 -
        EXCHANGE_COMISSION[SupportedCrypto.BTC];

      const sellBtcPrice = garantexPrices.find((item) => {
        return item.market === 'btcrub';
      });

      const { price: btcPrice, market: btcMarket } = sellBtcPrice;

      const sellBtcRub =
        swapBtcAmount * btcPrice - swapBtcAmount * btcPrice * 0.002;

      const spreadBtcRub = sellBtcRub - Number(SETTINGS_AMOUNT);

      const spreadBtc = (spreadBtcRub / Number(SETTINGS_AMOUNT)) * 100;

      if (spreadBtc > Number(SETTINGS_SPREAD)) {
        const spread = {
          buy,
          spread: spreadBtc,
          id:
            Bunches.P2P_SPOT_GARANTEX +
            buy.advertiser.id +
            SupportedCrypto.ETH +
            SupportedCrypto.BTC,
          type: Bunches.P2P_SPOT_GARANTEX,
          swap: {
            asset: SupportedCrypto.BTC,
            price: swapBtcPrice,
            market: binancePrices.find(
              (item) =>
                item.symbol.includes(SupportedCrypto.BTC) &&
                item.symbol.includes(SupportedCrypto.ETH)
            ).symbol
          },
          sell: {
            price: btcPrice,
            market: btcMarket
          }
        };

        spreads.push(spread);
      }

      // SWAP USDT
      const swapUsdtPrice = binancePrices.find(
        (item) => item.symbol === 'ETHUSDT'
      ).price;

      const swapUsdtAmount =
        amountInitial * swapUsdtPrice -
        amountInitial * swapUsdtPrice * 0.00075 -
        EXCHANGE_COMISSION[SupportedCrypto.USDT];

      const sellUsdtPrice = garantexPrices.find((item) => {
        return item.market === 'usdtrub';
      });

      const { price: usdtPrice, market: usdtMarket } = sellUsdtPrice;

      const sellUsdtRub =
        swapUsdtAmount * usdtPrice - swapUsdtAmount * usdtPrice * 0.002;

      const spreadUsdtRub = sellUsdtRub - Number(SETTINGS_AMOUNT);

      const spreadUsdt = (spreadUsdtRub / Number(SETTINGS_AMOUNT)) * 100;

      if (spreadUsdt > Number(SETTINGS_SPREAD)) {
        const spread = {
          buy,
          spread: spreadUsdt,
          id:
            Bunches.P2P_SPOT_GARANTEX +
            buy.advertiser.id +
            SupportedCrypto.ETH +
            SupportedCrypto.USDT,
          type: Bunches.P2P_SPOT_GARANTEX,
          swap: {
            asset: SupportedCrypto.USDT,
            price: swapUsdtPrice,
            market: binancePrices.find(
              (item) =>
                item.symbol.includes(SupportedCrypto.BTC) &&
                item.symbol.includes(SupportedCrypto.USDT)
            ).symbol
          },
          sell: {
            price: usdtPrice,
            market: usdtMarket
          }
        };

        spreads.push(spread);
      }
    }

    if (buy.adv.asset === SupportedCrypto.USDT) {
      // Swap BTC
      const swapBtcPrice = binancePrices.find(
        (item) => item.symbol === 'BTCUSDT'
      ).price;

      const swapBtcAmount =
        amountInitial / swapBtcPrice -
        (amountInitial / swapBtcPrice) * 0.00075 -
        EXCHANGE_COMISSION[SupportedCrypto.BTC];

      const sellBtcPrice = garantexPrices.find((item) => {
        return item.market === 'usdtrub';
      });

      const { price: btcPrice, market: btcMarket } = sellBtcPrice;

      const sellBtcRub =
        swapBtcAmount * btcPrice - swapBtcAmount * btcPrice * 0.002;

      const spreadBtcRub = sellBtcRub - Number(SETTINGS_AMOUNT);

      const spreadBtc = (spreadBtcRub / Number(SETTINGS_AMOUNT)) * 100;

      if (spreadBtc > Number(SETTINGS_SPREAD)) {
        const spread = {
          buy,
          spread: spreadBtc,
          id:
            Bunches.P2P_SPOT_GARANTEX +
            buy.advertiser.id +
            SupportedCrypto.USDT +
            SupportedCrypto.BTC,
          type: Bunches.P2P_SPOT_GARANTEX,
          swap: {
            asset: SupportedCrypto.BTC,
            price: swapBtcPrice,
            market: binancePrices.find(
              (item) =>
                item.symbol.includes(SupportedCrypto.BTC) &&
                item.symbol.includes(SupportedCrypto.USDT)
            ).symbol
          },
          sell: {
            price: btcPrice,
            market: btcMarket
          }
        };

        spreads.push(spread);
      }

      // SWAP ETH
      const swapEthPrice = binancePrices.find(
        (item) => item.symbol === 'ETHUSDT'
      ).price;

      const swapEthAmount =
        amountInitial / swapEthPrice -
        (amountInitial / swapEthPrice) * 0.00075 -
        EXCHANGE_COMISSION[SupportedCrypto.ETH];

      const sellEthPrice = garantexPrices.find((item) => {
        return item.market === 'ethrub';
      });

      const { price: ethPrice, market: ethMarket } = sellEthPrice;

      const sellEthRub =
        swapEthAmount * ethPrice - swapEthAmount * ethPrice * 0.002;

      const spreadEthRub = sellEthRub - Number(SETTINGS_AMOUNT);

      const spreadEth = (spreadEthRub / Number(SETTINGS_AMOUNT)) * 100;

      if (spreadEth > Number(SETTINGS_SPREAD)) {
        const spread = {
          buy,
          spread: spreadEth,
          id:
            Bunches.P2P_SPOT_GARANTEX +
            buy.advertiser.id +
            SupportedCrypto.USDT +
            SupportedCrypto.ETH,
          type: Bunches.P2P_SPOT_GARANTEX,
          swap: {
            asset: SupportedCrypto.ETH,
            price: swapEthPrice,
            market: binancePrices.find(
              (item) =>
                item.symbol.includes(SupportedCrypto.USDT) &&
                item.symbol.includes(SupportedCrypto.ETH)
            ).symbol
          },
          sell: {
            price: ethPrice,
            market: ethMarket
          }
        };

        spreads.push(spread);
      }
    }

    return spreads;
  });

  return spreads.flat(2).filter((item) => !!item);
};

export const listenSignal = async (
  signal,
  buyList,
  binancePrices,
  garantexPrices
) => {
  const { SETTINGS_SPREAD } = process.env;

  const buy = buyList.find(
    (item) =>
      item.advertiser.id === signal.buy.advertiser.id &&
      item.adv.asset === signal.buy.adv.asset
  );

  if (!buy) {
    return rejectListenSignal(signal);
  }

  console.log('[P2P-Spot-Garantex] Checking exist signal');

  const currentSpread = await findSingleSpread(
    buy,
    signal,
    binancePrices,
    garantexPrices
  );

  if (currentSpread.spread < Number(SETTINGS_SPREAD) - 0.1) {
    console.log(
      `[P2P-Spot-Garantex] Checking exist signal: Rejected, prev spread: ${signal.spread} current spread: ${currentSpread.spread}`
    );

    return rejectListenSignal(signal);
  }

  if (currentSpread.spread.toFixed(2) !== signal.spread.toFixed(2)) {
    console.log(
      '[P2P-Spot-Garantex] Checking exist signal: Changed spread',
      currentSpread.spread.toFixed(2),
      signal.spread.toFixed(2)
    );

    await succesListenSignal(signal, currentSpread);
  }
};

export const findSingleSpread = async (
  buy,
  signal,
  binancePrices,
  garantexPrices
) => {
  const { SETTINGS_AMOUNT } = process.env;

  let swapPrice;
  let amountSwap;
  let sellPrice;
  let swapMarket;

  const amountInitial = Number(SETTINGS_AMOUNT) / buy.adv.price;

  if (signal.buy.adv.asset === SupportedCrypto.BTC) {
    if (signal.swap.asset === SupportedCrypto.ETH) {
      swapPrice = binancePrices.find((item) => item.symbol === 'ETHBTC').price;
      swapMarket = 'ETHBTC';
      amountSwap = amountInitial / swapPrice;
    }

    if (signal.swap.asset === SupportedCrypto.USDT) {
      swapPrice = binancePrices.find((item) => item.symbol === 'BTCUSDT').price;
      swapMarket = 'BTCUSDT';
      amountSwap = amountInitial * swapPrice;
    }
  }

  if (signal.buy.adv.asset === SupportedCrypto.ETH) {
    if (signal.swap.asset === SupportedCrypto.BTC) {
      swapPrice = binancePrices.find((item) => item.symbol === 'ETHBTC').price;
      swapMarket = 'ETHBTC';
      amountSwap = amountInitial * swapPrice;
    }

    if (signal.swap.asset === SupportedCrypto.USDT) {
      swapPrice = binancePrices.find((item) => item.symbol === 'ETHUSDT').price;
      swapMarket = 'ETHUSDT';
      amountSwap = amountInitial * swapPrice;
    }
  }

  if (signal.buy.adv.asset === SupportedCrypto.USDT) {
    if (signal.swap.asset === SupportedCrypto.BTC) {
      swapPrice = binancePrices.find((item) => item.symbol === 'BTCUSDT').price;
      swapMarket = 'BTCUSDT';
      amountSwap = amountInitial / swapPrice;
    }

    if (signal.swap.asset === SupportedCrypto.ETH) {
      swapPrice = binancePrices.find((item) => item.symbol === 'ETHUSDT').price;
      swapMarket = 'ETHUSDT';
      amountSwap = amountInitial / swapPrice;
    }
  }

  if (signal.swap.asset === SupportedCrypto.BTC) {
    sellPrice = garantexPrices.find((item) => {
      return item.market === 'btcrub';
    });
  }

  if (signal.swap.asset === SupportedCrypto.ETH) {
    sellPrice = garantexPrices.find((item) => {
      return item.market === 'ethrub';
    });
  }

  if (signal.swap.asset === SupportedCrypto.USDT) {
    sellPrice = garantexPrices.find((item) => {
      return item.market === 'usdtrub';
    });
  }

  amountSwap =
    amountSwap - amountSwap * 0.00075 - EXCHANGE_COMISSION[signal.swap.asset];

  const amountSell =
    sellPrice.price * amountSwap - sellPrice.price * amountSwap * 0.002;

  const spreadRub = amountSell - Number(SETTINGS_AMOUNT);
  const spread = (spreadRub / Number(SETTINGS_AMOUNT)) * 100;

  return {
    ...signal,
    buy,
    spread,
    swap: {
      asset: signal.swap.asset,
      price: swapPrice,
      market: swapMarket
    },
    sell: {
      market: sellPrice.market,
      price: sellPrice.price
    }
  };
};
