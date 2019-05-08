import * as functions from 'firebase-functions';
const format = require('date-fns/format');
const cors = require('cors')({ origin: true });
const { validateBundleSignatures } = require('@iota/bundle-validator');

const {
  getKey,
  getAsset,
  getAssets,
  getUserAssets,
  getUser,
  getSettings,
  setUser,
  setAsset,
  setApiKey,
  setWallet,
  deleteAsset,
  updateBalance,
  getEmailSettings,
  getMatchingAssets,
  setDeal,
  assignDeal,
  deactivateAsset,
  updateChannelDetails,
  getChannelDetailsForAsset,
  reactivateOffers,
  cancelRunningDeal,
  getDealsForUser,
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
  appendToChannel,
  fetchChannel,
} = require('./helpers');

// Add new asset
exports.newAsset = functions.https.onRequest((req, res) => {
  cors(req, res, async () => {
    const packet = req.body;
    // Add asset key into the list
    if (!packet || !packet.asset || !packet.apiKey || !packet.category) {
      console.error('newAsset failed. Packet: ', packet);
      return res.status(400).json({ error: 'Ensure all fields are included' });
    }

    try {
      const invalid = sanatiseObject(packet.asset);
      if (invalid) throw Error(invalid);

      const secretKey = generateSeed(81);
      const { uid } = await getKey(<String>packet.apiKey);

      // Modify object to include
      packet.asset.assetId = generateUUID();
      packet.asset.owner = uid;

      const channelDetails = await initializeChannel(packet.asset, secretKey);
      console.log('newAsset channelDetails', packet.category, packet.asset.assetId, channelDetails); 
      await setAsset(packet.category, packet.asset, channelDetails);

      const matchingAssets = await getMatchingAssets(packet.category, packet.asset);
      console.log('newAsset matchingAssets', packet.asset.assetId, matchingAssets);

      return res.json({
        success: true,
        assetId: packet.asset.assetId,
        matchingAssets
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
      await reactivateOffers();

      const params = req.query;
      if (params && params.userId && params.apiKey) {
        const { uid } = await getKey(<String>params.apiKey);
        if (params.userId === uid) {
          const offers = await getUserAssets('offers', params.userId);
          const requests = await getUserAssets('requests', params.userId);
          return res.json({ offers, requests });
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

// // Setup User with an API Key
exports.setupUser = functions.auth.user().onCreate(user => {
  return new Promise(async (resolve, reject) => {
    if (!user.email) {
      reject();
    } else {
      // Try saving
      try {
        const apiKey = generateUUID();

        await setUser(user.uid, { apiKey });
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
    if (!packet || !packet.apiKey || !packet.offerId || !packet.requestId) {
      console.error('makeDeal failed. Packet: ', packet);
      return res.status(400).json({ error: 'Malformed Request' });
    }

    const debug = packet.debug === true;

    try {
debug && console.log(100, packet.apiKey, packet.offerId, packet.requestId);
      // 1. Get offer from ID
      const offeredAsset = await getAsset('offers', packet.offerId, true);
      // 2. Get request from ID
      const requestedAsset = await getAsset('requests', packet.requestId, true);
      
debug && console.log(122, offeredAsset, requestedAsset);      
      if (!offeredAsset || !requestedAsset) {
          return res.status(403).json({ error: 'Asset not found' });
      }

debug && console.log(133, offeredAsset.owner, requestedAsset.owner); 
      // 3. Get offer owner from offer
      const offerOwner = await getUser(offeredAsset.owner, true);

      // 4. Get request offer from request
      const requestOwner = await getUser(requestedAsset.owner, true);

debug && console.log(144, offerOwner, requestOwner); 
      // 5. Get user from API key
      const { uid } = await getKey(<String>packet.apiKey);
      const user = await getUser(uid, true);

debug && console.log(155, user, uid); 
      // 6. check user is one of the owners
      if (user.apiKey !== offerOwner.apiKey && user.apiKey !== requestOwner.apiKey) {
        return res.status(403).json({ error: 'Current user is not the asset owner' });
      }

      // 7. Get wallet from offer owner
      const offerOwnerWallet = offerOwner.wallet;
      // 8. Get wallet from request owner
      const requestOwnerWallet = requestOwner.wallet;
      
debug && console.log(188, offerOwnerWallet, requestOwnerWallet); 
      if (!offerOwnerWallet || !offerOwnerWallet.address || !requestOwnerWallet || !requestOwnerWallet.address) {
        return res.json({ error: `Asset owners' wallet not set` });
      }

      // 9. Get lowest price between offer and request
      const price = offeredAsset.price < requestedAsset.price ? offeredAsset.price : requestedAsset.price;

debug && console.log(1100, price); 
      // 10. Check wallet balance before purchasing
      let newWalletBalance;
      if (requestOwnerWallet && requestOwnerWallet.balance) {
        newWalletBalance = Number(requestOwnerWallet.balance) - Number(price);
        if (newWalletBalance < 0) {
          console.error('makeDeal failed. Not enough funds', packet);
          return res.json({ error: 'Not enough funds or your new wallet is awaiting confirmation. Please try again in 5 min.' });
        }
      } else {
        console.error('makeDeal failed. Wallet not set', packet);
        return res.json({ error: `Asset requesters' wallet not set` });
      }

debug && console.log(1111, newWalletBalance); 
      // 11. Transfer tokens from request owner to offer owner
      const transactions = await purchaseData(requestedAsset.owner, offerOwnerWallet.address, Number(price));
      console.log('makeDeal', requestedAsset.owner, offeredAsset.owner, transactions);

      if (!transactions || transactions.length === 0) {
        return res.json({ error: 'Purchase failed. Insufficient balance or out of sync' });
      }
debug && console.log(1112, transactions.length); 
      const hashes = transactions && transactions.map(transaction => transaction.hash);

      // Find TX on network and parse
      const { provider } = await getSettings();
      const bundle = await findTx(hashes, provider);

debug && console.log(1113, bundle); 
      // Make sure TX is valid
      if (!validateBundleSignatures(bundle)) {
        console.error('makeDeal failed. Transaction is invalid for: ', bundle);
        return res.status(403).json({ error: 'Transaction is Invalid' });
      }

debug && console.log(1120, 'payment completed'); 
      // 12. Update user wallet balance
      await updateBalance(requestedAsset.owner, newWalletBalance);

      // 13. Update recipient (request/offer owner) wallet balance
      await updateBalance(offeredAsset.owner, Number(offerOwnerWallet.balance) + Number(price));

debug && console.log(1140, Number(offerOwnerWallet.balance) + Number(price)); 
      // 14. Create new deal MAM channel
      const secretKey = generateSeed(81);
      const dealId = generateUUID();
      const dealTimestamp = Date.now();
      const dealTime = format(dealTimestamp, 'DD MMMM, YYYY H:mm a ');
      const payload = {
        offer: offeredAsset,
        request: requestedAsset,
        offerId: packet.offerId, 
        requestId: packet.requestId, 
        dealId,
        dealTimestamp,
        dealTime,
        price,
        startDate: requestedAsset.startDate,
        endDate: requestedAsset.endDate,
        startTimestamp: requestedAsset.startTimestamp,
        endTimestamp: requestedAsset.endTimestamp,
      }
debug && console.log(1150, payload); 
      const channelDetails = await initializeChannel(payload, secretKey);
      console.log('deal channelDetails', payload, channelDetails); 

      // 15. Add entry to the "deals" table, including MAM
debug && console.log(1151, dealId, payload); 
      await setDeal(dealId, payload, channelDetails);

      const channelPayload = {
        offerId: packet.offerId, 
        requestId: packet.requestId,
        dealId,
        dealTimestamp, 
        dealTime,
        price,
        startDate: requestedAsset.startDate,
        endDate: requestedAsset.endDate,
        startTimestamp: requestedAsset.startTimestamp,
        endTimestamp: requestedAsset.endTimestamp,
      };
debug && console.log(1160, channelPayload); 
      // 16. Add new event to the offer MAM channel
      const offerAppendResult = await appendToChannel(packet.offerId, channelPayload);
      await updateChannelDetails(packet.offerId, offerAppendResult);

debug && console.log(1170, packet.offerId, offerAppendResult); 
      // 17. Add new event to the request MAM channel
      const requestAppendResult = await appendToChannel(packet.requestId, channelPayload);
      await updateChannelDetails(packet.requestId, requestAppendResult);

debug && console.log(1180, packet.requestId, requestAppendResult); 
      // 18. Set offer inactive
      await deactivateAsset('offers', packet.offerId);

      // 19. Set request inactive
      await deactivateAsset('requests', packet.requestId);

debug && console.log(2000, dealId); 
      // 20. Add deal to sellers deals list 
      await assignDeal(offeredAsset.owner, dealId, dealTimestamp, dealTime);

      // 21. Add deal to purchasers deals list 
      await assignDeal(requestedAsset.owner, dealId, dealTimestamp, dealTime);

debug && console.log(2100, offeredAsset.owner, requestedAsset.owner, dealId); 
      return res.json({ success: true });
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
      await reactivateOffers();

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

      return res.json({
        success: true,
        [asset.category]: [asset],
        [category]: matchingAssets
      });
    } catch (e) {
      console.error('match failed. Error: ', e.message);
      return res.status(403).json({ error: e.message });
    }
  });
});

// Query Asset Transaction History
exports.history = functions.https.onRequest((req, res) => {
  cors(req, res, async () => {
    try {
      const params = req.query;
      if (!params || !params.apiKey || !params.assetId) {
        console.error('history failed. Params: ', params);
        return res.status(400).json({ error: 'Malformed Request' });
      }

      let asset = await getAsset('offers', params.assetId, true);
      if (!asset) {
        asset = await getAsset('requests', params.assetId, true);
        if (!asset) {
          return res.status(403).json({ error: 'Asset not found' });
        }
      }

      const user = await getKey(<String>params.apiKey);
      if (user.uid !== asset.owner) {
        return res.status(403).json({ error: 'Current user is not the asset owner' });
      }

      const channelDetails = await getChannelDetailsForAsset(params.assetId);

      const deals = await fetchChannel(channelDetails);

      return res.json({
        success: true,
        asset,
        deals,
        channelDetails: { 
          root: channelDetails.root,
          secretKey: channelDetails.secretKey
        }
      });
    } catch (e) {
      console.error('history failed. Error: ', e.message);
      return res.status(403).json({ error: e.message });
    }
  });
});

// Get list of active deals
exports.deals = functions.https.onRequest((req, res) => {
  cors(req, res, async () => {
    try {
      const params = req.query;
      if (!params || !params.apiKey) {
        console.error('deals failed. Params: ', params);
        return res.status(400).json({ error: 'Malformed Request' });
      }

      const user = await getKey(<String>params.apiKey);
      const dealEntries = await getDealsForUser(user.uid);

      const promises = await dealEntries.map(async ({ dealId }) => {
        const promise = await new Promise(async (resolve, reject) => {
          try {
            const deal = await getAsset('deals', dealId, true);
            resolve(deal);
          } catch (error) {
            reject({ error });
          }
        });

        return promise;
      });

      const deals = await Promise.all(promises);
      return res.json({ success: true, deals });
    } catch (e) {
      console.error('active deals failed. Error: ', e.message);
      return res.status(403).json({ error: e.message });
    }
  });
});

// Cancel running deal
exports.cancel = functions.https.onRequest((req, res) => {
  cors(req, res, async () => {
    try {
      const packet = req.body;
      if (!packet || !packet.apiKey || !packet.dealId) {
        console.error('cancel failed. Packet: ', packet);
        return res.status(400).json({ error: 'Malformed Request' });
      }

      const deal = await getAsset('deals', packet.dealId, true);
      if (!deal) {
        return res.status(403).json({ error: 'Deal not found' });
      }

      const user = await getKey(<String>packet.apiKey);
      if (user.uid !== deal.offer.owner && user.uid !== deal.request.owner) {
        return res.status(403).json({ error: 'Current user is not the participating in the given deal' });
      }

      // Cancel deal and reactivate offer
      await cancelRunningDeal(deal.dealId, deal.offerId);
      
      const cancellationTimestamp = Date.now();
      const cancellationDate = format(cancellationTimestamp, 'DD MMMM, YYYY H:mm a ');

      // Update deal MAM channel
      const dealPayload = {
        dealId: deal.dealId,
        offerId: deal.offerId, 
        requestId: deal.requestId,
        cancelled: true,
        cancellationDate,
        cancellationTimestamp,
        cancelledBy: user.uid,
        startDate: deal.startDate,
        startTimestamp: deal.startTimestamp
      };
      const dealAppendResult = await appendToChannel(deal.dealId, dealPayload);
      
      await updateChannelDetails(deal.dealId, dealAppendResult);

      // Update asset MAM channel
      const assetPayload = {
        offerId: deal.offerId, 
        requestId: deal.requestId,
        dealId: deal.dealId,
        dealTimestamp: deal.dealTimestamp, 
        dealTime: deal.dealTime,
        startDate: deal.startDate,
        startTimestamp: deal.startTimestamp,
        price: deal.price,
        cancelled: true,
        cancellationDate,
        cancellationTimestamp,
        cancelledBy: user.uid
      };
      const requestAppendResult = await appendToChannel(deal.requestId, assetPayload);
      await updateChannelDetails(deal.requestId, requestAppendResult);

      const offerAppendResult = await appendToChannel(deal.offerId, assetPayload);
      await updateChannelDetails(deal.offerId, offerAppendResult);

      return res.json({ success: true });
    } catch (e) {
      console.error('cancel failed. Error: ', e.message);
      return res.status(403).json({ error: e.message });
    }
  });
});

