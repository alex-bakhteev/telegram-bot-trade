import axios from 'axios';
import { SupportedCrypto } from '../enum/crypto';

export const getSpotPrices = async () => {
  const { SETTINGS_AMOUNT } = process.env;

  const cryptos = ['btcrub', 'ethrub', 'usdtrub'];
  try {
    const prices = await Promise.all(
      cryptos.map(async (crypto) => {
        const { data } = await axios.get(
          `https://garantex.io/api/v2/depth?market=${crypto}`
        );

        const filteredData = data.bids.filter(
          (item) => item.amount > Number(SETTINGS_AMOUNT)
        );

        return {
          price: Number(filteredData[0].price),
          volume: Number(filteredData[0].volume),
          market: crypto
        };
      })
    );

    return prices;
  } catch (e) {
    console.log(e);
  }
};

export const EXCHANGE_COMISSION = {
  [SupportedCrypto.BTC]: 0.00005,
  [SupportedCrypto.ETH]: 0.0013,
  [SupportedCrypto.USDT]: 0.0013
};
