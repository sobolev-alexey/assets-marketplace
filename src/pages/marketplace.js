import React from 'react';
import styled from 'styled-components';
import BurgerMenu from '../components/header/burger';
import MiniHeader from '../components/header/mini-header';
import AssetList from '../components/asset-list';
import Footer from '../components/footer';
import Loading from '../components/loading';
import api from '../utils/api';

export default class extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      assets: {
        offers: [],
        requests: []
      },
      loading: true,
    };
  }

  async componentDidMount() {
    const assets = await api.get('assets');
    this.setState({ assets, loading: false });
  }

  render() {
    const { assets: { offers, requests } } = this.state;

    return (
      <Main id="main">
        <BurgerMenu />
        <MiniHeader />
        {
          this.state.loading ? (
            <LoadingBox>
              <Loading color="#009fff" size="80" />
            </LoadingBox>
          ) : (
            <AssetsOuterWrapper>
              {
                offers.length > 0 ? (
                  <AssetsWrapper id="offers">
                    <Heading>Active Offers</Heading>
                    <AssetList assets={offers.filter(asset => asset && asset.active)} />
                  </AssetsWrapper>
                ) : null
              }
              {
                requests.length > 0 ? (
                  <AssetsWrapper id="requests">
                    <Heading>Active Requests</Heading>
                    <AssetList assets={requests.filter(asset => asset && asset.active)} />
                  </AssetsWrapper>
                ) : null
              }
            </AssetsOuterWrapper>
          )
        }
        <Footer />
      </Main>
    );
  }
}

const Main = styled.div`
  overflow-x: hidden;
`;

const AssetsOuterWrapper = styled.div`
  display: flex;
  flex-direction: column;
  width: 100%;
  min-height: 400px;
`;

const AssetsWrapper = styled.div`
  display: flex;
  flex-direction: column;
  width: 100%;
`;

const LoadingBox = styled.div`
  min-height: 300px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  padding: 20px;
`;

const Heading = styled.h2`
  font-size: 2rem;
  font-weight: 300;
  color: #009fff;
  padding: 50px 40px 0;
`;