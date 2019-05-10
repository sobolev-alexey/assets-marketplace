import React from 'react';
import { connect } from 'react-redux';
import isEmpty from 'lodash-es/isEmpty';
import styled from 'styled-components';
import firebase from 'firebase/app';
import { loadUser, logout } from '../store/user/actions';
import api from '../utils/api';
import AssetNav from '../components/asset-nav';
import AssetCard from '../components/card/asset';
import LoginModal from '../components/login-modal';
import Sidebar from '../components/user-sidebar';
import Loading from '../components/loading';
import Modal from '../components/modal';

export const UserContext = React.createContext({});
export const AssetContext = React.createContext({});

class Orders extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      user: {},
      orders: [],
      loading: false,
      showModal: false,
      notification: null,
      error: false,
    };

    this.checkLogin = this.checkLogin.bind(this);
    this.auth = this.auth.bind(this);
    this.getUser = this.getUser.bind(this);
    this.logout = this.logout.bind(this);
    this.getOrders = this.getOrders.bind(this);
    this.notificationCallback = this.notificationCallback.bind(this);
    this.cancelOrder = this.cancelOrder.bind(this);
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
    await this.getOrders();
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

  async cancelOrder(orderId) {
    const { userData } = this.props;
    console.log('cancelOrder', orderId);
    this.setState({ loading: true });
    const result = await api.post('cancel', { apiKey: userData.apiKey, orderId });
    console.log(result);
    await this.getOrders();
  }

  notificationCallback() {
    this.setState({       
      showModal: false,
      notification: null,
      error: false,
      assetDetails: {},
    });
  }

  async getOrders() {
    const { userData } = this.props;
    this.setState({ loading: true });
    const result = await api.get('orders', { apiKey: userData.apiKey });
    console.log(result.orders);
    return this.setState({ orders: result.orders, loading: false });
  };

  render() {
    const { user, loading, orders } = this.state;
    const { userData } = this.props;

    return (
      <Main>
        <AssetNav
          user={user} 
          logout={this.logout} 
          createOffer={this.showNewOfferForm}
          createRequest={this.showNewRequestForm}
        />
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
              <OrderListWrapper>
                {
                  orders && orders.length > 0 ? orders.map(order => (
                    <OrderWrapper key={order.orderId}>
                      <AssetsWrapper>
                        <AssetCard asset={order.offer} disableMargin />
                        <AssetCard asset={order.request} disableMargin />
                      </AssetsWrapper>
                      <Button onClick={() => this.cancelOrder(order.orderId)}>Cancel order</Button>
                    </OrderWrapper>
                  )) : null
                }
              </OrderListWrapper>
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
)(Orders);

const Main = styled.main`
  height: 100vh;
`;

const OrderListWrapper = styled.div`
  display: flex;
  flex-direction: column;
`

const OrderWrapper = styled.div`
  display: flex;
  flex-direction: column;
  border-radius: 15px;
  background-color: rgba(10, 32, 86, 0.9);
  align-items: center;
  margin: 30px 60px;
  padding: 40px;
`

const AssetsWrapper = styled.div`
  display: flex;
  flex-direction: row;
  justify-content: space-between;
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
  width: 160px;
`;

const Heading = styled.h2`
  font-size: 2rem;
  font-weight: 300;
  color: #ffffff;
  padding-top: 50px;
  margin: 0 40px;
`;

const Text = styled.h4`
  font-size: 1.3rem;
  font-weight: 300;
  color: #ffffff;
  padding: 20px 0;
`;
