import api from './api';

export const makeDeal = (userId, assetId) => {
  return new Promise(async (resolve, reject) => {
    // Try purchase
    try {
      const makeDealResponse = await api.post('makeDeal', { userId, assetId });
      if (makeDealResponse && makeDealResponse.success) {
        resolve();
      }
      reject(makeDealResponse && makeDealResponse.error);
    } catch (error) {
      console.error('getBundleHashes error', error);
      reject(error);
    }
  });
}

export const getBalance = async (address, provider) => {
  try {
    const packet = {
      command: 'getBalances',
      addresses: [address.substring(0, 81).toUpperCase()],
      threshold: 100,
    };

    const result = await api.requestBalance(provider, packet);
    if (result && result.balances && result.balances.length > 0) {
      return result.balances[0];
    }
    return 0;
  } catch (error) {
    console.error('getBalance error', error);
    return 0;
  }
};
