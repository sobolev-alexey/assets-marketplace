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
import AssetList from '../components/asset-list/deal-page';
import Loading from '../components/loading';

export const UserContext = React.createContext({});

class History extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      transactions: [],
      user: {},
      loading: false
    };

    this.checkLogin = this.checkLogin.bind(this);
    this.auth = this.auth.bind(this);
    this.getUser = this.getUser.bind(this);
    this.logout = this.logout.bind(this);
    this.getHistory = this.getHistory.bind(this);
  }

  async componentWillReceiveProps(nextProps) {
    const { match: { params: { assetId } } } = nextProps;
    if (this.props.match.params.assetId !== assetId) {
      await this.getHistory(assetId);
    }
  }

  async componentDidMount() {
    ReactGA.pageview('/history');
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
    await this.getHistory(assetId);
  };

  async getHistory(assetId) {
    const { userData } = this.props;
    this.setState({ loading: true });
    const transactions = await api.post('history', { assetId, apiKey: userData.apiKey });
    console.log('history', transactions);
    return this.setState({ transactions, loading: false });
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
    const { user, loading, transactions } = this.state;
    const { userData } = this.props;

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
              <TransactionsWrapper>
                {
                  transactions && transactions.length > 1 ? (
                    <AssetList
                      assets={transactions}
                      category="offers"
                      onSelect={this.onSelect}
                    />
                  ) : null
                }
              </TransactionsWrapper>
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
)(History);

const Main = styled.main`
  width: 100vw;
  height: 100vh;
`;

const TransactionsWrapper = styled.div`
  display: flex;
  flex-direction: column;
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
