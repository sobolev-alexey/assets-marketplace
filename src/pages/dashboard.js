import React from 'react';
import { connect } from 'react-redux';
import isEmpty from 'lodash-es/isEmpty';
import styled from 'styled-components';
import firebase from 'firebase/app';
import { loadUser, logout } from '../store/user/actions';
import api from '../utils/api';
import AssetNav from '../components/asset-nav';
import LoginModal from '../components/login-modal';
import Sidebar from '../components/user-sidebar';
import AssetList from '../components/asset-list';
import Loading from '../components/loading';
import AddCard from '../components/add-asset';
import Modal from '../components/modal';

export const UserContext = React.createContext({});
export const AssetContext = React.createContext({});
export const ModifyAssetContext = React.createContext({});

class Dashboard extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      assets: {
        offers: [],
        requests: []
      },
      user: {},
      orders: [],
      loading: false,
      displayNewOfferForm: false,
      displayNewRequestForm: false,
      showModal: false,
      notification: null,
      error: false,
      assetDetails: {},
      assetToModify: {}
    };

    this.checkLogin = this.checkLogin.bind(this);
    this.auth = this.auth.bind(this);
    this.getUser = this.getUser.bind(this);
    this.findAssets = this.findAssets.bind(this);
    this.createOffer = this.createOffer.bind(this);
    this.deleteAsset = this.deleteAsset.bind(this);
    this.createRequest = this.createRequest.bind(this);
    this.logout = this.logout.bind(this);
    this.getOrders = this.getOrders.bind(this);
    this.showHistory = this.showHistory.bind(this);
    this.showNewOfferForm = this.showNewOfferForm.bind(this);
    this.hideNewOfferForm = this.hideNewOfferForm.bind(this);
    this.showNewRequestForm = this.showNewRequestForm.bind(this);
    this.hideNewRequestForm = this.hideNewRequestForm.bind(this);
    this.notificationCallback = this.notificationCallback.bind(this);
  }

  async componentDidMount() {
    // Init Wallet
    this.checkLogin();
  }

  checkLogin() {
    firebase.auth().onAuthStateChanged(user => {
      if (user && !user.isAnonymous) {
        // User is signed in.
        this.setState({ user });
        this.getUser();
      } else {
        // No user is signed in.
        this.setState({ loading: false });
      }
    });
  };

  auth() {
    const provider = new firebase.auth.GoogleAuthProvider();
    provider.addScope('email');
    provider.addScope('profile');

    firebase
      .auth()
      .signInWithPopup(provider)
      .then(result => {
        // This gives you a Google Access Token. You can use it to access the Google API.
        // const token = result.credential.accessToken;
        // The signed-in user info.
        const user = result.user;
        this.setState({ user });
        this.getUser();
      })
      .catch(error => {
        console.error('auth error', error);
      });
  };

  async getUser() {
    await this.props.loadUser(this.state.user.uid);
    await this.findAssets();
    await this.getOrders();
  };

  async findAssets() {
    this.setState({ loading: true });
    const emptyAssets = {
      offers: [],
      requests: []
    }
    const assets = await api.get('assets', { userId: this.state.user.uid, apiKey: this.props.userData.apiKey }) || emptyAssets;
    return this.setState({ assets, loading: false });
  };

  createOffer(asset) {
    return this.create(asset, 'offers');
  };

  createRequest(asset) {
    return this.create(asset, 'requests');
  };

  create(asset, category) {
    const { userData } = this.props;

    return new Promise(async (resolve) => {
      const packet = {
        apiKey: userData.apiKey,
        asset,
        category
      };

      // Call server
      const data = await api.post('newAsset', packet);
      // Check success
      if (data.success) {
        this.findAssets();
        this.setState({ 
          displayNewOfferForm: false, 
          displayNewRequestForm: false
        });

        if (data.matchingAssets && data.matchingAssets.length > 0) {
          this.setState({ 
            showModal: true, 
            error: false,
            notification: 'assetMatchFound',
            assetDetails: {
              category, assetId: data.assetId
            }
          });
        }
      } else if (data.error) {
        this.setState({
          showModal: true, 
          error: data.error, 
          notification: 'generalError', 
          loading: false,
          assetDetails: {}
        });
      }
      
      resolve(data);
    });
  };

  async deleteAsset(assetId, category) {
    this.setState({ loading: true });
    const { userData } = this.props;
    const packet = {
      apiKey: userData.apiKey,
      assetId,
      category
    };
    const data = await api.delete('delete', packet);
    const assets = this.state.assets;
    assets[category] = [...assets[category].filter(asset => asset.assetId !== assetId)];
    if (data.success) {
      this.setState({
        loading: false,
        assets,
      });
    } else {
      this.setState({
        showModal: true, 
        error: data.error, 
        notification: 'generalError',
        loading: false,
      });
    }
  };

  logout() {
    this.props.logout();
    firebase
      .auth()
      .signOut()
      .then(() => {
        // Sign-out successful.
        this.setState({ user: {}, assets: [] });
      })
      .catch(error => {
        console.error('logout error', error);
      });
  };

  showNewOfferForm() {
    this.setState({ displayNewOfferForm: true });
  }

  hideNewOfferForm() {
    this.setState({ displayNewOfferForm: false });
  }

  showNewRequestForm() {
    this.setState({ displayNewRequestForm: true });
  }

  hideNewRequestForm() {
    this.setState({ displayNewRequestForm: false });
  }

  notificationCallback() {
    this.setState({       
      showModal: false,
      notification: null,
      error: false,
      assetDetails: {},
    });
  }

  showHistory(assetId) {
    this.props.history.push(`/history/${assetId}`);
  }

  async getOrders() {
    const { userData } = this.props;
    this.setState({ loading: true });
    const orders = await api.get('orders', { apiKey: userData.apiKey });
    return this.setState({ orders, loading: false });
  };

  render() {
    const { assets, user, loading, displayNewOfferForm, displayNewRequestForm } = this.state;
    const { userData } = this.props;

    const activeOffers = assets.offers && !isEmpty(assets.offers) 
      ? assets.offers.filter(asset => asset.active) : [];
    
    const inactiveOffers = assets.offers && !isEmpty(assets.offers) 
      ? assets.offers.filter(asset => !asset.active) : [];

    const activeRequests = assets.requests && !isEmpty(assets.requests) 
      ? assets.requests.filter(asset => asset.active) : [];

    const inactiveRequests = assets.requests && !isEmpty(assets.requests) 
      ? assets.requests.filter(asset => !asset.active) : [];

    return (
      <Main>
        <AssetNav user={user} logout={this.logout} />
        <Data>
          <UserContext.Provider value={{ userId: user.uid }}>
            <Sidebar assets={assets} user={user} userData={userData} />
          </UserContext.Provider>
          {
            loading ? (
              <LoadingBox>
                <Loading />
              </LoadingBox>
            ) : (
              <AssetContext.Provider
                value={{
                  deleteAsset: this.deleteAsset, 
                  history: this.showHistory,
                }}
              >
                <ModifyAssetContext.Provider
                  value={{ ...this.state.assetToModify }}
                >
                  <AssetsWrapper>
                    { 
                      !displayNewOfferForm && 
                      <Button onClick={this.showNewOfferForm}>
                        +Create Offer
                      </Button>
                    }
                    { 
                      displayNewOfferForm && 
                      <AddCard 
                        createAsset={this.createOffer} 
                        cancel={this.hideNewOfferForm} 
                        category="offers"  
                      /> 
                    }
                    {
                      activeOffers.length > 0 ? (
                        <React.Fragment>
                          <Heading>Active Offers</Heading>
                          <ActiveAssets>
                            <AssetList
                              assets={activeOffers}
                            />
                          </ActiveAssets>
                        </React.Fragment>
                      ) : null
                    }
                    {
                      inactiveOffers.length > 0 ? (
                        <React.Fragment>
                          <Heading>Inactive Offers</Heading>
                          <InactiveAssets>
                            <AssetList
                              assets={inactiveOffers}
                            />
                          </InactiveAssets>
                        </React.Fragment>
                      ) : null
                    }
                    { 
                      !displayNewRequestForm && 
                      <Button onClick={this.showNewRequestForm}>
                        +Create Request
                      </Button> 
                    }
                    { 
                      displayNewRequestForm && 
                      <AddCard
                        createAsset={this.createRequest} 
                        cancel={this.hideNewRequestForm}
                        category="requests"
                      /> 
                    }
                    {
                      activeRequests.length > 0 ? (
                        <React.Fragment>
                          <Heading>Active Requests</Heading>
                          <ActiveAssets>
                            <AssetList
                              assets={activeRequests}
                            />
                          </ActiveAssets>
                        </React.Fragment>
                      ) : null
                    }
                    {
                      inactiveRequests.length > 0 ? (
                        <React.Fragment>
                          <Heading>Inactive Requests</Heading>
                          <InactiveAssets>
                            <AssetList
                              assets={inactiveRequests}
                            />
                          </InactiveAssets>
                        </React.Fragment>
                      ) : null
                    }
                  </AssetsWrapper>
                </ModifyAssetContext.Provider>
              </AssetContext.Provider>
            )
          }
        </Data>
        <LoginModal
          auth={this.auth}
          show={isEmpty(user)}
          loading={loading}
        />
        <Modal
          show={this.state.showModal || !isEmpty(this.state.error)}
          notification={this.state.notification}
          error={this.state.error}
          category={this.state.assetDetails.category}
          assetId={this.state.assetDetails.assetId}
          callback={this.state.notification === 'generalError' ? this.notificationCallback : null}
        />
      </Main>
    );
  }
}

const mapStateToProps = state => ({
  userData: state.user,
});

const mapDispatchToProps = dispatch => ({
  loadUser: userId => dispatch(loadUser(userId)),
  logout: () => dispatch(logout()),
});

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(Dashboard);

const Main = styled.main`
  width: 100vw;
  height: 100vh;
`;

const AssetsWrapper = styled.div`
  display: flex;
  flex-direction: column;
`

const ActiveAssets = styled.div`

`

const InactiveAssets = styled.div`
  opacity: 0.7;
`

const Data = styled.section`
  background-image: linear-gradient(-189deg, #06236c 1%, #1449c6 95%);
  min-height: 90vh;
  position: relative;
  display: flex;
  @media (max-width: 760px) {
    flex-direction: column;
  }
`;

const LoadingBox = styled.div`
  margin: auto;
`;

const Button = styled.button`
  -webkit-appearance: none;
  -moz-appearance: none;
  appearance: none;
  font: 15px 'Nunito Sans', sans-serif;
  letter-spacing: 0.47px;
  padding: 20px 38px;
  border-radius: 100px;
  text-transform: uppercase;
  color: #fff;
  font-size: 12px;
  letter-spacing: 0.38px;
  padding: 12px 21px;
  margin: 15px 0 0;
  box-shadow: 0 10px 20px 0 #0a2056;
  font-weight: 700;
  background-color: #009fff;
`;

const Heading = styled.h2`
  font-size: 2rem;
  font-weight: 300;
  color: #ffffff;
  padding: 50px 40px 0;
`;