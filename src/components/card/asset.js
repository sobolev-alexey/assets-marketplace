import React from 'react';
import ReactGA from 'react-ga';
import styled from 'styled-components';
import { Link } from 'react-router-dom';
import { connect } from 'react-redux';
import { getZip } from '../../utils/zip';
import Card from './index.js';

const trackDownload = ({ assetId }) => {
  ReactGA.event({
    category: 'Download script',
    action: 'Download script',
    label: `Asset ID ${assetId}`
  });
}

const Heading = ({ assetId, type }, func) => (
  <Full>
    <AssetType>{type}</AssetType>
    {assetId ? (
      <Link to={`/asset/${assetId}`}>
      <AssetId>{assetId.length > 20 ? `${assetId.substr(0, 20)}...` : assetId}</AssetId>
      </Link>
    ) : null}
    <Delete onClick={() => func(assetId)}>
      <IconButton src="/static/icons/icon-delete.svg" />
    </Delete>
  </Full>
);

const Footer = (asset, provider) => (
  <div onClick={() => trackDownload(asset) || getZip(asset, provider)}>
    <FootRow>
      <FooterButton>Download Publish Script</FooterButton>
    </FootRow>
  </div>
);

const Asset = props => {
  const { asset, settings: { provider } } = props;
  return (
    <Card header={Heading(asset, props.delete)} footer={Footer(asset, provider)}>
      <RowHalf>
        <RowIcon src="/static/icons/icon-small-location.svg" alt="" />
        <RowDesc>Location</RowDesc>
        <Data>
          {asset.location.city && asset.location.country
            ? `${asset.location.city}, ${asset.location.country}`
            : '--'}
        </Data>
      </RowHalf>
      <RowHalf>
        <RowIcon src="/static/icons/icon-small-packet.svg" alt="" />
        <RowDesc>Asset streams:</RowDesc>
        <Data>{asset.dataTypes && asset.dataTypes.length}</Data>
      </RowHalf>
      <RowHalf>
        <RowIcon src="/static/icons/icon-key.svg" alt="" />
        <RowDesc>Asset secret key:</RowDesc>
        <Data>{asset.sk}</Data>
      </RowHalf>
    </Card>
  );
};

const mapStateToProps = state => ({
  settings: state.settings,
});

export default connect(mapStateToProps)(Asset);

const RowHalf = styled.div`
  padding: 20px 30px 14px;
  display: inline-block;
  &:first-child {
    width: 180px;
    border-right: 1px solid #eaecee;
  }

  &:first-of-type {
    @media (max-width: 400px) {
      border: none;
      width: 140px;
      padding-left: 20px;
      padding-right: 0;
    }
  }
`;

const Data = styled.p`
  font-size: 18px;
  line-height: 30px;
  margin-top: 4px;
`;

const RowDesc = styled.span`
  margin-left: 5px;
  font: 12px/16px 'Nunito Sans', sans-serif;
  color: #808b92;
`;

const RowIcon = styled.img`
  position: relative;
  top: 1px;
`;

const FootRow = styled.div`
  display: flex;
  justify-content: space-between;
  &:not(:last-of-type) {
    margin-bottom: 5px;
  }
`;

const AssetType = styled.span`
  font: 12px/16px 'Nunito Sans', sans-serif;
  position: absolute;
  top: -8px;
  color: #808b92;
`;

const AssetId = styled.span`
  font-size: 24px;
  top: 6px;
  line-height: 42px;
  position: relative;
  color: #009fff;
`;

const Full = styled.div`
  width: 100%;
`;

const Delete = styled.span`
  position: absolute;
  display: flex;
  align-items: center;
  top: 10px;
  right: 30px;
`;

const IconButton = styled.img`
  height: 20px;
  width: 20px;
  cursor: pointer;
  opacity: 1;
  transition: all 0.3s ease;
  &:hover {
    opacity: 0.4;
  }
`;

const FooterButton = styled.button`
  color: ${props => (props.grey ? `rgba(41, 41, 41, 0.4)` : `rgba(41, 41, 41, 0.9)`)};
  padding: 5px 15px;
  margin-right: -15px;
  font-size: 90%;
  background: transparent;
  &:first-of-type {
    margin-left: -15px;
    margin-right: 0;
  }
`;
