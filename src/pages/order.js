import React from 'react';
import { connect } from 'react-redux';
import isEmpty from 'lodash-es/isEmpty';
import styled from 'styled-components';
import firebase from 'firebase/app';
import { loadUser, logout } from '../store/user/actions';
import api from '../utils/api';
import AssetNav from '../components/asset-nav';
import LoginModal from '../components/login-modal';
import Modal from '../components/modal';
import Sidebar from '../components/user-sidebar';
import AssetList from '../components/asset-list/order-page';
import AssetCard from '../components/card/asset';
import AddCard from '../components/add-asset';
import Loading from '../components/loading';

export const UserContext = React.createContext({});
export const OrderContext = React.createContext({});

class Order extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      assets: {
        offers: [],
        requests: []
      },
      user: {},
      showModal: false,
      notification: null,
      error: false,
      loading: false,
      selectedOffer: null,
      selectedRequest: null,
      matchingAssetSelected: null,
      displayNewOfferForm: false,
      displayNewRequestForm: false,
    };

    this.checkLogin = this.checkLogin.bind(this);
    this.auth = this.auth.bind(this);
    this.getUser = this.getUser.bind(this);
    this.findMatchingAssets = this.findMatchingAssets.bind(this);
    this.logout = this.logout.bind(this);
    this.selectAsset = this.selectAsset.bind(this);
    this.cancel = this.cancel.bind(this);
    this.confirmOrder = this.confirmOrder.bind(this);
    this.notificationCallback = this.notificationCallback.bind(this);
    this.showNewOfferForm = this.showNewOfferForm.bind(this);
    this.hideNewOfferForm = this.hideNewOfferForm.bind(this);
    this.showNewRequestForm = this.showNewRequestForm.bind(this);
    this.hideNewRequestForm = this.hideNewRequestForm.bind(this);
    this.createOffer = this.createOffer.bind(this);
    this.createRequest = this.createRequest.bind(this);
  }

  async componentWillReceiveProps(nextProps) {
    const { match: { params: { assetId } } } = nextProps;
    if (this.props.match.params.assetId !== assetId) {
      await this.findMatchingAssets(assetId);
    }
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
    const { match: { params: { assetId } } } = this.props;
    await this.findMatchingAssets(assetId);
  };

  async findMatchingAssets(assetId) {
    this.setState({ loading: true });
    const emptyAssets = {
      offers: [],
      requests: []
    }
    const assets = await api.get('match', { assetId }) || emptyAssets;
    return this.setState({ assets, loading: false });
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

  selectAsset(assetId, category) {
    const { assets, matchingAssetSelected } = this.state;
    if (assetId === matchingAssetSelected) {
      this.setState({ 
        selectedOffer: null, 
        selectedRequest: null, 
        matchingAssetSelected: null 
      });
    } else if (category === 'offers') {
      this.setState({
        selectedOffer: assetId, 
        selectedRequest: assets.ownAsset.assetId, 
        matchingAssetSelected: assetId 
      });
    } else if (category === 'requests') {
      this.setState({
        selectedOffer: assets.ownAsset.assetId,
        selectedRequest: assetId, 
        matchingAssetSelected: assetId 
      });
    }
  }

  confirmOrder() {
    const { selectedOffer, selectedRequest } = this.state;
    if (selectedOffer && selectedRequest) {
      this.setState({ loading: true });
      return new Promise(async (resolve) => {
        const packet = {
          apiKey: this.props.userData.apiKey,
          offerId: selectedOffer, 
          requestId: selectedRequest
        };
  
        // Call server
        const data = await api.post('order', packet);
        // Check success
        if (data.success) {
          this.setState({ 
            showModal: true, 
            error: false,
            notification: 'orderCompleted',
            loading: false
          });
        } else if (data.error) {
          this.setState({
            showModal: true, 
            error: data.error, 
            notification: 'generalError', 
            loading: false,
          });
        }

        resolve(data);
      });
    }
  }

  notificationCallback() {
    this.setState({       
      showModal: false,
      notification: null,
      error: false,
    });
  }

  cancel() {
    this.setState({ 
      selectedOffer: null, 
      selectedRequest: null, 
      matchingAssetSelected: null 
    });
  }

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

  createOffer(asset) {
    return this.create(asset, 'offers');
  };

  createRequest(asset) {
    return this.create(asset, 'requests');
  };

  create(asset, category) {
    const { userData, match: { params: { assetId } } } = this.props;

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
        await this.findMatchingAssets(assetId);
        this.setState({ 
          displayNewOfferForm: false, 
          displayNewRequestForm: false,
          loading: false,
          showModal: false,
          notification: null,
          error: false
        });
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

  render() {
    const { assets, user, loading, matchingAssetSelected } = this.state;
    const { userData } = this.props;

    const userId = this.state.user.uid;
    const selectedAssetOwner = assets.ownAsset && !isEmpty(assets.ownAsset) ? assets.ownAsset.owner : null;
    const hasMatchingAssets = !isEmpty(assets.offers) || !isEmpty(assets.requests);

    let status
    if (!hasMatchingAssets) {
      if (userId === selectedAssetOwner) {
        status = 'No matching assets';
      } else {
        if (assets.ownAsset && !isEmpty(assets.ownAsset)) {
          if (assets.ownAsset.category === 'offers') {
            status = 'Create request';
          } else if (assets.ownAsset.category === 'requests') {
            status = 'Create offer';
          }
        }
      }
    }

    return (
      <Main>
        <AssetNav user={user} logout={this.logout} />
        <Data>
          <UserContext.Provider value={{ userId: user.uid }}>
            <Sidebar user={user} userData={userData} />
          </UserContext.Provider>
          {
            loading ? (
              <LoadingBox>
                <Loading />
              </LoadingBox>
            ) : (
              <OrderWrapper>
                <AssetsWrapper>
                  <Heading>Selected Asset</Heading>
                  {
                    assets.ownAsset && !isEmpty(assets.ownAsset) ? (
                      <AssetCard asset={assets.ownAsset} />
                    ) : null
                  }
                  <OrderContext.Provider value={{
                    selectAsset: this.selectAsset,
                    selected: matchingAssetSelected
                  }}>
                    {
                      isEmpty(assets.offers) && isEmpty(assets.requests) ? (
                        <NoAssetsOuterWrapper>
                          <NoAssetsInnerWrapper>
                            <Heading>No matching assets found</Heading>
                            <Text>Why not create a new one?</Text>
                            {
                              status === 'Create offer' ? (
                                <Button onClick={this.showNewOfferForm}>
                                  Create offer
                                </Button>
                              ) : null
                            }
                            {
                              status === 'Create request' ? (
                                <Button onClick={this.showNewRequestForm}>
                                  Create request
                                </Button> 
                              ) : null
                            }
                            { 
                              this.state.displayNewOfferForm && 
                              <AddCard 
                                createAsset={this.createOffer} 
                                cancel={this.hideNewOfferForm} 
                                category="offers"  
                              /> 
                            }
                            { 
                              this.state.displayNewRequestForm && 
                              <AddCard
                                createAsset={this.createRequest} 
                                cancel={this.hideNewRequestForm}
                                category="requests"
                              /> 
                            }
                          </NoAssetsInnerWrapper>
                        </NoAssetsOuterWrapper>
                      ) : null
                    }
                    {
                      assets.offers && !isEmpty(assets.offers) && 
                        <Heading>Please select matching offer</Heading>
                    }
                    {
                      assets.offers && !isEmpty(assets.offers) ? (
                        <Offers>
                          <AssetList
                            assets={assets.offers.filter(asset => asset && asset.active)}
                            category="offers"
                          />
                        </Offers>
                      ) : null
                    }
                    {
                      assets.requests && !isEmpty(assets.requests) && 
                        <Heading>Please select matching request</Heading>
                    }
                    {
                      assets.requests && !isEmpty(assets.requests) ? (
                        <Requests>
                          <AssetList
                            assets={assets.requests.filter(asset => asset && asset.active)}
                            category="requests"
                          />
                        </Requests>
                      ) : null
                    }
                  </OrderContext.Provider>
                </AssetsWrapper>
                {
                  matchingAssetSelected ? (
                    <OrderButtonsWrapper>
                      <Button onClick={this.cancel} secondary>Cancel</Button>
                      <Button onClick={this.confirmOrder}>Confirm Order</Button>
                    </OrderButtonsWrapper>
                  ) : null
                }
              </OrderWrapper>
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
          error={this.state.error ? { body: this.state.error } : null}
          callback={this.notificationCallback}
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
)(Order);

const Main = styled.main`
  height: 100vh;
`;

const AssetsWrapper = styled.div`
  display: flex;
  flex-direction: column;
  margin: 50px 50px 80px;
`

const Offers = styled.div`

`

const Requests = styled.div`

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
  padding: 12px 21px;
  border-radius: 100px;
  color: ${props => (props.secondary ? '#009fff' : '#ffffff')};
  background-color: ${props => (props.secondary ? '#ffffff' : '#009fff')};
  border: ${props => (props.secondary ? '1px solid #009fff' : 'none')};
  font-size: 20px;
  font-weight: normal;
  letter-spacing: 0.38px;
  margin: 15px 0 0;
  width: 300px;
  height: 50px;

  &:hover {
    color: ${props => (props.secondary ? '#ffffff' : '#009fff')};
    background-color: ${props => (props.secondary ? '#009fff' : '#ffffff')};
    border: 1px solid #009fff;
  }
`;

const Heading = styled.h2`
  font-size: 2rem;
  font-weight: 300;
  color: #ffffff;
  padding-bottom: 50px;
`;

const OrderWrapper = styled.div`
  display: flex;
  flex-direction: column;
  position: relative;
  width: 100%;
`

const OrderButtonsWrapper = styled.div`
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  background-color: #ffffff;
  position: fixed;
  bottom: 0;
  width: calc(100% - 350px);
  height: 80px;
  padding: 0 30px;
  box-shadow: 2px -4px 41px 0px rgba(0,0,0,0.75);
`

const NoAssetsOuterWrapper = styled.div`
  position: relative;
  margin-top: 100px;
`

const NoAssetsInnerWrapper = styled.div`
  width: 100%;
  display: flex;
  flex-direction: column;
`

const Text = styled.h4`
  font-size: 1.3rem;
  font-weight: 300;
  color: #ffffff;
  padding: 20px 0;
`;

