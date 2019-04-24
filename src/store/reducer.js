import { combineReducers } from 'redux';
import { LOGOUT } from './actionTypes';
import settings from './settings/reducer';
import user from './user/reducer';
import asset from './asset/reducer';

const appReducer = combineReducers({
  settings,
  asset,
  user,
});

const rootReducer = (state, action) => {
  if (action.type === LOGOUT) {
    state = undefined;
  }

  return appReducer(state, action);
};

export default rootReducer;
