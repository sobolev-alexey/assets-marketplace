import React from 'react';
import styled from 'styled-components';
import isEmpty from 'lodash-es/isEmpty';
import { Link, withRouter } from 'react-router-dom';

const HeaderWrapper = ({ history, logout, user, createOffer, createRequest }) => (
  <Main>
    <Back to={'/'} onClick={history.goBack}>
      <img src="/static/icons/icon-arrow-back-dark.svg" alt="Icon arrow" />
    </Back>

    <Header>
      <Block>
        <Desc>Owner:</Desc>
        <AssetID>{user.displayName || '--'}</AssetID>
      </Block>
    </Header>
    <RightHeader createOffer={createOffer}>
      {
        createOffer && createRequest ? (
          <ButtonWrapper>
            <Button onClick={createOffer}>Create offer</Button>
            <Button onClick={createRequest}>Create request</Button>
          </ButtonWrapper>
        ) : null
      }
      {
        !isEmpty(user) && <Logout onClick={logout}>Log Out</Logout>
      }
    </RightHeader>
  </Main>
);

export default withRouter(HeaderWrapper);

const Main = styled.nav`
  display: flex;
  justify-content: space-between;
  align-items: center;
  position: relative;
  z-index: 1000;
  height: 100px;
  background-color: #fff;
  @media (max-width: 1195px) {
    height: 90px;
  }
  @media (max-width: 760px) {
    height: 66px;
  }
`;

const Header = styled.header`
  margin: 10px auto 0 30px;
  display: flex;
`;

const Back = styled(Link)`
  display: flex;
  justify-content: center;
  height: 100%;
  width: 90px;
  cursor: pointer;
  border-right: 1px solid #eaecee;
  @media (max-width: 760px) {
    width: 46px;
    border: none;
  }
`;

const Desc = styled.span`
  font: 12px/16px 'Nunito Sans', sans-serif;
  color: #808b92;
`;

const AssetID = styled.span`
  font-size: 24px;
  line-height: 42px;
  position: relative;
  top: -4px;
  color: #009fff;
  @media (max-width: 760px) {
    font-size: 15px;
    top: -4px;
  }
`;

const RightHeader = styled.div`
  margin: 0 30px;
  display: block;
  width: ${props => (props.createOffer ? '500px' : '150px')};
  text-align: right;
  display: flex;
  flex-direction: row;
  justify-content: space-evenly;
  @media (max-width: 760px) {
    margin: 10px 20px 0 30px;
    width: 120px;
  }
`;

const Block = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
`;

const Logout = styled.button`
  color: #009fff;
  padding: 9px 21px;
  font-size: 16px;
  height: 46px;
  background: transparent;
  border: 1px solid #009fff;
  border-radius: 50px;
  margin: 1px -15px 1px 0;

  &:hover {
    color: #ffffff;
    background-color: #009fff;
    border: none;
  }
`;

const ButtonWrapper = styled.div`
  display: flex;
  flex-direction: row;
  align-items: flex-start;
`;

const Button = styled.button`
  -webkit-appearance: none;
  -moz-appearance: none;
  appearance: none;
  font: 15px 'Nunito Sans', sans-serif;
  letter-spacing: 0.47px;
  padding: 20px 38px;
  border-radius: 100px;
  color: #fff;
  font-size: 16px;
  letter-spacing: 0.38px;
  padding: 12px 21px;
  margin: 1px 13px 0;
  font-weight: 700;
  background-color: #009fff;
  width: 160px;

  &:hover {
    color: #009fff;
    background-color: #ffffff;
    border: 1px solid #009fff;
  }
`;