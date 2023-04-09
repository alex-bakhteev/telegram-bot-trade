import axios from 'axios';

export const getSpotPrices = async () => {
  const cryptos = ['BTCUSDT', 'ETHUSDT', 'ETHBTC'];

  const cryptosString = cryptos.map((item) => `"${item}"`).join(',');

  try {
    const { data } = await axios.get(
      `https://api.binance.com/api/v3/ticker/price?symbols=[${cryptosString}]`
    );

    const performedData = data.map((item) => ({
      ...item,
      price: Number(item.price)
    }));

    return performedData;
  } catch (e) {
    console.log(e);
  }
};
