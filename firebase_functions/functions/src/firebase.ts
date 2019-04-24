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
    .collection('assetSecrets')
    .doc(assetId)
    .get();
  if (doc.exists) return doc.data();
  console.error('getSk failed. asset does not exist', assetId, doc);
  throw Error(`The asset doesn't exist.`);
};

exports.getPurchase = async (uid: string, asset: string) => {
  // Get User's purchase
  const doc = await admin
    .firestore()
    .collection('users')
    .doc(uid)
    .collection('purchases')
    .doc(asset)
    .get();
  // Check user's profile for purchase
  if (doc.exists) return doc.data();
  console.log('Asset not purchased', uid, asset);
  return false;
};

exports.getData = async (asset: string, timestamp?: number) => {
  const time = timestamp ? Number(timestamp) : Date.now();
  // Get data
  const querySnapshot = await admin
    .firestore()
    .collection('assets')
    .doc(asset)
    .collection('data')
    .where('time', '<', time)
    .orderBy('time', 'desc')
    .limit(20)
    .get();

  if (querySnapshot.size === 0) return [];

  // Return data
  return querySnapshot.docs.map(doc => {
    if (doc.exists) {
      return doc.data();
    } else {
      console.log('getData failed.', asset, doc);
      return null;
    }
  });
};

exports.getAsset = async (asset: string) => {
  // Get User's purchase
  const doc = await admin
    .firestore()
    .collection('assets')
    .doc(asset)
    .get();
  // Check user's profile for purchase
  if (doc.exists) {
    const result = doc.data();
    delete result.sk;
    delete result.owner;
    return result;
  }
  console.log('getAsset failed.', asset, doc);
  return null;
};

exports.getAssets = async () => {
  // Get data
  const querySnapshot = await admin
    .firestore()
    .collection('assets')
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
            .collection('assets')
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

exports.getUserAssets = async (user: string) => {
  // Get data
  const querySnapshot = await admin
    .firestore()
    .collection('assets')
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

exports.setPacket = async (asset: string, packet: any) => {
  // Save users API key and Seed
  await admin
    .firestore()
    .collection('assets')
    .doc(asset)
    .collection('data')
    .doc()
    .set(packet);

  return true;
};

exports.setUser = async (uid: string, obj: any) => {
  // Save users API key and Seed
  await admin
    .firestore()
    .collection('users')
    .doc(uid)
    .set(obj);

  return true;
};

exports.setAsset = async (assetId: string, sk: string, address: string, seed: string, asset: any) => {
  // Save users API key and Seed
  await admin
    .firestore()
    .collection('assetSecrets')
    .doc(assetId)
    .set({ sk, seed });

  // Add public asset record
  await admin
    .firestore()
    .collection('assets')
    .doc(assetId)
    .set({ ...asset, address });

  // Add asset to owners' purchases
  await admin
    .firestore()
    .collection('users')
    .doc(asset.owner)
    .collection('purchases')
    .doc(assetId)
    .set({
      full: true,
      time: Date.now(),
    });

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

exports.setOwner = async (assetId: string, owner: string) => {
  // Save new owner
  await admin
    .firestore()
    .collection('assets')
    .doc(assetId)
    .set({ owner }, { merge: true });
  return true;
};

exports.setPurchase = async (userId: string, assetId: string) => {
  // Save new owner
  await admin
    .firestore()
    .collection('users')
    .doc(userId)
    .collection('purchases')
    .doc(assetId)
    .set({
      full: true,
      time: Date.now(),
    });
  return true;
};

exports.deleteAsset = async (asset: any) => {
  // Remove Asset
  await admin
    .firestore()
    .collection('assetSecrets')
    .doc(asset)
    .delete();

  // Get asset data
  const querySnapshot = await admin
    .firestore()
    .collection('assets')
    .doc(asset)
    .collection('data')
    .get();

  querySnapshot.docs.forEach(async doc => {
    // Delete asset data
    await admin
      .firestore()
      .collection('assets')
      .doc(asset)
      .collection('data')
      .doc(doc.id)
      .delete();
  });

  await admin
    .firestore()
    .collection('assets')
    .doc(asset)
    .delete();
  return true;
};

exports.toggleWhitelistAsset = async (assetId: string, inactive: string) => {
  // Whitelist asset
  await admin
    .firestore()
    .collection('assets')
    .doc(assetId)
    .set({ inactive: inactive === 'true' }, { merge: true });
  return true;
};

exports.getUser = async (userId: string) => {
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

    if (result.wallet) {
      delete result.wallet.seed;
      delete result.wallet.address;
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
      defaultPrice,
      documentation,
      iotaApiVersion,
      mapboxApiAccessToken,
      mapboxStyles,
      provider,
      recaptchaSiteKey,
      tangleExplorer,
    } = doc.data();
    return {
      defaultPrice,
      documentation,
      iotaApiVersion,
      mapboxApiAccessToken,
      mapboxStyles,
      provider,
      recaptchaSiteKey,
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
