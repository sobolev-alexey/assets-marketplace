import * as functions from 'firebase-functions';
const cors = require('cors')({ origin: true });
const { validateBundleSignatures } = require('@iota/bundle-validator');

const {
  getKey,
  getSk,
  getAssignedAssets,
  getData,
  getAsset,
  getAssets,
  getUserAssets,
  getNumberOfAssets,
  getUser,
  getUserWallet,
  getSettings,
  setUser,
  setAsset,
  setPacket,
  assignAsset,
  setApiKey,
  setWallet,
  deleteAsset,
  toggleWhitelistAsset,
  updateBalance,
  getEmailSettings,
  getMatchingAssets,
} = require('./firebase');
const {
  generateUUID,
  generateSeed,
  sanatiseObject,
  findTx,
  faucet,
  initWallet,
  checkRecaptcha,
  purchaseData,
  initializeChannel,
} = require('./helpers');

// Take in data from asset
exports.newData = functions.https.onRequest((req, res) => {
  cors(req, res, async () => {
    const packet = req.body;
    // Add asset key into the list
    if (!packet || !packet.id || !packet.sk || !packet.packet || !packet.category) {
      console.error('newData failed. Packet: ', packet);
      return res.status(400).json({ error: 'Ensure all fields are included' });
    }

    try {
      const asset = await getSk(packet.id);
      if (asset.sk === packet.sk) {
        return res.json({
          success: await setPacket(packet.category, packet.id, packet.packet),
        });
      } else {
        console.error('newData failed. Key is incorrect', asset.sk, packet.sk);
        throw Error('Oh noes, your key is incorrect.');
      }
    } catch (e) {
      console.error('newData failed. Error: ', e.message);
      return res.status(403).json({ error: e.message });
    }
  });
});

// Add new asset
exports.newAsset = functions.https.onRequest((req, res) => {
  cors(req, res, async () => {
    const packet = req.body;
    // Add asset key into the list
    if (!packet || !packet.asset || !packet.apiKey || !packet.category) {
      console.error('newAsset failed. Packet: ', packet);
      return res.status(400).json({ error: 'Ensure all fields are included' });
    }
    // Modify object to include
    packet.asset.assetId = generateUUID();

    try {
      const invalid = sanatiseObject(packet.asset);
      const secretKey = generateSeed(81);
      if (invalid) throw Error(invalid);

      const { uid } = await getKey(<String>packet.apiKey);
      const user = await getUser(uid, true);
      const seed = user.wallet.seed;
      const address = user.wallet.address;

      const channelDetails = await initializeChannel(packet.asset, secretKey);
      console.log('channelDetails', channelDetails); 

      return res.json({
        success: await setAsset(packet.category, packet.asset, secretKey, address, seed, channelDetails),
      });
    } catch (e) {
      console.error('newAsset failed. Error: ', e.message);
      return res.status(403).json({ error: e.message });
    }
  });
});

// Allow asset deletion
exports.delete = functions.https.onRequest((req, res) => {
  cors(req, res, async () => {
    const packet = req.body;
    // Add asset key into the list
    if (!packet || !packet.assetId || !packet.apiKey || !packet.category) {
      console.error('removeAsset failed. Packet: ', packet);
      return res.status(400).json({ error: 'Ensure all fields are included' });
    }

    try {
      const { apiKey, assetId, category } = packet;
      const { uid } = await getKey(<String>apiKey);
      const asset = await getAsset(<String>category, <String>assetId, true);
      if (!asset) {
        throw Error(`Asset doesn't exist`);
      }
      if (asset.owner === uid) {
        return res.json({
          success: await deleteAsset(<String>category, <String>assetId, <String>uid),
        });
      } else {
        console.error(
          "removeAsset failed. You don't have permission to delete this asset",
          asset.owner,
          uid
        );
        throw Error(`You don't have permission to delete this asset`);
      }
    } catch (e) {
      console.error('removeAsset failed. Error: ', e.message);
      return res.status(403).json({
        error: e.message,
      });
    }
  });
});

// Query Assets
exports.assets = functions.https.onRequest((req, res) => {
  cors(req, res, async () => {
    try {
      const params = req.query;
      if (params && params.userId && params.apiKey) {
        const { uid } = await getKey(<String>params.apiKey);
        if (params.userId === uid) {
          const userOffers = await getUserAssets('offers', params.userId);
          const userRequests = await getUserAssets('requests', params.userId);
          
          const processPromise = async asset => {
            return await new Promise(async (resolve, reject) => {
              try {
                const keyObj = await getSk(asset.assetId);
                if (keyObj.sk) {
                  resolve(keyObj.sk);
                }
                reject({ error: 'Error' });
              } catch (error) {
                reject({ error });
              }
            });
          }

          const offerPromises = await userOffers.map(async asset => {
            const promise = await processPromise(asset);
            return { ...asset, sk: promise };
          });

          const requestPromises = await userRequests.map(async asset => {
            const promise = await processPromise(asset);
            return { ...asset, sk: promise };
          });

          return res.json({
            offers: await Promise.all(offerPromises),
            requests: await Promise.all(requestPromises),
          });
        }
        return res.status(403).json({ error: 'Access denied' });
      }
      return res.json({
        offers: await getAssets('offers'),
        requests: await getAssets('requests'),
      });
    } catch (e) {
      console.error('assets failed. Error: ', e.message);
      return res.status(403).json({ error: e.message });
    }
  });
});

// Query Asset
exports.asset = functions.https.onRequest((req, res) => {
  cors(req, res, async () => {
    const params = req.query;
    // Add asset key into the list
    if (!params || !params.assetId || !params.category) {
      console.error('asset failed. Packet: ', params);
      return res.status(400).json({ error: 'Ensure all fields are included' });
    }

    try {
      const asset = await getAsset(params.category, params.assetId);
      if (!asset) {
        throw Error(`Asset doesn't exist`);
      }
      if (asset && !asset.price) {
        const settings = await getSettings();
        asset.price = settings.defaultPrice;
      }
      return res.json(asset);
    } catch (e) {
      console.error('asset failed. Error: ', e.message);
      return res.status(403).json({ error: e.message });
    }
  });
});

// Query Stream
exports.stream = functions.https.onRequest((req, res) => {
  cors(req, res, async () => {
    const params = req.query;
    if (!params || !params.assetId || !params.userId || !params.category) {
      console.error('stream failed. Params: ', params);
      return res.status(400).json({ error: 'Ensure all fields are included' });
    }

    try {
      // Make sure assignment exists
      const purchase = await getAssignedAssets(<String>params.category, <String>params.userId, <String>params.assetId);
      if (!purchase) {
        return res.json({ success: false });
      }
      // Return data
      return res.json(await getData(<String>params.category, <String>params.assetId, params.time));
    } catch (e) {
      console.error('stream failed. Error: ', e.message);
      return res.status(403).json({ error: e.message });
    }
  });
});

// // Setup User with an API Key
exports.setupUser = functions.auth.user().onCreate(user => {
  return new Promise(async (resolve, reject) => {
    if (!user.email) {
      reject();
    } else {
      // Try saving
      try {
        const apiKey = generateUUID();
        const numberOfAssets = 100;

        await setUser(user.uid, { apiKey, numberOfAssets });
        await setApiKey(apiKey, user.uid, user.email);

        console.log('setupUser resolved for UID', user.uid);
        resolve();
      } catch (e) {
        console.error('setupUser rejected with ', e.message);
        reject(e.message);
      }
    }
  });
});

// Toggle whitelist entry
exports.toggleWhitelist = functions.https.onRequest((req, res) => {
  cors(req, res, async () => {
    // Check Fields
    const packet = req.body;
    if (!packet || !packet.assetId || !packet.isInactive || !packet.apiKey || !packet.uid) {
      console.error('toggleWhitelist failed. Packet: ', packet);
      return res.status(400).json({ error: 'Ensure all fields are included' });
    }

    try {
      const data = await getKey(<String>packet.apiKey);
      if (data.email && data.email.indexOf('iota.org') !== -1 && packet.uid === data.uid) {
        // Toggle whitelist
        console.error('toggleWhitelist success', packet, data);
        await toggleWhitelistAsset(packet.assetId, packet.isInactive);
        return res.json({ success: true });
      }
      return res.status(403).json({ error: 'Access denied' });
    } catch (e) {
      console.error('toggleWhitelist failed. Error: ', e.message);
      return res.status(403).json({ error: e.message });
    }
  });
});

exports.user = functions.https.onRequest((req, res) => {
  cors(req, res, async () => {
    // Check Fields
    const params = req.query;
    if (!params || !params.userId) {
      console.error('Get user failed. Params: ', params);
      return res.status(400).json({ error: 'Ensure all fields are included' });
    }

    try {
      // Retrieve user
      const user = await getUser(params.userId);
      if (!user) {
        return res.json(null);
      }
      if (!user.numberOfAssets) {
        user.numberOfAssets = await getNumberOfAssets();
      }
      return res.json({ ...user });
    } catch (e) {
      console.error('user failed. Error: ', e);
      return res.status(403).json({ error: e });
    }
  });
});

exports.settings = functions.https.onRequest((req, res) => {
  cors(req, res, async () => {
    try {
      // Retrieve settings
      return res.json(await getSettings());
    } catch (e) {
      console.error('settings failed. Error: ', e);
      return res.status(403).json({ error: e });
    }
  });
});

exports.wallet = functions.https.onRequest((req, res) => {
  cors(req, res, async () => {
    // Check Fields
    const packet = req.body;
    if (!packet || !packet.userId) {
      console.error('wallet failed. Packet: ', packet);
      return res.status(400).json({ error: 'Malformed Request' });
    }

    try {
      const result = await initWallet(packet.userId);
      await setWallet(packet.userId, result.wallet);
      return res.json({ success: result.transactions.length > 0 });
    } catch (e) {
      console.error('wallet failed. Error: ', e.message);
      return res.status(403).json({ error: e.message });
    }
  });
});

exports.faucet = functions.https.onRequest((req, res) => {
  cors(req, res, async () => {
    // Check Fields
    const packet = req.body;
    if (!packet || !packet.address || !packet.captcha) {
      console.error('faucet failed. Packet: ', packet);
      return res.status(400).json({ error: 'Malformed Request' });
    }

    try {
      const emailSettings = await getEmailSettings();
      // Check Recaptcha
      const recaptcha = await checkRecaptcha(packet.captcha, emailSettings);
      if (!recaptcha || !recaptcha.success) {
        console.error('faucet failed. Recaptcha is incorrect. ', recaptcha['error-codes']);
        return res.status(403).json({ error: recaptcha['error-codes'] });
      }

      const transactions = await faucet(packet.address);
      return res.json({ transactions });
    } catch (e) {
      console.error('faucet failed. Error: ', e.message);
      return res.status(403).json({ error: e.message });
    }
  });
});

exports.makeDeal = functions.https.onRequest((req, res) => {
  cors(req, res, async () => {
    // Check Fields
    const packet = req.body;
    if (!packet || !packet.userId || !packet.assetId) {
      console.error('makeDeal failed. Packet: ', packet);
      return res.status(400).json({ error: 'Malformed Request' });
    }

    try {
      const asset = await getAsset('offers', packet.assetId);
      const wallet = await getUserWallet(packet.userId);
      const { iotaApiVersion, provider, defaultPrice } = await getSettings();
      let price = defaultPrice;
      if (asset) {
        if (asset.price) {
          price = Number(asset.price);
        } else if (asset.value) {
          price = Number(asset.value);
        }
      } else {
        return res.json({ error: `Asset doesn't exist` });
      }

      let newWalletBalance;
      if (wallet && wallet.balance) {
        newWalletBalance = Number(wallet.balance) - Number(price);
        if (newWalletBalance < 0) {
          console.error('makeDeal failed. Not enough funds', packet);
          return res.json({ error: 'Not enough funds or your new wallet is awaiting confirmation. Please try again in 5 min.' });
        }
      } else {
        console.error('makeDeal failed. Wallet not set', packet);
        return res.json({ error: 'Wallet not set' });
      }

      const transactions = await purchaseData(packet.userId, asset.address, price);
      console.log('makeDeal', packet.userId, packet.assetId, transactions);

      if (transactions) {
        const hashes = transactions && transactions.map(transaction => transaction.hash);

        // Find TX on network and parse
        const bundle = await findTx(hashes, provider, iotaApiVersion);

        // Make sure TX is valid
        if (!validateBundleSignatures(bundle)) {
          console.error('makeDeal failed. Transaction is invalid for: ', bundle);
          res.status(403).json({ error: 'Transaction is Invalid' });
        }

        await assignAsset('deals', packet.userId, packet.assetId);
        await updateBalance(packet.userId, newWalletBalance);

        // ToDo: update sellers wallet, add deal to sellers list 
        return res.json({ success: true });
      }
      return res.json({ error: 'Purchase failed. Insufficient balance of out of sync' });
    } catch (e) {
      console.error('purchaseData failed. Error: ', e, packet);
      return res.status(403).json({ error: e.message });
    }
  });
});

// Query Asset Matches
exports.match = functions.https.onRequest((req, res) => {
  cors(req, res, async () => {
    try {
      const params = req.query;
      if (!params || !params.assetId) {
        console.error('Get match failed. Params: ', params);
        return res.status(400).json({ error: 'Ensure all fields are included' });
      }

      let asset = await getAsset('offers', params.assetId, true);
      if (!asset) {
        asset = await getAsset('requests', params.assetId, true);
        if (!asset) {
          return res.status(403).json({ error: 'Asset not found' });
        }
      }
      const category = asset.category !== 'offers' ? 'offers' : 'requests';
      const matchingAssets = await getMatchingAssets(category, asset);

      return res.json({ success: true, [category]: matchingAssets });
    } catch (e) {
      console.error('match failed. Error: ', e.message);
      return res.status(403).json({ error: e.message });
    }
  });
});