import React from 'react';
import styled from 'styled-components';
import Clipboard from 'react-clipboard.js';
// import isEmpty from 'lodash-es/isEmpty';
import Wallet from '../wallet';

class UserSidebar extends React.Component {
  constructor(props) {
    super(props);
    this.state = { message: '' };
    this.alert = this.alert.bind(this);
  }

  alert(text) {
    this.setState({ message: text }, () =>
      setTimeout(() => this.setState({ message: '' }), 1500)
    );
  };

  render() {
    const { user, userData } = this.props;
    const { message } = this.state;

    return (
      <Sidebar>
        {userData && (
          <Details>
            <DetailRow>
              <DetailKey>Your API Key:</DetailKey>
              <Clipboard
                style={{ background: 'none', display: 'block' }}
                data-clipboard-text={userData.apiKey}
                onSuccess={() => this.alert('Successfully Copied')}
              >
                <CopyBox>
                  {userData.apiKey ? `${userData.apiKey.substr(0, 20)}...` : '--'}
                </CopyBox>
              </Clipboard>
            </DetailRow>
            <DetailRow>
              <DetailKey>Your User ID:</DetailKey>
              <Clipboard
                style={{ background: 'none', display: 'block' }}
                data-clipboard-text={user.uid}
                onSuccess={() => this.alert('Successfully Copied')}
              >
                <CopyBox>{user.uid && `${user.uid.substr(0, 18)}...`}</CopyBox>
              </Clipboard>
            </DetailRow>
            <Alert message={message}>{message}</Alert>
          </Details>
        )}
        <Details>
          <DetailRow>
            <Wallet />
          </DetailRow>
        </Details>
        <Details>
          <DetailRow>
            <a
              href={'/static/docs/index.html'}
              target="_blank"
              rel="noopener noreferrer"
            >
              <DetailValue>View the API documentation</DetailValue>
            </a>
          </DetailRow>
        </Details>
      </Sidebar>
    );
  }
}

export default UserSidebar;

const Sidebar = styled.aside`
  background: rgba(240, 240, 240, 1);
  display: flex;
  flex-flow: column nowrap;
  align-items: center;
  min-width: 350px;
  width: 350px;
  padding: 40px 0 0 0;
  z-index: 1;
`;

const Details = styled.div`
  width: 230px;
  position: relative;
  padding-bottom: 30px;
  margin-bottom: 30px;
  @media (max-width: 760px) {
    width: 100%;
  }
  &::before {
    content: '';
    position: absolute;
    right: -30px;
    bottom: 0;
    height: 1px;
    width: 100vw;
    background-color: rgba(115, 143, 212, 0.15);
  }
`;

// const Label = styled.label`
//   font-size: 14px;
//   font-weight: 800;
//   letter-spacing: 0.41px;
//   position: relative;
//   display: block;
//   margin: 0 0 30px;
//   cursor: pointer;
//   text-transform: uppercase;
//   color: #595959ff;
// `;

const DetailRow = styled.div`
  @media (max-width: 760px) {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
`;

const DetailKey = styled.p`
  font-size: 12px;
  line-height: 16px;
  color: #738fd4;
`;

const DetailValue = styled.p`
  font-size: 16px;
  line-height: 32px;
  color: #595959ff;
`;

const Alert = styled.span`
  font-size: 16px;
  line-height: 32px;
  color: #595959;
  opacity: ${props => (props.message ? 1 : 0)};
  transition: all 0.5s ease;
`;

const CopyBox = styled(DetailValue)`
  cursor: pointer;
  transition: all 0.3s ease;
  &:hover {
    opacity: 0.6;
  }
`;

