import React, { useContext } from 'react';
import styled from 'styled-components';
import isEmpty from 'lodash-es/isEmpty';
import { UserContext } from '../../pages/marketplace';

export default props => {
  const { owner } = useContext(UserContext);
  return (
    <Card
      data-component="AssetCard"
      disableMargin={props.disableMargin}
      ownAsset={owner && props.asset && !isEmpty(props.asset) && owner === props.asset.owner}
    >
      {props.header ? <CardHeader>{props.header}</CardHeader> : null}
      {props.children}
      {props.footer ? <CardFooter>{props.footer}</CardFooter> : null}
    </Card>
  );
}

const Card = styled.div`
  color: inherit;
  text-decoration: none;
  position: relative;
  padding-top: 20px;
  margin-right: ${props => (props.disableMargin ? 0 : '50px')};
  border-radius: 6px;
  margin-bottom: ${props => (props.disableMargin ? 0 : '40px')};
  background-color: #fff;
  cursor: default;
  transition: box-shadow 0.19s ease-out;
  width: 400px;
  height: 100%;
  border: ${props => (props.ownAsset ? '1px solid #009fff' : '1px solid #eaecee')};
  @media (max-width: 1120px) {
    margin-bottom: ${props => (props.disableMargin ? 0 : '20px')};
  }
  @media (max-width: 890px) {
    width: 100%;
  }
  @media (max-width: 400px) {
    width: 280px;
  }
  &:hover {
    box-shadow: 0 23px 50px 0 rgba(25, 54, 80, 0.1);
  }
`;

const CardHeader = styled.header`
  position: relative;
  padding: 0 30px 8px 30px;
  border-bottom: 1px solid #eaecee;
`;

const CardFooter = styled.footer`
  padding: 20px 30px;
  background-color: rgba(206, 218, 226, 0.2);
  border-top: 1px solid #eaecee;
  cursor: default;
`;
