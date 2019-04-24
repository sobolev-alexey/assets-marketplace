import { handle } from 'redux-pack';
import { LOAD_ASSET } from '../../actionTypes';

export default (state = {}, action) => {
  const { type, payload } = action;

  switch (type) {
    case LOAD_ASSET:
      if (!payload || payload.length === 0) return state;
      return handle(state, action, {
        success: prevState => payload,
        failure: prevState => prevState,
      });
    default:
      return state;
  }
};
