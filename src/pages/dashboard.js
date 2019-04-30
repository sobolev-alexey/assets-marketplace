import React from 'react';
import ReactGA from 'react-ga';
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
import Cookie from '../components/cookie';
import Loading from '../components/loading';
import AddCard from '../components/add-asset';

export const UserContext = React.createContext({});

class Dashboard extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      assets: {
        offers: [],
        requests: []
      },
      user: {},
      loading: false,
      displayNewOfferForm: false,
      displayNewRequestForm: false
    };

    this.checkLogin = this.checkLogin.bind(this);
    this.auth = this.auth.bind(this);
    this.getUser = this.getUser.bind(this);
    this.findAssets = this.findAssets.bind(this);
    this.createOffer = this.createOffer.bind(this);
    this.deleteOffer = this.deleteOffer.bind(this);
    this.createRequest = this.createRequest.bind(this);
    this.deleteRequest = this.deleteRequest.bind(this);
    this.logout = this.logout.bind(this);
    this.showNewOfferForm = this.showNewOfferForm.bind(this);
    this.hideNewOfferForm = this.hideNewOfferForm.bind(this);
    this.showNewRequestForm = this.showNewRequestForm.bind(this);
    this.hideNewRequestForm = this.hideNewRequestForm.bind(this);
  }

  async componentDidMount() {
    ReactGA.pageview('/dashboard');
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
        ReactGA.event({
          category: 'Login',
          action: 'Login',
          label: `User UID ${user.uid}`
        });
      })
      .catch(error => {
        console.error('auth error', error);
      });
  };

  async getUser() {
    await this.props.loadUser(this.state.user.uid);
    await this.findAssets();
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
    // Assign to user
    asset.owner = this.state.user.uid;
    // Deactivate the Asset
    // asset.inactive = true;

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
        ReactGA.event({
          category: 'New asset',
          action: 'New asset',
          label: `Asset Name ${asset.assetName}`
        });
        this.findAssets();
        this.setState({ displayNewOfferForm: false, displayNewRequestForm: false });
      }
      resolve(data);
    });
  };

  deleteOffer(assetId) {
    return this.delete(assetId, 'offers');
  };

  deleteRequest(assetId) {
    return this.delete(assetId, 'requests');
  };

  async delete(assetId, category) {
    ReactGA.event({
      category: 'Delete asset',
      action: 'Delete asset',
      label: `Asset ID ${assetId}`
    });
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

  render() {
    const { assets, user, loading, displayNewOfferForm, displayNewRequestForm } = this.state;
    const { userData } = this.props;

    return (
      <Main>
        <Cookie />
        <AssetNav user={user} logout={this.logout} />
        <Data>
          {
            assets.offers && !isEmpty(assets.offers) && 
            assets.requests && !isEmpty(assets.requests) ? (
              <UserContext.Provider value={{ userId: user.uid }}>
                <Sidebar assets={assets} user={user} userData={userData} />
              </UserContext.Provider>
            ) : null
          }
          {
            loading ? (
              <LoadingBox>
                <Loading />
              </LoadingBox>
            ) : (
              <AssetsWrapper>
                {
                  assets.offers && !isEmpty(assets.offers) ? (
                    <React.Fragment>
                      <Offers>
                        { 
                          !displayNewOfferForm && 
                          <AddOfferButton onClick={this.showNewOfferForm}>
                            +Create Offer
                          </AddOfferButton>
                        }
                        { 
                          displayNewOfferForm && 
                          <AddCard 
                            createAsset={this.createOffer} 
                            cancel={this.hideNewOfferForm} 
                            category="offers"  
                          /> 
                        }
                        <AssetList
                          assets={assets.offers.filter(asset => asset.active)}
                          delete={this.deleteOffer}
                        />
                      </Offers>
                      <Offers>
                        <AssetList
                          assets={assets.offers.filter(asset => !asset.active)}
                          delete={this.deleteOffer}
                        />
                      </Offers>
                    </React.Fragment>
                  ) : null
                }
                {
                  assets.requests && !isEmpty(assets.requests) ? (
                    <React.Fragment>
                      <Requests>
                        { 
                          !displayNewRequestForm && 
                          <AddRequestButton onClick={this.showNewRequestForm}>
                            +Create Request
                          </AddRequestButton> 
                        }
                        { 
                          displayNewRequestForm && 
                          <AddCard
                            createAsset={this.createRequest} 
                            cancel={this.hideNewRequestForm}
                            category="requests"
                          /> 
                        }
                        <AssetList
                          assets={assets.requests.filter(asset => asset.active)}
                          delete={this.deleteRequest}
                        />
                      </Requests>
                      <Requests>
                        <AssetList
                          assets={assets.requests.filter(asset => !asset.active)}
                          delete={this.deleteRequest}
                        />
                      </Requests>
                    </React.Fragment>
                  ) : null
                }
              </AssetsWrapper>
            )
          }
        </Data>
        <LoginModal
          auth={this.auth}
          show={isEmpty(user)}
          loading={loading}
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

const AddOfferButton = styled.button`

`

const AddRequestButton = styled.button`

`