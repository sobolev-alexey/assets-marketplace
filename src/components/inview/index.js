import React, { useContext, useEffect } from 'react';
import InView from 'in-view';
import { AssetContext } from '../../pages/asset';

export default ({ children }) => {
  const { func } = useContext(AssetContext);

  useEffect(() => {
    InView('.inview').on('enter', el => func());
  }, []);

  return <div className={'inview'}>{children}</div>;
}
