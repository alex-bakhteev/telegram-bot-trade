import axios from 'axios';

import { SupportedPaymentType } from '../enum/payment-type';
import { SupportedCrypto } from '../enum/crypto';

export const getP2PList = async ({ type }) => {
  const { SETTINGS_AMOUNT } = process.env;

  const list = await Promise.all(
    Object.values(SupportedCrypto).map(async (crypto) => {
      try {
        const { data } = await axios.post(
          'https://p2p.binance.com/bapi/c2c/v2/friendly/c2c/adv/search',
          {
            asset: crypto,
            countries: [],
            fiat: 'RUB',
            page: 1,
            payTypes: [
              SupportedPaymentType.TINKOFF,
              SupportedPaymentType.ROSBABK
            ],
            proMerchantAds: false,
            publisherType: null,
            rows: 20,
            tradeType: type,
            transAmount: SETTINGS_AMOUNT
          }
        );

        return data.data;
      } catch (e) {
        console.log(e);
      }
    })
  );

  return list.flat();
};

export const filterP2PList = (list) => {
  const {
    SETTINGS_ADVERTISER_MIN_ORDERS,
    SETTINGS_ADVERTISER_MIN_ORDERS_RATE
  } = process.env;

  const performedList = list.map((item) => {
    const types = item.adv.tradeMethods
      .filter(
        (item) =>
          item.identifier === SupportedPaymentType.TINKOFF ||
          item.identifier === SupportedPaymentType.ROSBABK
      )
      .map(({ tradeMethodName }) => ({ identifier: tradeMethodName }));

    return {
      adv: {
        price: Number(item.adv.price),
        minAmount: Number(item.adv.minSingleTransAmount),
        maxAmount: Number(item.adv.maxSingleTransAmount),
        asset: item.adv.asset,
        types
      },
      advertiser: {
        orders: item.advertiser.monthOrderCount,
        ordersRate: item.advertiser.monthFinishRate,
        id: item.advertiser.userNo
      }
    };
  });

  const filteredList = performedList.filter((item) => {
    const minOrders =
      item.advertiser.orders > Number(SETTINGS_ADVERTISER_MIN_ORDERS);
    const minOrdersRate =
      item.advertiser.ordersRate * 100 >
      Number(SETTINGS_ADVERTISER_MIN_ORDERS_RATE);

    return minOrders && minOrdersRate;
  });

  return filteredList;
};
