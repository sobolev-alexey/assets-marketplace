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
import Loading from '../components/loading';

export const UserContext = React.createContext({});

class Order extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      assets: {
        offers: [],
        requests: []
      },
      user: {},
      loading: false,
      selectedOffer: null,
      selectedRequest: null
    };

    this.checkLogin = this.checkLogin.bind(this);
    this.auth = this.auth.bind(this);
    this.getUser = this.getUser.bind(this);
    this.findMatchingAssets = this.findMatchingAssets.bind(this);
    this.logout = this.logout.bind(this);
    this.onSelect = this.onSelect.bind(this);
    this.completeOrder = this.completeOrder.bind(this);
    this.notificationCallback = this.notificationCallback.bind(this);
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

  onSelect(event) {
    if (event.target && event.target.name) {
      const category = event.target.name;
      if (category === 'offers') {
        this.setState({ selectedOffer: event.target.id });
      } else if (category === 'requests') {
        this.setState({ selectedRequest: event.target.id });
      }
    }
  }

  completeOrder() {
    const { assets } = this.state;

    if (!isEmpty(assets.ownAsset)) {
      if (assets.ownAsset.category === 'requests') {
        this.setState({ selectedRequest: assets.ownAsset.assetId });
      } else if (assets.ownAsset.category === 'offers') {
        this.setState({ selectedOffer: assets.ownAsset.assetId });
      }
    }

    if (this.state.selectedOffer && this.state.selectedRequest) {
      this.setState({ loading: true });
      return new Promise(async (resolve) => {
        const packet = {
          apiKey: this.props.userData.apiKey,
          offerId: this.state.selectedOffer, 
          requestId: this.state.selectedRequest
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

  render() {
    const { assets, user, loading } = this.state;
    const { userData } = this.props;

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
              <AssetsWrapper>
                <Heading>Selected Asset</Heading>
                {
                  assets.ownAsset && !isEmpty(assets.ownAsset) ? (
                    <AssetCard asset={assets.ownAsset} />
                  ) : null
                }
                <Button onClick={this.completeOrder}>Complete Order</Button>
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
                        onSelect={this.onSelect}
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
                        onSelect={this.onSelect}
                      />
                    </Requests>
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