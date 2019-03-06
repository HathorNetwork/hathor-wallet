import React from 'react';
import { Switch, BrowserRouter as Router, Route, Redirect } from 'react-router-dom';
import Wallet from './screens/Wallet';
import SendTokens from './screens/SendTokens';
import Navigation from './components/Navigation';
import WaitVersion from './components/WaitVersion';
import TransactionDetail from './screens/TransactionDetail';
import Server from './screens/Server';
import ChoosePassphrase from './screens/ChoosePassphrase';
import Welcome from './screens/Welcome';
import Signin from './screens/Signin';
import LockedWallet from './screens/LockedWallet';
import NewWallet from './screens/NewWallet';
import Settings from './screens/Settings';
import LoadWallet from './screens/LoadWallet';
import VersionError from './screens/VersionError';
import { historyUpdate, voidedTx, winnerTx } from "./actions/index";
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
    return (
      <Router>
        <Switch>
          <StartedRoute exact path="/wallet/send_tokens" component={SendTokens} loaded={true} versionAllowed={this.props.isVersionAllowed} />
          <StartedRoute exact path="/wallet" component={Wallet} loaded={true} versionAllowed={this.props.isVersionAllowed} />
          <StartedRoute exact path="/settings" component={Settings} loaded={true} versionAllowed={this.props.isVersionAllowed} />
          <StartedRoute exact path="/wallet/passphrase" component={ChoosePassphrase} loaded={true} versionAllowed={this.props.isVersionAllowed} />
          <StartedRoute exact path="/new_wallet" component={NewWallet} loaded={false} />
          <StartedRoute exact path="/load_wallet" component={LoadWallet} loaded={false} />
          <StartedRoute exact path="/signin" component={Signin} loaded={false} />
          <NavigationRoute exact path="/server" component={Server} />
          <NavigationRoute exact path="/transaction/:id" component={TransactionDetail} />
          <NavigationRoute exact path="/locked" component={LockedWallet} />
          <Route exact path="/welcome" component={Welcome} />
          <StartedRoute exact path="" component={Wallet} loaded={true} versionAllowed={this.props.isVersionAllowed} />
        </Switch>
      </Router>
    )
  }
}

/*
 * Validate if version is allowed for the loaded wallet
 */
const returnLoadedWalletComponent = (Component, props, rest) => {
  // Check version
  if (rest.versionAllowed === undefined) {
    version.checkVersion(() => {
      wallet.localStorageToRedux();
    });
    return <WaitVersion {...props} />;
  } else if (rest.versionAllowed === false) {
    return <VersionError {...props} />;
  } else {
    // If was closed and is loaded we need to redirect to locked screen
    if (wallet.wasClosed()) {
      return <Redirect to={{pathname: '/locked/'}} />;
    } else {
      return returnDefaultComponent(Component, props);
    }
  }
}

/*
 * If not started, go to welcome screen. If loaded and locked, go to locked screen. If started, we have some options:
 * - If wallet is already loaded and the component requires it's loaded, we show the component.
 * - If wallet is already loaded and the component requires it's not loaded, we go to the wallet detail screen.
 * - If wallet is not loaded and the component requires it's loaded, we go to the signin screen.
 * - If wallet is not loaded and the component requires it's not loaded, we show the component.
 */
const returnStartedRoute = (Component, props, rest) => {
  if (wallet.started()) {
    if (wallet.loaded()) {
      if (wallet.isLocked()) {
        return <Redirect to={{pathname: '/locked/'}} />;
      } else if (rest.loaded) {
        return returnLoadedWalletComponent(Component, props, rest);
      } else {
        return <Redirect to={{pathname: '/wallet/'}} />;
      }
    } else {
      if (rest.loaded) {
        return <Redirect to={{pathname: '/signin/'}} />;
      } else {
        return <Component {...props} />;
      }
    }
  } else {
    return <Redirect to={{pathname: '/welcome/'}} />;
  }
}

/*
 * Route for the components that will be shown after the wallet was started (After user clicked in 'Get started' in Welcome screen)
 */
const StartedRoute = ({component: Component, ...rest}) => (
  <Route {...rest} render={(props) => (
    returnStartedRoute(Component, props, rest)
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
      returnDefaultComponent(Component, props)
  )} />
)

export default connect(mapStateToProps, mapDispatchToProps)(Root);
