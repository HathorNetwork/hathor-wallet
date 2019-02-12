import React from 'react';
import { Switch, BrowserRouter as Router, Route, Redirect } from 'react-router-dom';
import Wallet from './screens/Wallet';
import SendTokens from './screens/SendTokens';
import Navigation from './components/Navigation';
import TransactionDetail from './screens/TransactionDetail';
import Signin from './screens/Signin';
import NewWallet from './screens/NewWallet';
import LoadWallet from './screens/LoadWallet';
import VersionError from './screens/VersionError';
import versionApi from './api/version';
import { isVersionAllowedUpdate, historyUpdate, voidedTx, winnerTx } from "./actions/index";
import helpers from './utils/helpers';
import wallet from './utils/wallet';
import transaction from './utils/transaction';
import { connect } from "react-redux";
import WebSocketHandler from './WebSocketHandler';


const mapDispatchToProps = dispatch => {
  return {
    isVersionAllowedUpdate: data => dispatch(isVersionAllowedUpdate(data)),
    historyUpdate: data => dispatch(historyUpdate(data)),
    winnerTx: data => dispatch(winnerTx(data)),
    voidedTx: data => dispatch(voidedTx(data)),
  };
};


const mapStateToProps = (state) => {
  return { isVersionAllowed: state.isVersionAllowed };
};


class Root extends React.Component {
  componentDidMount() {
    WebSocketHandler.on('wallet', this.handleWebsocket);
    WebSocketHandler.on('storage', this.handleWebsocketStorage);

    versionApi.getVersion().then((data) => {
      this.props.isVersionAllowedUpdate({allowed: helpers.isVersionAllowed(data.version)});
      transaction.updateTransactionWeightConstants(data.min_weight, data.min_tx_weight_coefficient);
    }, (e) => {
      // Error in request
      console.log(e);
    });

    this.loadedData = wallet.localStorageToRedux();
  }

  componentWillUnmount() {
    WebSocketHandler.removeListener('wallet', this.handleWebsocket);
    WebSocketHandler.removeListener('storage', this.handleWebsocketStorage);
  }

  handleWebsocket = (wsData) => {
    if (wallet.loaded()) {
      // We are still receiving lot of ws messages that are destined to the admin-frontend and not this wallet
      // TODO separate those messages
      if (wsData.type === 'wallet:address_history') {
        this.props.historyUpdate([{address: wsData.address, history: [wsData.history]}]);
      } else {
        console.log('Websocket message not handled. Type:', wsData.type);
      }
    }
  }

  handleWebsocketStorage = (wsData) => {
    if (wallet.loaded()) {
      // We are still receiving lot of ws messages that are destined to the admin-frontend and not this wallet
      // TODO separate those messages
      if (wsData.type === 'storage:tx_voided') {
        this.props.voidedTx(wsData);
      } else if (wsData.type === 'storage:tx_winner') {
        this.props.winnerTx(wsData);
      } else {
        console.log('Websocket message not handled. Type:', wsData.type);
      }
    }
  }

  render() {
    if (this.props.isVersionAllowed === undefined) {
      // Waiting for version
      return null;
    } else if (!this.props.isVersionAllowed) {
      return <VersionError />;
    } else {
      return (
        <Router>
          <Switch>
            <LoadedRoute exact path="/wallet/send_tokens" component={SendTokens} />
            <LoadedRoute exact path="/wallet" component={Wallet} />
            <NavigationRoute exact path="/transaction/:id" component={TransactionDetail} />
            <NotLoadedRoute exact path="/new_wallet" component={NewWallet} />
            <NotLoadedRoute exact path="/load_wallet" component={LoadWallet} />
            <NotLoadedRoute exact path="" component={Signin} />
          </Switch>
        </Router>
      )
    }
  }
}

/*
 * Loaded routes are the routes that should be loaded only if the wallet is already loaded
 * So we first check if the wallet is loaded, if it's not we redirect to the Signin screen
 */
const LoadedRoute = ({ component: Component, ...rest }) => (
  <Route {...rest} render={(props) => (
    wallet.loaded()
      ? returnDefaultComponent(Component, props)
      : <Redirect to={{pathname: '/'}} />
  )} />
)

/*
 * Not loaded routes are the routes that should be loaded only if the wallet is not already loaded
 * So we first check if the wallet is loaded, if it is we redirect to the Wallet screen
 */
const NotLoadedRoute = ({ component: Component, ...rest }) => (
  <Route {...rest} render={(props) => (
    wallet.loaded()
      ? <Redirect to={{pathname: '/wallet/'}} />
      : returnDefaultComponent(Component, props)
  )} />
)

/*
 * Return a div grouping the Navigation and the Component
 */
const returnDefaultComponent = (Component, props) => {
  return (
    <div className="component-div"><Navigation {...props}/><Component {...props} /></div>
  );
}

/*
 * Return a component with the navigation component
 */
const NavigationRoute = ({ component: Component, ...rest }) => (
  <Route {...rest} render={(props) => (
      <div className="component-div"><Navigation {...props}/><Component {...props} /></div>
  )} />
)

export default connect(mapStateToProps, mapDispatchToProps)(Root);
