import React from 'react';
import styled from 'styled-components';
import AssetCard from '../card/asset';

export default props => (
  <InfoCol>
    <CardWrapper id={props.category}>
      {props.assets && props.assets.map((asset, i) => (
        <React.Fragment key={asset.assetId}>
          <input
            type="radio"
            name={props.category}
            id={asset.assetId}
            onChange={props.onSelect}
          />
          <AssetCard index={i} key={asset.assetId} asset={asset} delete={props.delete} />
        </React.Fragment>

      ))}
    </CardWrapper>
  </InfoCol>
);

const InfoCol = styled.main`
  position: relative;

  @media (max-width: 760px) {
    width: 100%;
    padding: 0;
  }
`;

const CardWrapper = styled.div`
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  justify-content: flex-start;
  padding: 40px 40px 200px;
  @media (max-width: 1195px) {
    flex-flow: column nowrap;
    padding-bottom: 0;
  }
  @media (max-width: 760px) {
    width: 100%;
    align-items: center;
  }
`;
