import React, { Component } from 'react';
import { connect } from 'react-redux';
import { HashRouter, Switch, Route } from 'react-router-dom';
import HomePage from './pages/home';
import MarketplacePage from './pages/marketplace';
import DashboardPage from './pages/dashboard';
import DealPage from './pages/deal';
import TransactionHistoryPage from './pages/history';
import { storeProjectSettings } from './store/settings/actions';

class Router extends Component {
  componentDidMount() {
    this.props.storeProjectSettings();
  }

  render() {
    return (
      <HashRouter>
        <Switch>
          <Route path="/" component={HomePage} exact />
          <Route path="/marketplace" component={MarketplacePage} />
          <Route path="/dashboard" component={DashboardPage} />
          <Route path="/deal/:assetId" component={DealPage} />
          <Route path="/history/:assetId" component={TransactionHistoryPage} />
          <Route component={HomePage} />
        </Switch>
      </HashRouter>
    );
  }
}

const mapDispatchToProps = dispatch => ({
  storeProjectSettings: () => dispatch(storeProjectSettings()),
});

export default connect(null, mapDispatchToProps)(Router);
