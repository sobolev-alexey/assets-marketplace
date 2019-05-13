import React from 'react';
import styled from 'styled-components';
import { withRouter } from 'react-router';
import BurgerMenu from '../components//header/burger';
import MiniHeader from '../components/header/mini-header';
import Header from '../components/header';
import Content from '../components/content';
import Partners from '../components/partners';
import Footer from '../components/footer';

const content1 = {
  id: 'about',
  text: `The IOTA-based Telco Infrastructure Marketplace is an initiative Championed by Orange and Vodafone as part of the <a href="https://www.tmforum.org/collaboration/catalyst-program/catalyst-program-benefits/">TMForum Catalyst Initiative</a>.
<br /><br />Aim of the marketplace is to demonstrate how DLTs can help to create an agile, secure and easy to access assets marketplace where CSPs can provide access to their network infrastructure on-demand and real-time to any Service Providers.`,
};

class HomePage extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      anchor: null,
    };

    this.onAnchorClick = this.onAnchorClick.bind(this);
  }

  componentDidMount() {
    const { location } = this.props;
    const anchor = (location.state && location.state.anchor) || null;
    this.setState({ anchor });
  }

  onAnchorClick(anchor) {
    this.setState({ anchor });
  }

  render() {
    const { anchor } = this.state;
    return (
      <Main id="main">
        <BurgerMenu />
        <MiniHeader />
        <Header onAnchorClick={this.onAnchorClick} />
        <Content content={content1} anchor={anchor} />
        <ImgContainer>
          <Image src="/static/illustrations/home1.png" alt="IOTA process illustration" />
        </ImgContainer>
        <Partners anchor={anchor || (this.props.location && this.props.location.hash)} />
        <Footer />
      </Main>
    );
  }
}

export default withRouter(HomePage);

const Main = styled.div`
  overflow-x: hidden;
  display: flex;
  flex-direction: column;
`;

const ImgContainer = styled.div`
  display: flex;
  justify-content: center;
  height: 100%;
`;

const Image = styled.img`
  height: 100%;
  padding: 10px 0;
  width: 500px;
  @media (max-width: 650px) {
    width: 350px;
  }
`;
