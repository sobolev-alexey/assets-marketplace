import React, { useContext } from 'react';
import styled from 'styled-components';
import format from 'date-fns/format';
import { Link } from 'react-router-dom';
import { connect } from 'react-redux';
import { AssetContext } from '../../pages/dashboard';
import Card from './index.js';

const Heading = ({ assetId, active, assetName, category }) => {
  const { deleteAsset } = useContext(AssetContext);
  return (
    <Full>
      <AssetCategory>{category}</AssetCategory>
      <Link to={`/deal/${assetId}`}>
        <AssetId>{assetName.length > 20 ? `${assetName.substr(0, 20)}...` : assetName}</AssetId>
      </Link>
      {
        active && deleteAsset ? (
          <Delete onClick={() => deleteAsset(assetId, category)}>
            <IconButton src="/static/icons/icon-delete.svg" />
          </Delete>
        ) : null
      }
    </Full>
  );
}

const Footer = ({ assetId, active, category }) => {
  const { history, modify } = useContext(AssetContext);
  if (!history) return null;

  return (
    <React.Fragment>
      <FootRow>
        <FooterButton onClick={() => history(assetId)}>
          History
        </FooterButton>
        {
          modify && active && (
            <FooterButton onClick={() => modify(assetId, category)}>
              Modify
            </FooterButton>
          )
        }
      </FootRow>
    </React.Fragment>
  );
}

const Asset = props => {
  const { asset } = props;

  return (
    <Card header={Heading(asset, props.delete)} footer={Footer(asset)}>
      <Row>
        <RowHalf>
          <RowDesc>Asset Type:</RowDesc>
          <Data>{asset.type}</Data>
        </RowHalf>
        <RowHalf>
          <RowDesc>Owner:</RowDesc>
          <Data>{asset.company}</Data>
        </RowHalf>
      </Row>
      {
        asset.startTimestamp && asset.endTimestamp ? (      
          <Row>
            <RowHalf>
              <RowDesc>Begin Time:</RowDesc>
              <Data>{format(Number(asset.startTimestamp), 'HH:mm - DD.MM.YY')}</Data>
            </RowHalf>
            <RowHalf>
              <RowDesc>End Time:</RowDesc>
              <Data>{format(Number(asset.endTimestamp), 'HH:mm - DD.MM.YY')}</Data>
            </RowHalf>
          </Row>
        ) : null
      }
      <Row>
        <RowHalf>
          <RowDesc>Location</RowDesc>
          <Data>
            {asset.location.city && asset.location.country
              ? `${asset.location.city}, ${asset.location.country}`
              : '--'}
          </Data>
        </RowHalf>
        <RowHalf>
          <RowDesc>Price:</RowDesc>
          <Data>{asset.price}</Data>
        </RowHalf>
      </Row>
      {
        asset.assetDescription ? (
          <RowFull>
            <RowDesc>Asset Description:</RowDesc>
            <Data>
              {
                asset.assetDescription.length > 120 
                ? `${asset.assetDescription.substr(0, 120)}...` 
                : asset.assetDescription
              }
            </Data>
          </RowFull>
        ) : null
      }
    </Card>
  );
};

const mapStateToProps = state => ({
  settings: state.settings,
});

export default connect(mapStateToProps)(Asset);

const Row = styled.div`
  display: flex;
  justify-content: space-between;
  &:not(:last-of-type) {
    margin-bottom: 5px;
  }
`;

const RowFull = styled.div`
  padding: 5px 30px;
  display: inline-block;
  text-align: left;
  width: 100%;

  @media (max-width: 400px) {
    border: none;
    padding-left: 20px;
    padding-right: 0;
  }
`;

const RowHalf = styled.div`
  padding: 5px 30px;
  display: inline-block;
  &:last-child {
    text-align: right;
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
  font: 12px/16px 'Nunito Sans', sans-serif;
  color: #808b92;
`;

const AssetCategory = styled.span`
  font: 16px 'Nunito Sans', sans-serif;
  text-transform: uppercase;
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

const FootRow = styled.div`
  display: flex;
  justify-content: space-between;
  cursor: default;
  &:not(:last-of-type) {
    margin-bottom: 5px;
  }
`;

const FooterButton = styled.button`
  color: rgba(41, 41, 41, 0.9);
  padding: 5px 15px;
  margin-right: -15px;
  font-size: 90%;
  background: transparent;
  cursor: pointer;
  &:first-of-type {
    margin-left: -15px;
    margin-right: 0;
  }
`;