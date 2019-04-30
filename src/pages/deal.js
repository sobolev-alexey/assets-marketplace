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

export const UserContext = React.createContext({});

class Deal extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      assets: {
        offers: [],
        requests: []
      },
      user: {},
      loading: false,
    };

    this.checkLogin = this.checkLogin.bind(this);
    this.auth = this.auth.bind(this);
    this.getUser = this.getUser.bind(this);
    this.findMatchingAssets = this.findMatchingAssets.bind(this);
    this.logout = this.logout.bind(this);
  }

  async componentWillReceiveProps(nextProps) {
    const { match: { params: { assetId } } } = nextProps;
    if (this.props.match.params.assetId !== assetId) {
      await this.findMatchingAssets(assetId);
    }
  }

  async componentDidMount() {
    ReactGA.pageview('/deal');
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

  render() {
    const { assets, user, loading } = this.state;
    const { userData } = this.props;

    return (
      <Main>
        <Cookie />
        <AssetNav user={user} logout={this.logout} />
        <Data>
          {
            (assets.offers && !isEmpty(assets.offers)) || 
            (assets.requests && !isEmpty(assets.requests)) ? (
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
                    <Offers>
                      <AssetList
                        assets={assets.offers.filter(asset => asset && asset.active)}
                        delete={this.deleteOffer}
                      />
                    </Offers>
                  ) : null
                }
                {
                  assets.requests && !isEmpty(assets.requests) ? (
                    <Requests>
                      <AssetList
                        assets={assets.requests.filter(asset => asset && asset.active)}
                        delete={this.deleteRequest}
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
)(Deal);

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