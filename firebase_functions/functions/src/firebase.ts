import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

admin.initializeApp(functions.config().firebase);

const firestore = admin.firestore();

exports.getKey = async (key: string) => {
  // Get API key
  const doc = await admin
    .firestore()
    .collection('keys')
    .doc(key)
    .get();
  if (doc.exists) return doc.data();
  console.error('getKey failed. API key is incorrect. ', key, doc);
  throw Error('Your API key is incorrect.');
};

exports.getSk = async (assetId: string) => {
  // Get API key
  const doc = await admin
    .firestore()
    .collection('mam')
    .doc(assetId)
    .get();
  if (doc.exists) return doc.data();
  console.error('getSk failed. asset does not exist', assetId, doc);
  throw Error(`The asset doesn't exist.`);
};

exports.getMAMChannelDetails = async (assetId: string) => {
  // Get MAM channel details
  const doc = await admin
    .firestore()
    .collection('mam')
    .doc(assetId)
    .get();

  if (doc.exists) return doc.data();
  console.log('getMAMChannelDetails failed.', assetId, doc);
  return null;
};

exports.getAssignedAssets = async (collection: string, userId: string, assetId: string) => {
  // Get User's assets
  const doc = await admin
    .firestore()
    .collection('users')
    .doc(userId)
    .collection(collection)
    .doc(assetId)
    .get();
  // Check user's profile for assigned assets
  if (doc.exists) return doc.data();
  console.log('Assets not assigned', userId, assetId);
  return false;
};

exports.getData = async (collection: string, assetId: string, timestamp?: number) => {
  const time = timestamp ? Number(timestamp) : Date.now();
  // Get data
  const querySnapshot = await admin
    .firestore()
    .collection(collection)
    .doc(assetId)
    .collection('data')
    .where('time', '<', time)
    .orderBy('time', 'desc')
    .limit(50)
    .get();

  if (querySnapshot.size === 0) return [];

  // Return data
  return querySnapshot.docs.map(doc => {
    if (doc.exists) {
      return doc.data();
    } else {
      console.log('getData failed.', assetId, doc);
      return null;
    }
  });
};

exports.getAsset = async (collection: string, assetId: string, internal: boolean = false) => {
  // Get User's purchase
  const doc = await admin
    .firestore()
    .collection(collection)
    .doc(assetId)
    .get();
  // Check user's profile for purchase
  if (doc.exists) {
    const result = doc.data();
    if (!internal) {
      delete result.owner;
    }
    return result;
  }
  console.log('getAsset failed.', assetId, doc);
  return null;
};

exports.getAssets = async (collection: string) => {
  // Get data
  const querySnapshot = await admin
    .firestore()
    .collection(collection)
    .get();

  const promises = [];
  const results = [];

  querySnapshot.docs.forEach(doc => {
    const promise = new Promise((resolve, reject) => {
      try {
        if (doc.exists) {
          const result = doc.data();
          result.createTime = doc.createTime;
          delete result.sk;
          delete result.owner;

          // Get data
          admin
            .firestore()
            .collection(collection)
            .doc(result.assetId)
            .collection('data')
            .limit(2)
            .get()
            .then(assetData => {
              if (assetData.size !== 0) {
                result.hasData = true;
              };
              results.push(result);
              resolve(result);
            })
            .catch(error => {
              reject(error);
            });
        } else {
          console.log('getAssets failed.', doc);
          return null;
        }
      } catch (error) {
        reject(error);
      }
    });
    promises.push(promise);
  });

  // Return data
  return await Promise.all(promises)
    .then(() => results)
    .catch(error => {
      console.log('getAssets error', error);
    });
};

exports.getUserAssets = async (collection: string, user: string) => {
  // Get data
  const querySnapshot = await admin
    .firestore()
    .collection(collection)
    .where('owner', '==', user)
    .get();
  // Check there is data
  if (querySnapshot.size === 0) return [];
  // Return data
  return querySnapshot.docs.map(doc => {
    if (doc.exists) {
      const result = doc.data();
      delete result.sk;
      delete result.owner;
      return result;
    } else {
      console.log('getUserAssets failed.', user, doc);
      return null;
    }
  });
};

exports.setPacket = async (collection: string, asset: string, packet: any) => {
  // Save users API key and Seed
  await admin
    .firestore()
    .collection(collection)
    .doc(asset)
    .collection('data')
    .doc()
    .set(packet);

  return true;
};

exports.setUser = async (userId: string, obj: any) => {
  // Save users API key and Seed
  await admin
    .firestore()
    .collection('users')
    .doc(userId)
    .set(obj);

  return true;
};

exports.setAsset = async (collection: string, asset: any, channelDetails: any) => {
  // Save users API key and Seed
  await admin
    .firestore()
    .collection('mam')
    .doc(asset.assetId)
    .set({ ...channelDetails });

  // Add public asset record
  await admin
    .firestore()
    .collection(collection)
    .doc(asset.assetId)
    .set({ ...asset });

  // Add asset to owners' assignments
  await admin
    .firestore()
    .collection('users')
    .doc(asset.owner)
    .collection(collection)
    .doc(asset.assetId)
    .set({ time: Date.now() });

  return true;
};

exports.setDeal = async (dealId: string, payload: any, channelDetails: any) => {
  await admin
    .firestore()
    .collection('mam')
    .doc(dealId)
    .set({ ...channelDetails });

  // Add public asset record
  await admin
    .firestore()
    .collection('deals')
    .doc(dealId)
    .set({ ...payload });

  return true;
};

exports.assignDeal = async (userId: string, dealId: string, dealTimestamp: string, dealTime: string) => {
  // Add deal to owners' deals list
  await admin
    .firestore()
    .collection('users')
    .doc(userId)
    .collection('deals')
    .doc(dealId)
    .set({ dealId, dealTimestamp, dealTime });

  return true;
};

exports.setApiKey = async (apiKey: string, uid: string, email: string) => {
  // Set API key in separate table
  await admin
    .firestore()
    .collection('keys')
    .doc(apiKey)
    .set({
      email,
      uid,
    });
  return true;
};

exports.deactivateAsset = async (collection: string, assetId: string) => {
  // Assign new asset
  await admin
    .firestore()
    .collection(collection)
    .doc(assetId)
    .set({ active: false }, { merge: true });
  return true;
};

exports.deleteAsset = async (collection: string, assetId: string, userId: string) => {
  // Remove Asset if not in the list of deals
  
  let canDeleteAsset = true;
  // Get deal
    const dealsSnapshot = await admin
    .firestore()
    .collection('deals')
    .get();

    dealsSnapshot.docs.forEach(async deal => {
      if (deal.exists) {
        const data = deal.data();
        if (data.assetId === assetId) {
          canDeleteAsset = false;
        }
      }
    });

  if (!canDeleteAsset) return false;

  await admin
    .firestore()
    .collection('mam')
    .doc(assetId)
    .delete();

  await admin
    .firestore()
    .collection(collection)
    .doc(assetId)
    .delete();

  await admin
    .firestore()
    .collection('users')
    .doc(userId)
    .collection(collection)
    .doc(assetId)
    .delete();

  return true;
};

exports.toggleWhitelistAsset = async (collection: string, assetId: string, inactive: string) => {
  // Whitelist asset
  await admin
    .firestore()
    .collection(collection)
    .doc(assetId)
    .set({ inactive: inactive === 'true' }, { merge: true });
  return true;
};

exports.getUser = async (userId: string, internal: boolean = false) => {
  // Get user
  const doc = await admin
    .firestore()
    .collection('users')
    .doc(userId)
    .get();

  // Check and return user
  if (doc.exists) {
    const result = doc.data();
    delete result.seed;

    if (result.wallet && !internal) {
      delete result.wallet.seed;
      delete result.wallet.keyIndex;
    }
    return result;
  }

  console.log('User not in DB:', userId);
  return null;
};

exports.getNumberOfAssets = async () => {
  const doc = await admin
    .firestore()
    .collection('settings')
    .doc('settings')
    .get();
  if (doc.exists) {
    const data = doc.data();
    if (data.numberOfAssets) {
      return data.numberOfAssets;
    }
  }
  console.log('getNumberOfAssets failed. Setting does not exist', doc);
  throw Error(`The getNumberOfAssets setting doesn't exist.`);
};

exports.getSettings = async () => {
  // Get data
  const doc = await admin
    .firestore()
    .collection('settings')
    .doc('settings')
    .get();
  if (doc.exists) {
    const {
      documentation,
      iotaApiVersion,
      mapboxApiAccessToken,
      mapboxStyles,
      provider,
      tangleExplorer,
    } = doc.data();
    return {
      documentation,
      iotaApiVersion,
      mapboxApiAccessToken,
      mapboxStyles,
      provider,
      tangleExplorer,
    };
  }
  console.error('getSettings failed. Setting does not exist', doc);
  throw Error(`The getSettings setting doesn't exist.`);
};

exports.getUserWallet = async (uid: string) => {
  // Get User's wallet
  const doc = await admin
    .firestore()
    .collection('users')
    .doc(uid)
    .get();

  if (doc.exists) {
    const data = doc.data();
    return data.wallet || null;
  }
  console.log('getUserWallet failed. ', uid);
  throw Error(`The wallet doesn't exist.`);
};

exports.setWallet = async (uid: string, wallet: any) => {
  // Create wallet
  await admin
    .firestore()
    .collection('users')
    .doc(uid)
    .set({ wallet: { ...wallet } }, { merge: true });
  return true;
};

exports.updateBalance = async (uid: string, balance: any) => {
  await admin
    .firestore()
    .collection('users')
    .doc(uid)
    .set({ wallet: { balance } }, { merge: true });
  return true;
};

exports.updateUserWalletAddressKeyIndex = async (address: string, keyIndex: number, uid: string) => {
  await admin
    .firestore()
    .collection('users')
    .doc(uid)
    .set({ wallet: { address, keyIndex } }, { merge: true });
  return true;
};

exports.getIotaWallet = async () => {
  const doc = await admin
    .firestore()
    .collection('settings')
    .doc('settings')
    .get();
  if (doc.exists) {
    const data = doc.data();
    if (data.wallet) {
      return data.wallet;
    }
    console.error('getIotaWallet failed. Setting does not exist', data.wallet);
  }
  throw Error(`The getIotaWallet setting doesn't exist.`);
};

exports.updateWalletAddressKeyIndex = async (address: string, keyIndex: number, userId: string) => {
  console.log('updateWalletAddressKeyIndex', address, keyIndex, userId);
  await admin
    .firestore()
    .collection('settings')
    .doc('settings')
    .set({ wallet: { address, keyIndex } }, { merge: true });
  return true;
};

exports.getEmailSettings = async () => {
  const doc = await admin
    .firestore()
    .collection('settings')
    .doc('settings')
    .get();
  if (doc.exists) {
    const data = doc.data();
    return data.email || null;
  }
  console.error('getEmailSettings failed. Setting does not exist', doc);
  throw Error(`The getEmailSettings setting doesn't exist.`);
};

exports.getMatchingAssets = async (collection: string, asset: any) => {
  // Get matching assets
  // https://firebase.google.com/docs/firestore/query-data/queries
  const querySnapshot = await admin.firestore()
    .collection(collection)
    .where('active', '==', true)
    .where('type', '==', asset.type)
    .where('location.city', '==', asset.location.city)
    .orderBy('assetName', 'asc')
    .get();

  if (querySnapshot.size === 0) return [];

  // Return data
  return querySnapshot.docs.map(doc => doc.data());
};

exports.updateChannelDetails = async (assetId: string, channelDetails: any) => {
  await admin
    .firestore()
    .collection('mam')
    .doc(assetId)
    .set({ ...channelDetails }, { merge: true });
};

// exports.getDealsForAsset = async (asset: any) => {
//   const queryBuilder = admin.firestore().collection('deals');
//   let query

//   if (asset.category === 'offers') {
//     query = queryBuilder.where('offerId', '==', asset.assetId);
//   } else if (asset.category === 'requests') {
//     query = queryBuilder.where('requestId', '==', asset.assetId);
//   }
  
//   const querySnapshot = await query.get();

//   if (querySnapshot.size === 0) return [];

//   // Return data
//   return querySnapshot.docs.map(doc => doc.data());
// };

exports.getChannelDetailsForAsset = async (assetId: string) => {
  // Get User's wallet
  const doc = await admin
    .firestore()
    .collection('mam')
    .doc(assetId)
    .get();

  if (doc.exists) {
    return doc.data();
  }
  console.log('getChannelDetailsForAsset failed.', assetId);
  throw Error(`The channel doesn't exist.`);
};


exports.reactivateOffers = async () => {
  // Get inactive offers
  const querySnapshot = await admin.firestore()
    .collection('offers')
    .where('active', '==', false)
    .where('endTimestamp', '<', Date.now())
    .get();

  if (querySnapshot.size === 0) return true;

  const assetIds = querySnapshot.docs.map(doc => doc.data().assetId);
  assetIds.forEach(async assetId => {
    await admin.firestore()
    .collection('offers')
    .doc(assetId)
    .set({ active: true }, { merge: true });
  });

  return true;
};

exports.cancelRunningDeal = async (dealId: string, offerId: string) => {
  // Update deal asset
  await admin
    .firestore()
    .collection('deals')
    .doc(dealId)
    .set({ cancelled: true, cancelTime: Date.now() }, { merge: true });

  // Update offer asset
  await admin
    .firestore()
    .collection('offers')
    .doc(offerId)
    .set({ active: true }, { merge: true });

  return true;
};

exports.getDealsForUser = async (userId: string) => {
  // Get User's deals
  const querySnapshot = await admin
    .firestore()
    .collection('users')
    .doc(userId)
    .collection('deals')
    .get();

  if (querySnapshot.size === 0) return [];

  // Return data
  return querySnapshot.docs.map(doc => {
    if (doc.exists) {
      return doc.data();
    } else {
      console.log('getDealsForUser failed.', userId, doc);
      return null;
    }
  });
};


