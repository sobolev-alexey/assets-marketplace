import React from 'react';
import styled from 'styled-components';
import BurgerMenu from '../components/header/burger';
import MiniHeader from '../components/header/mini-header';
import AssetList from '../components/asset-list';
import Footer from '../components/footer';
import Loading from '../components/loading';
import { allAssets } from '../utils/firebase';

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
    const assets = await allAssets();
    this.setState({ assets, loading: false });
  }

  render() {
    const offers = this.state.assets.offers.filter(asset => asset && asset.active);
    const requests = this.state.assets.requests.filter(asset => asset && asset.active);

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
            <React.Fragment>
              <Heading>Active Offers</Heading>
              {
                offers.length > 0 ? (
                  <AssetsWrapper id="offers">
                    <AssetList assets={offers} />
                  </AssetsWrapper>
                ) : null
              }
              <Heading>Active Requests</Heading>
              {
                requests.length > 0 ? (
                  <AssetsWrapper id="requests">
                    <AssetList assets={requests} />
                  </AssetsWrapper>
                ) : null
              }
            </React.Fragment>
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

const AssetsWrapper = styled.div`
  display: flex;
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