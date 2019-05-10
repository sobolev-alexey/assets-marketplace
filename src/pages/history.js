import React, { useState } from 'react';
import { connect } from 'react-redux';
import isEmpty from 'lodash-es/isEmpty';
import styled from 'styled-components';
import firebase from 'firebase/app';
import ReactTable from 'react-table';
import Clipboard from 'react-clipboard.js';
import 'react-table/react-table.css';
import { loadUser, logout } from '../store/user/actions';
import api from '../utils/api';
import AssetNav from '../components/asset-nav';
import LoginModal from '../components/login-modal';
import Sidebar from '../components/user-sidebar';
import Loading from '../components/loading';

export const UserContext = React.createContext({});

const mamExplorerLink = 'https://mam-explorer.firebaseapp.com/?mode=restricted';
 
const AdditionalInfo = ({ channelDetails, provider }) => {
  const [message, setMessage] = useState('');

  let link = `${mamExplorerLink}&provider=${encodeURIComponent(provider)}`;
  link += `&root=${channelDetails.root}`;
  link += `&key=${channelDetails.secretKey}`;

  function alert(text) {
    setMessage(text);
    setTimeout(() => setMessage(''), 1500);
  };

  return (
    <TransactionDataWrapper>
      <Clipboard
        style={{ background: 'none', display: 'block' }}
        data-clipboard-text={channelDetails.root}
        onSuccess={() => alert('Successfully Copied')}
      >
        <Text>Transaction root: {' '}</Text>
        <CopyBox>
          {channelDetails.root && `${channelDetails.root.substr(0, 20)}...`}
        </CopyBox>
      </Clipboard>
      <Clipboard
        style={{ background: 'none', display: 'block' }}
        data-clipboard-text={channelDetails.secretKey}
        onSuccess={() => alert('Successfully Copied')}
      >
        <Text>Transaction encryption key: {' '}</Text>
        <CopyBox>
          {channelDetails.secretKey && `${channelDetails.secretKey.substr(0, 20)}...`}
        </CopyBox>
      </Clipboard>
      <Alert message={message}>{message}</Alert>
      <ExternalLink
        href={link}
        target="_blank"
        rel="noopener noreferrer"
      >
        Verify raw transaction data from the Tangle
      </ExternalLink>
    </TransactionDataWrapper>
  )
}
class History extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      transactions: [],
      user: {},
      loading: false,
      historyObject: {},
      total: 0
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
    await this.getHistory(assetId);
  };

  async getHistory(assetId) {
    const { userData } = this.props;
    this.setState({ loading: true });
    const historyObject = await api.get('history', { assetId, apiKey: userData.apiKey });
    if (!isEmpty(historyObject) && historyObject.success) {
      const transactions = {}
      historyObject.orders.slice(1).forEach(entry => {
        transactions[entry.orderId] = entry;
      });
      const total = Object.values(transactions).reduce((acc, entry) => { 
        return !entry.cancelled ? (acc + Number(entry.price)) : acc;
      }, 0); 

      this.setState({ total, historyObject, transactions: Object.values(transactions), loading: false });
    } else {
      this.setState({ loading: false });
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

  getStatus(order) {
    if (order.cancelled) return 'cancelled';
    if (order.endTimestamp < Date.now()) return 'expired';
    return 'active';
  }

  render() {
    const { user, loading, historyObject, transactions, total } = this.state;
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
              <Wrapper>
                {
                  !isEmpty(historyObject) && historyObject.orders.length > 1 ? (
                    <TotalRevenue>Total revenue: {total}</TotalRevenue>
                  ) : (
                    <TotalRevenue>No transactions found for selected asset</TotalRevenue>
                  )
                }
                <TransactionsOuterWrapper>
                  {
                    !isEmpty(historyObject) && historyObject.orders.length > 1 ? (
                      <ReactTable
                        data={transactions}
                        columns={[
                          {
                            Header: "Start Time",
                            accessor: "startDate"
                          },
                          {
                            Header: "End Time",
                            accessor: d => (d.endDate || d.cancellationDate),
                            id: "endDate",
                          },
                          {
                            Header: "Price",
                            accessor: "price"
                          },
                          {
                            Header: "Status",
                            id: "status",
                            accessor: this.getStatus,
                          }
                        ]}
                        defaultPageSize={10}
                        style={{
                          backgroundColor: 'white',
                          width: '100%',
                          height: 400 // This will force the table body to overflow and scroll, since there is not enough room
                        }}
                        className="-striped -highlight"
                      />
                    ) : null
                  }
                </TransactionsOuterWrapper>
                {
                  !isEmpty(historyObject) && historyObject.orders.length > 1 ? (
                    <AdditionalInfo
                      channelDetails={historyObject.channelDetails} 
                      provider={this.props.settings.provider} 
                    />
                  ) : null
                }
              </Wrapper>
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
  settings: state.settings,
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
  height: 100vh;
`;

const Wrapper = styled.div`
  display: flex;
  flex-direction: column;
  width: 100%;
  margin: 50px;
`;

const TransactionsOuterWrapper = styled.div`
  display: flex;
  flex-direction: row;
  justify-content: center;
  margin: 50px 0;
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

const Text = styled.span`
  font-size: 16px;
  line-height: 32px;
  color: #ffffff;
`;

const ExternalLink = styled.a`
  font-size: 16px;
  line-height: 32px;
  color: #ffffff;
`;

const TransactionDataWrapper = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
`;

const Alert = styled.span`
  font-size: 16px;
  line-height: 32px;
  color: #ffffff;
  opacity: ${props => (props.message ? 1 : 0)};
  transition: all 0.5s ease;
`;

const CopyBox = styled(Text)`
  text-align: left;
  cursor: pointer;
  transition: all 0.3s ease;
  &:hover {
    opacity: 0.6;
  }
`;

const TotalRevenue = styled.h3`
  text-align: left;
  font-size: 22px;
  line-height: 32px;
  color: #ffffff;
`;