import React, { useEffect, useState } from 'react';
import styled from 'styled-components';
import { connect } from 'react-redux';
import isEmpty from 'lodash-es/isEmpty';
import { reducer } from '../../utils/helpers';
import { getBalance } from '../../utils/iota';
import Loading from '../loading';

const SideBar = ({ asset, settings, isLoading, downloadAssetStreamJSON, purchase }) => {
  const [balance, setBalance] = useState(null);

  useEffect(() => {
    (async () => {
      if (asset.address) {
        setBalance(await getBalance(asset.address, settings.provider));
      }
    })();
  }, [!isEmpty(asset) && asset.address]);

  return (
    <Sidebar>
      <Details>
        <Label>Asset details:</Label>
        <div>
          {!isEmpty(settings) ? (
            <a
              href={`${settings.tangleExplorer}/${asset.address}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <DetailRow>
                <DetailKey>Asset Balance:</DetailKey>
                <DetailValue>{balance ? reducer(balance) : '--'}</DetailValue>
              </DetailRow>
            </a>
          ) : (
            <DetailRow>
              <DetailKey>Asset Balance:</DetailKey>
              <DetailValue>{balance ? reducer(balance) : '--'}</DetailValue>
            </DetailRow>
          )}
          <DetailRow>
            <DetailKey>Location:</DetailKey>
            <DetailValue>
              {' '}
              {asset.location && asset.location.city && asset.location.country
                ? `${asset.location.city}, ${asset.location.country}`
                : '--'}
            </DetailValue>
          </DetailRow>
          <DetailRow>
            <DetailKey>Owner:</DetailKey>
            <DetailValue>{asset.company ? asset.company : '--'}</DetailValue>
          </DetailRow>
        </div>
      </Details>
      {
        purchase ? (
          <Details>
            <DetailValue>Download asset stream</DetailValue>
            <DetailRow>
              <Button onClick={downloadAssetStreamJSON}>Download</Button>
            </DetailRow>
          </Details>
        ) : null
      }
      <Details>
        <DetailRow>
          <a
            href={'/static/docs/index.html'}
            target="_blank"
            rel="noopener noreferrer"
          >
            <DetailValue>View the API documentation</DetailValue>
          </a>
        </DetailRow>
      </Details>
      <Fetcher>
        {isLoading ? <Loading /> : null}
      </Fetcher>
    </Sidebar>
  );
}

const mapStateToProps = state => ({
  settings: state.settings,
  asset: state.asset,
});

export default connect(mapStateToProps)(SideBar);

const Fetcher = styled.div`
  position: absolute;
  bottom: 20px;
  left: 20px;
  display: flex;
  justify-content: center;
  @media (max-width: 760px) {
    display: none;
  }
`;

const Sidebar = styled.aside`
  background-image: linear-gradient(-189deg, #0d3497 1%, #1857eb 95%);
  display: flex;
  flex-flow: column nowrap;
  align-items: flex-end;
  width: 25vw;
  min-width: 330px;
  padding: 40px 30px 0 0;
  @media (max-width: 1235px) {
    width: 10vw;
    min-width: 290px;
  }
  @media (max-width: 760px) {
    width: 100%;
    padding: 30px 15px;
  }
`;

const Details = styled.div`
  width: 230px;
  position: relative;
  padding-bottom: 30px;
  margin-bottom: 30px;
  @media (max-width: 760px) {
    width: 100%;
  }
  &::before {
    content: '';
    position: absolute;
    right: -30px;
    bottom: 0;
    height: 1px;
    width: 100vw;
    background-color: rgba(115, 143, 212, 0.15);
  }
`;

const Label = styled.label`
  font-size: 14px;
  font-weight: 800;
  letter-spacing: 0.41px;
  position: relative;
  display: block;
  margin: 0 0 30px;
  cursor: pointer;
  text-transform: uppercase;
  color: #009fff;
`;

const DetailRow = styled.div`
  @media (max-width: 760px) {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
`;

const DetailKey = styled.p`
  font-size: 12px;
  line-height: 16px;
  color: #738fd4;
`;

const DetailValue = styled.p`
  font-size: 16px;
  line-height: 32px;
  color: #fff;
`;

const Button = styled.button`
  -webkit-appearance: none;
  -moz-appearance: none;
  appearance: none;
  font: 15px 'Nunito Sans', sans-serif;
  letter-spacing: 0.47px;
  border-radius: 100px;
  text-transform: uppercase;
  color: #fff;
  font-size: 12px;
  letter-spacing: 0.38px;
  padding: 9px 10px;
  margin: 8px 0 0;
  box-shadow: 0 2px 10px 0 rgba(10, 32, 86, 0.3);
  font-weight: 700;
  background-color: #009fff;
  @media (max-width: 760px) {
    margin: 3px 0;
  }
`;