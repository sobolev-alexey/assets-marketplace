import { LOAD_ASSET } from '../../actionTypes';
import api from '../../../utils/api';

export const loadAsset = (category, assetId) => {
  const promise = api.get('asset', { category, assetId });
  return {
    type: LOAD_ASSET,
    promise,
  };
};
