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

export const getData = async (category, userId, assetId, time) => {
  try {
    const result = await getPackets(category, userId, assetId, time);
    if (result.error) {
      console.error('getData error', result.error);
    }
    return result;
  } catch (error) {
    console.error('getData error', error);
    return null;
  }
};

const getPackets = (category, userId, assetId, time) => {
  return new Promise(async (resolve, reject) => {
    const packets = await api.get('stream', { category, userId, assetId, time });
    if (packets) {
      resolve(packets);
    } else {
      reject('No packets purchased');
    }
  });
};

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
