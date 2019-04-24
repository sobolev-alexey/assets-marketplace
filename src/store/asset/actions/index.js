import { LOAD_ASSET } from '../../actionTypes';
import api from '../../../utils/api';

export const loadAsset = assetId => {
  const promise = api.get('asset', { assetId });
  return {
    type: LOAD_ASSET,
    promise,
  };
};
