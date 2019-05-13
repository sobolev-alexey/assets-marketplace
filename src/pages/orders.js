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
      active: [],
      cancelled: [],
      expired: [],
      orders: 0,
      total: 0
    });
  }

  async getOrders() {
    const { userData } = this.props;
    this.setState({ loading: true });
    const result = await api.get('orders', { apiKey: userData.apiKey });
    const active= [];
    const cancelled= [];
    const expired= [];
    let total = 0;

    result.orders.forEach(order => {
      if (order.cancelled) {
        cancelled.push(order);
      } else if (order.endTimestamp < Date.now()) {
        expired.push(order);
        total += Number(order.price);
      } else {
        active.push(order);
        total += Number(order.price);
      }
    });

    return this.setState({ active, cancelled, expired, total, orders: result.orders.length, loading: false });
  };

  render() {
    const { user, loading, active, cancelled, expired, total, orders } = this.state;
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
            <Sidebar user={user} userData={userData} menu />
          </UserContext.Provider>
          {
            loading ? (
              <LoadingBox>
                <Loading />
              </LoadingBox>
            ) : (
              <OrderListWrapper>
                {
                  orders === 0 ? (
                    <SmallHeading>No orders found</SmallHeading>
                  ) : (
                    <React.Fragment>
                      <SmallHeading>Total revenue: {total}</SmallHeading>
                      {
                        active && active.length > 0 && <Heading>Active Orders</Heading>
                      }
                      {
                        active && active.length > 0 ? active.map(order => (
                          <OrderWrapper key={order.orderId}>
                            <AssetsWrapper>
                              <AssetCard asset={order.offer} disableMargin />
                              <AssetCard asset={order.request} disableMargin />
                            </AssetsWrapper>
                            <Button onClick={() => this.cancelOrder(order.orderId)}>Cancel order</Button>
                          </OrderWrapper>
                        )) : null
                      }
                      {
                        expired && expired.length > 0 && <Heading>Expired Orders</Heading>
                      }
                      {
                        expired && expired.length > 0 ? expired.map(order => (
                          <OrderWrapper key={order.orderId}>
                            <AssetsWrapper>
                              <AssetCard asset={order.offer} disableMargin />
                              <AssetCard asset={order.request} disableMargin />
                            </AssetsWrapper>
                          </OrderWrapper>
                        )) : null
                      }
                      {
                        cancelled && cancelled.length > 0 && <Heading>Cancelled Orders</Heading>
                      }
                      {
                        cancelled && cancelled.length > 0 ? cancelled.map(order => (
                          <OrderWrapper key={order.orderId}>
                            <AssetsWrapper>
                              <AssetCard asset={order.offer} disableMargin />
                              <AssetCard asset={order.request} disableMargin />
                            </AssetsWrapper>
                          </OrderWrapper>
                        )) : null
                      }
                    </React.Fragment>
                  )
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
  margin: 30px 40px;
  padding: 40px;
`

const AssetsWrapper = styled.div`
  display: flex;
  flex-direction: row;
  justify-content: space-between;

  & > div:first-child {
    margin-right: 40px;
  }
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
  margin: 40px 0 0;
  box-shadow: 0 10px 20px 0 #0a2056;
  font-weight: 700;
  background-color: #ac422f;
  border: 2px solid #ac422f;
  width: 160px;

  &:hover {
    color: #ac422f;
    background-color: #ffffff;
    border: 2px solid #ac422f;
  }
`;

const Heading = styled.h2`
  font-size: 2rem;
  font-weight: 300;
  color: #ffffff;
  padding-top: 50px;
  margin: 0 60px;
`;

const SmallHeading = styled.h3`
  text-align: left;
  font-size: 22px;
  font-weight: 300;
  line-height: 32px;
  color: #ffffff;
  padding-top: 50px;
  margin: 0 60px;
`;