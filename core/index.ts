import { clearMainSession } from '../utils/redis';

import { getP2PList, filterP2PList } from './binance/p2p';
import { handleP2P_Spot_P2P } from './bunches/p2p-spot-p2p';
import { handleP2P_P2P } from './bunches/p2p-p2p';
import { handleP2P_Garantex } from './bunches/p2p-garantex';
import { handleP2P_Spot_Garantex } from './bunches/p2p-spot-garantex';

export const bootstrap = async () => {
  await clearMainSession();

  setInterval(async () => {
    console.log('[P2P] Start fetch');

    const [p2pBuyList, p2pSellList] = await Promise.all([
      getP2PList({ type: 'BUY' }),
      getP2PList({ type: 'SELL' })
    ]);

    const filteredP2PBuyList = filterP2PList(p2pBuyList);

    const filteredP2PSellList = filterP2PList(p2pSellList);

    await handleP2P_P2P(filteredP2PBuyList, filteredP2PSellList);

    await handleP2P_Spot_P2P(filteredP2PBuyList, filteredP2PSellList);

    await handleP2P_Garantex(filteredP2PBuyList);

    await handleP2P_Spot_Garantex(filteredP2PBuyList);
  }, 7000);
};
