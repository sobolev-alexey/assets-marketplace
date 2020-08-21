const crypto = require('crypto');
const axios = require('axios');
const { composeAPI, createPrepareTransfers, generateAddress } = require('@iota/core');
const { asTransactionObject } = require('@iota/transaction-converter');
const Mam = require('@iota/mam');
const { asciiToTrytes, trytesToAscii } = require('@iota/converter');
const {
  getSettings,
  updateWalletAddressKeyIndex,
  updateUserWallet,
  getIotaWallet,
  getUserWallet,
  getChannelDetailsForAsset,
} = require('./firebase');

const checkRecaptcha = async (captcha, emailSettings) => {
  const response = await axios({
    method: 'post',
    url: `https://www.google.com/recaptcha/api/siteverify?secret=${emailSettings.googleSecretKey}&response=${captcha}`,
  });
  return response ? response.data : null;
};

const generateSeed = (length = 81) => {
  const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ9';
  let seed = '';
  while (seed.length < length) {
    const byte = crypto.randomBytes(1)
    if (byte[0] < 243) {
      seed += charset.charAt(byte[0] % 27);
    }
  }
  return seed;
};

const generateUUID = () => {
  let d = new Date().getTime();
  const uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = (d + Math.random() * 16) % 16 | 0;
    d = Math.floor(d / 16);
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
  return uuid;
};

const generateNewAddress = (seed, checksum = false) => {
  return generateAddress(seed, 0, 2, checksum);
};

const getBalance = async address => {
  try {
    if (!address) {
      return 0;
    }
    const { provider } = await getSettings();
    const { getBalances } = composeAPI({ provider });
    const { balances } = await getBalances([address]);
    return balances && balances.length > 0 ? balances[0] : 0;
  } catch (error) {
    console.error('getBalance error', error);
    return 0;
  }
};

const sanitiseObject = asset => {
  if (!asset.assetName) return 'Please enter asset name';
  if (!asset.price || Number(asset.price) <= 0) return 'Please set a valid non-zero price for the asset';
  if (!asset.type) return 'Specify type of asset. eg. Weather station or Wind Vein';
  if (!asset.location || !asset.location.city || !asset.location.country)
    return 'Enter city and country';
  if (asset.category === 'requests') {
    if (!asset.start) return 'Please enter a valid date/time when the offer starts';
    if (!asset.end) return 'Please enter a valid date/time when the offer ends';
  }
  
  return false;
};

const findTx = async (hashes, provider) => {
  return new Promise((resolve, reject) => {
    axios({
      method: 'POST',
      url: provider,
      headers: {
        'Content-Type': 'application/json',
        'X-IOTA-API-Version': 1,
      },
      data: {
        command: 'getTrytes',
        hashes
      },
    })
      .then(response => {
        const txBundle = response.data.trytes.map(asTransactionObject);
        resolve(txBundle);
      })
      .catch(error => {
        console.error(`findTx failed. Couldn't find your transaction`);
        throw Error(`Couldn't find your transaction!`);
        reject();
      });
  });
};

const transferFunds = async (receiveAddress, address, keyIndex, seed, value, updateFn, userId = null) => {
  try {
    const { provider } = await getSettings();
    const { sendTrytes, getInclusionStates } = composeAPI({ provider });
    const prepareTransfers = createPrepareTransfers();
    const balance = await getBalance(address);

    const security = 2;

    // Depth or how far to go for tip selection entry point
    const depth = 3;

    // Difficulty of Proof-of-Work required to attach transaction to tangle.
    // Minimum value on mainnet & spamnet is `14`, `9` on devnet and other testnets.
    const minWeightMagnitude = 9;

    if (balance === 0) {
      console.error('transferFunds. Insufficient balance', address, balance, userId);
      return null;
    }

    const promise = new Promise((resolve, reject) => {
      const transfers = [{ address: receiveAddress, value }];
      const remainderAddress = generateAddress(seed, Number(keyIndex) + 1);
      const options = {
        inputs: [{
          address,
          keyIndex,
          security,
          balance
        }],
        security,
        remainderAddress
      };

      prepareTransfers(seed, transfers, options)
        .then(async trytes => {
          sendTrytes(trytes, depth, minWeightMagnitude)
            .then(async transactions => {
              await updateFn(remainderAddress, Number(keyIndex) + 1, userId);
              const hashes = transactions.map(transaction => transaction.hash);

              let retries = 0;
              while (retries++ < 20) {
                const statuses = await getInclusionStates(hashes);
                if (statuses.filter(status => status).length === 4) break;
                await new Promise(resolved => setTimeout(resolved, 10000));
              }

              resolve(transactions)
            })
            .catch(error => {
              console.error('transferFunds sendTrytes error', error);
              reject(error);
            })
        })
        .catch(error => {
          console.error('transferFunds prepareTransfers error', error);
          reject(error);
        });
    });
    return promise;
  } catch (error) {
    console.error('transferFunds catch', error);
    return error
  }
}

const repairWallet = async (seed, keyIndex) => {
  try {
    // Iterating through keyIndex ordered by likelyhood
    for (const value of [-2, -1, 1, 2, 3, 4, -3, -4, -5, -6, -7, 5, 6, 7]) {
      const newIndex = Number(keyIndex) + Number(value)
      if (newIndex >= 0) {
        const newAddress = await generateAddress(seed, newIndex)
        const newBalance = await getBalance(newAddress);
        if (newBalance > 0) {
          console.log(`Repair wallet executed. Old keyIndex: ${keyIndex}, new keyIndex: ${newIndex}. New wallet balance: ${newBalance}. New address: ${newAddress}`)
          return { address: newAddress, keyIndex: newIndex };
        }
      }
    }
  } catch (error) {
    console.log("Repair wallet Error", error)
    return error;
  }
}

const faucet = async receiveAddress => {
  let { keyIndex, seed, defaultBalance } = await getIotaWallet();
  let address = await generateAddress(seed, keyIndex);
  const iotaWalletBalance = await getBalance(address);

  if (iotaWalletBalance === 0) {
    const newIotaWallet = await repairWallet(seed, keyIndex);
    if (newIotaWallet && newIotaWallet.address && newIotaWallet.keyIndex) {
      address = newIotaWallet.address;
      keyIndex = newIotaWallet.keyIndex;
    }
  }

  return await transferFunds(
    receiveAddress,
    address,
    keyIndex,
    seed,
    defaultBalance,
    updateWalletAddressKeyIndex,
  );
};

const initWallet = async (userId = null) => {
  const receiveSeed = generateSeed();
  const receiveKeyIndex = 0;
  const receiveAddress = generateNewAddress(receiveSeed, true);
  
  let { keyIndex, seed, defaultBalance } = await getIotaWallet();
  let address = await generateAddress(seed, keyIndex);
  const iotaWalletBalance = await getBalance(address);

  if (iotaWalletBalance === 0) {
    const newIotaWallet = await repairWallet(seed, keyIndex);
    if (newIotaWallet && newIotaWallet.address && newIotaWallet.keyIndex) {
      address = newIotaWallet.address;
      keyIndex = newIotaWallet.keyIndex;
    }
  }
  
  const transactions = await transferFunds(
    receiveAddress,
    address,
    keyIndex,
    seed,
    defaultBalance,
    updateWalletAddressKeyIndex,
    userId
  );
  return {
    transactions,
    wallet: {
      address: receiveAddress,
      seed: receiveSeed,
      keyIndex: receiveKeyIndex,
      balance: defaultBalance,
    }
  };
};

const updateUserWalletDetails = async (address, keyIndex, userId) => {
  const balance = await getBalance(address);
  await updateUserWallet({ address, balance, keyIndex, userId });
}

const purchaseData = async (userId, receiveAddress, value) => {
  let { keyIndex, seed } = await getUserWallet(userId);
  let address = await generateAddress(seed, keyIndex);
  const walletBalance = await getBalance(address);

  if (walletBalance === 0) {
    const newWallet = await repairWallet(seed, keyIndex);
    if (newWallet && newWallet.address && newWallet.keyIndex) {
      address = newWallet.address;
      keyIndex = newWallet.keyIndex;
    }
  }

  const transactions = await transferFunds(
    receiveAddress,
    address,
    keyIndex || 0,
    seed,
    value,
    updateUserWalletDetails,
    userId,
  );
  return transactions;
};

const initializeChannel = async (packet, secretKey) => {
  const { provider } = await getSettings();
  const mode = 'restricted';

  // Initialise MAM State
  let mamState = Mam.init(provider);

  // Set channel mode
  mamState = Mam.changeMode(mamState, mode, secretKey);

  // Create MAM Payload - STRING OF TRYTES
  const trytes = asciiToTrytes(JSON.stringify(packet));
  const message = Mam.create(mamState, trytes);

  // Attach the payload
  await Mam.attach(message.payload, message.address, 3, 9);

  return {
    secretKey,
    root: message.root,
    seed: message.state.seed,
    next: message.state.channel.next_root,
    start: message.state.channel.start,
  };
};

const appendToChannel = async (assetId, channelPayload) => {
  try {
    const { provider } = await getSettings();
    const { secretKey, next, start, seed, root } = await getChannelDetailsForAsset(assetId);
    Mam.init(provider);

    // Initialise MAM State
    const mamState = {
      seed,
      subscribed: [],
      channel: {
        side_key: secretKey,
        mode: 'restricted',
        next_root: next,
        security: 2,
        start: start,
        count: 1,
        next_count: 1,
        index: 0,
      }
    };

    // Create MAM Payload - STRING OF TRYTES
    const trytes = asciiToTrytes(JSON.stringify(channelPayload));
    const message = Mam.create(mamState, trytes);

    // Attach the payload
    const transactions = await Mam.attach(message.payload, message.address, 3, 9);
    const firstTransaction = transactions.find(transaction => transaction.currentIndex === 0);

    return {
      secretKey,
      root,
      seed: message.state.seed,
      next: message.state.channel.next_root,
      start: message.state.channel.start,
      hash: firstTransaction.hash
    };
  } catch (error) {
    console.log('MAM append error', error);
    return null;
  }
}

const fetchChannel = async ({ root, secretKey }) => {
  try {
    const { provider } = await getSettings();
    Mam.init(provider);

    // Output syncronously once fetch is completed
    const response = await Mam.fetch(root, 'restricted', secretKey);
    const result = response.messages.map(message => JSON.parse(trytesToAscii(message)));
    return result;
  } catch (error) {
    console.log('MAM fetch error', error);
    return null;
  }
}

module.exports = {
  generateUUID,
  generateNewAddress,
  generateSeed,
  sanitiseObject,
  findTx,
  initWallet,
  faucet,
  purchaseData,
  checkRecaptcha,
  initializeChannel,
  appendToChannel,
  fetchChannel,
}
