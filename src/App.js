import React from 'react';
import { Switch, BrowserRouter as Router, Route, Redirect } from 'react-router-dom';
import Wallet from './screens/Wallet';
import SendTokens from './screens/SendTokens';
import Navigation from './components/Navigation';
import TransactionDetail from './screens/TransactionDetail';
import Server from './screens/Server';
import Signin from './screens/Signin';
import NewWallet from './screens/NewWallet';
import LoadWallet from './screens/LoadWallet';
import VersionError from './screens/VersionError';
import { historyUpdate, voidedTx, winnerTx } from "./actions/index";
import helpers from './utils/helpers';
import version from './utils/version';
import wallet from './utils/wallet';
import { connect } from "react-redux";
import WebSocketHandler from './WebSocketHandler';
import RequestErrorModal from './components/RequestError';


const mapDispatchToProps = dispatch => {
  return {
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

    if (helpers.isServerChosen()) {
      version.checkVersion();
    }

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
    if (this.props.isVersionAllowed === undefined && helpers.isServerChosen()) {
      // Waiting for version
      return null;
    } else if (this.props.isVersionAllowed === false) {
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
            <NoServerRoute exact path="/server" component={Server} />
            <NotLoadedRoute exact path="" component={Signin} />
          </Switch>
        </Router>
      )
    }
  }
}

/*
 * No server route is used for components that should be rendered before the server is chosen (without server)
 * So we first check if the server is chosen, if it is, we redirect to the Signin screen
 */
const NoServerRoute = ({ component: Component, ...rest }) => {
  return (
    <Route {...rest} render={(props) => (
      helpers.isServerChosen()
        ? <Redirect to={{pathname: '/'}} />
        : returnDefaultComponent(Component, props)
    )} />
  )
}

/*
 * Loaded routes are the routes that should be loaded only if the wallet is already loaded
 * So we first check if the wallet is loaded, if it's not we redirect to the Signin screen
 * If the server is not chosen we redirect to the screen to choose the server
 */
const LoadedRoute = ({ component: Component, ...rest }) => (
  <Route {...rest} render={(props) => (
    helpers.isServerChosen()
      ? (wallet.loaded()
        ? returnDefaultComponent(Component, props)
        : <Redirect to={{pathname: '/'}} />)
      : <Redirect to={{pathname: '/server/'}} />
  )} />
)

/*
 * Not loaded routes are the routes that should be loaded only if the wallet is not already loaded
 * So we first check if the wallet is loaded, if it is we redirect to the Wallet screen
 * If the server is not chosen we redirect to the screen to choose the server
 */
const NotLoadedRoute = ({ component: Component, ...rest }) => (
  <Route {...rest} render={(props) => (
    helpers.isServerChosen()
      ? (wallet.loaded()
        ? <Redirect to={{pathname: '/wallet/'}} />
        : returnDefaultComponent(Component, props))
      : <Redirect to={{pathname: '/server/'}} />
  )} />
)

/*
 * Return a div grouping the Navigation and the Component
 */
const returnDefaultComponent = (Component, props) => {
  return (
    <div className="component-div"><Navigation {...props}/><Component {...props} /><RequestErrorModal {...props} /></div>
  );
}

/*
 * Return a component with the navigation component
 */
const NavigationRoute = ({ component: Component, ...rest }) => (
  <Route {...rest} render={(props) => (
    helpers.isServerChosen()
      ? returnDefaultComponent(Component, props)
      : <Redirect to={{pathname: '/server/'}} />
  )} />
)

export default connect(mapStateToProps, mapDispatchToProps)(Root);
