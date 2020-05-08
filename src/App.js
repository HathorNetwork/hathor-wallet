/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React from 'react';
import { Switch, Route, Redirect } from 'react-router-dom';
import Wallet from './screens/Wallet';
import SendTokens from './screens/SendTokens';
import CreateToken from './screens/CreateToken';
import Navigation from './components/Navigation';
import WaitVersion from './components/WaitVersion';
import TransactionDetail from './screens/TransactionDetail';
import LoadingAddresses from './screens/LoadingAddresses';
import Server from './screens/Server';
import ChoosePassphrase from './screens/ChoosePassphrase';
import CustomTokens from './screens/CustomTokens';
import Welcome from './screens/Welcome';
import SentryPermission from './screens/SentryPermission';
import UnknownTokens from './screens/UnknownTokens';
import Signin from './screens/Signin';
import LockedWallet from './screens/LockedWallet';
import NewWallet from './screens/NewWallet';
import WalletType from './screens/WalletType';
import SoftwareWalletWarning from './screens/SoftwareWalletWarning';
import Settings from './screens/Settings';
import LoadWallet from './screens/LoadWallet';
import Page404 from './screens/Page404';
import VersionError from './screens/VersionError';
import WalletVersionError from './screens/WalletVersionError';
import version from './utils/version';
import wallet from './utils/wallet';
import { connect } from "react-redux";
import RequestErrorModal from './components/RequestError';
import { dataLoaded, isOnlineUpdate, updateHeight } from "./actions/index";
import store from './store/index';
import createRequestInstance from './api/axiosInstance';
import hathorLib from '@hathor/wallet-lib';
import { DEFAULT_SERVER, IPC_RENDERER, VERSION } from './constants';
import { HybridStore } from './storage.js';
import ModalAlert from './components/ModalAlert';
import SoftwareWalletWarningMessage from './components/SoftwareWalletWarningMessage';
import AddressList from './screens/AddressList';

hathorLib.network.setNetwork('mainnet');
hathorLib.storage.setStore(new HybridStore());

// set default server
hathorLib.wallet.setDefaultServer(DEFAULT_SERVER);

const mapDispatchToProps = dispatch => {
  return {
    dataLoaded: (data) => dispatch(dataLoaded(data)),
    isOnlineUpdate: (data) => dispatch(isOnlineUpdate(data)),
  };
};

const mapStateToProps = (state) => {
  return {
    isVersionAllowed: state.isVersionAllowed,
    loadingAddresses: state.loadingAddresses,
  };
};

class Root extends React.Component {
  componentDidMount() {
    hathorLib.WebSocketHandler.on('wallet', this.handleWebsocket);
    hathorLib.WebSocketHandler.on('storage', this.handleWebsocketStorage);

    hathorLib.axios.registerNewCreateRequestInstance(createRequestInstance);

    hathorLib.WebSocketHandler.on('addresses_loaded', this.addressesLoadedUpdate);
    hathorLib.WebSocketHandler.on('is_online', this.isOnlineUpdate);
    hathorLib.WebSocketHandler.on('reload_data', this.reloadData);
    hathorLib.WebSocketHandler.on('height_updated', this.handleHeightUpdated);

    if (IPC_RENDERER) {
      // Event called when user quits hathor app
      IPC_RENDERER.on("ledger:closed", () => {
        if (hathorLib.wallet.loaded() && hathorLib.wallet.isHardwareWallet()) {
          hathorLib.wallet.lock();
          this.props.history.push('/wallet_type/');
        }
      });
    }
  }

  componentWillUnmount() {
    hathorLib.WebSocketHandler.removeListener('wallet', this.handleWebsocket);
    hathorLib.WebSocketHandler.removeListener('storage', this.handleWebsocketStorage);
    hathorLib.WebSocketHandler.removeListener('height_updated', this.handleHeightUpdated);

    hathorLib.WebSocketHandler.removeListener('addresses_loaded', this.addressesLoadedUpdate);
    hathorLib.WebSocketHandler.removeListener('is_online', this.isOnlineUpdate);
    hathorLib.WebSocketHandler.removeListener('reload_data', this.reloadData);

    if (IPC_RENDERER) {
      IPC_RENDERER.removeAllListeners("ledger:closed");
    }
  }

  handleWebsocket = (wsData) => {
    if (hathorLib.wallet.loaded()) {
      // We are still receiving lot of ws messages that are destined to the admin-frontend and not this wallet
      // TODO separate those messages
      if (wsData.type === 'wallet:address_history') {
        // If is a new transaction, we send a notification to the user, in case it's turned on
        // We only send the notification if the inputs are not generated from this wallet
        if (!hathorLib.wallet.txExists(wsData.history) && !hathorLib.wallet.areInputsMine(wsData.history)) {
          let message = '';
          if (hathorLib.helpers.isBlock(wsData.history)) {
            message = 'You\'ve found a new block! Click to open it.';
          } else {
            message = 'You\'ve received a new transaction! Click to open it.'
          }
          const notification = wallet.sendNotification(message);
          // Set the notification click, in case we have sent one
          if (notification !== undefined) {
            notification.onclick = () => {
              this.props.history.push(`/transaction/${wsData.history.tx_id}/`);
            }
          }
        }
        wallet.newAddressHistory(wsData.history);
      } else {
        console.log('Websocket message not handled. Type:', wsData.type);
      }
    }
  }

  handleWebsocketStorage = (wsData) => {
    if (hathorLib.wallet.loaded()) {
      // We are still receiving lot of ws messages that are destined to the admin-frontend and not this wallet
      // TODO separate those messages
      console.log('Websocket message not handled. Type:', wsData.type);
    }
  }

  /**
   * Method called when WebSocketHandler from lib emits a height_updated event
   * We update the height of the network in redux
   *
   * @param {number} height New height of the network
   */
  handleHeightUpdated = (height) => {
    store.dispatch(updateHeight({ height }));
  }

  /**
   * Method called when WebSocket receives a message after loading address history
   * We just check and save the version that was loaded and update redux data
   *
   * @param {Object} data Object with {'historyTransactions', 'addressesFound'}
   */
  addressesLoadedUpdate = (data) => {
    // Update the version of the wallet that the data was loaded
    hathorLib.storage.setItem('wallet:version', VERSION);

    // Update redux with loaded data
    store.dispatch(dataLoaded({ addressesFound: data.addressesFound, transactionsFound: Object.keys(data.historyTransactions).length }));
  }

  /**
   * Method called when WebSocket updates isOnline attribute, so we update this parameter in redux
   *
   * @param {boolean} data Boolean if websocket is online
   */
  isOnlineUpdate = (data) => {
    if (data) {
      // Check api version everytime we connect to the server
      version.checkApiVersion();
    }
    store.dispatch(isOnlineUpdate({ isOnline: data }));
  }

  /**
   * Method called when need to reload data when websocket reconnects
   */
  reloadData = (data) => {
    if (hathorLib.wallet.loaded() && !this.props.loadingAddresses) {
      wallet.reloadData();
    }
  }

  render() {
    return (
      <Switch>
        <StartedRoute exact path="/create_token" component={CreateToken} loaded={true} />
        <StartedRoute exact path="/custom_tokens" component={CustomTokens} loaded={true} />
        <StartedRoute exact path="/unknown_tokens" component={UnknownTokens} loaded={true} />
        <StartedRoute exact path="/wallet/send_tokens" component={SendTokens} loaded={true} />
        <StartedRoute exact path="/wallet" component={Wallet} loaded={true} />
        <StartedRoute exact path="/settings" component={Settings} loaded={true} />
        <StartedRoute exact path="/wallet/passphrase" component={ChoosePassphrase} loaded={true} />
        <StartedRoute exact path="/server" component={Server} loaded={true} />
        <StartedRoute exact path="/transaction/:id" component={TransactionDetail} loaded={true} />
        <StartedRoute exact path="/addresses" component={AddressList} loaded={true} />
        <StartedRoute exact path="/new_wallet" component={NewWallet} loaded={false} />
        <StartedRoute exact path="/load_wallet" component={LoadWallet} loaded={false} />
        <StartedRoute exact path="/wallet_type" component={WalletType} loaded={false} />
        <StartedRoute exact path="/software_warning" component={SoftwareWalletWarning} loaded={false} />
        <StartedRoute exact path="/signin" component={Signin} loaded={false} />
        <NavigationRoute exact path="/locked" component={LockedWallet} />
        <Route exact path="/welcome" component={Welcome} />
        <Route exact path="/loading_addresses" component={LoadingAddresses} />
        <Route exact path="/permission" component={SentryPermission} />
        <StartedRoute exact path="" component={Wallet} loaded={true} />
        <Route path="" component={Page404} />
      </Switch>
    )
  }
}

/*
 * Validate if version is allowed for the loaded wallet
 */
const returnLoadedWalletComponent = (Component, props, rest) => {
  // For server screen we don't need to check version
  const isServerScreen = props.match.path === '/server';
  const reduxState = store.getState();
  // Check version
  if (reduxState.isVersionAllowed === undefined && !isServerScreen) {
    const promise = version.checkApiVersion();
    promise.then(() => {
      wallet.localStorageToRedux();
    });
    return <WaitVersion {...props} />;
  } else if (reduxState.isVersionAllowed === false && !isServerScreen) {
    return <VersionError {...props} />;
  } else {
    // If was closed and is loaded we need to redirect to locked screen
    if (hathorLib.wallet.wasClosed()) {
      return <Redirect to={{ pathname: '/locked/' }} />;
    } else {
      if (reduxState.loadingAddresses && !isServerScreen) {
        // If wallet is still loading addresses we redirect to the loading screen
        return <Redirect to={{
          pathname: '/loading_addresses/',
          state: {path: props.match.url}
        }} />;
      } else {
        return returnDefaultComponent(Component, props);
      }
    }
  }
}

/*
 * If not started, go to welcome screen. If loaded and locked, go to locked screen. If started, we have some options:
 * - If wallet is already loaded and the component requires it's loaded, we show the component.
 * - If wallet is already loaded and the component requires it's not loaded, we go to the wallet detail screen.
 * - If wallet is not loaded and the component requires it's loaded, we go to the wallet type screen.
 * - If wallet is not loaded and the component requires it's not loaded, we show the component.
 */
const returnStartedRoute = (Component, props, rest) => {
  // On Windows the pathname that is being pushed into history has a prefix of '/C:'
  // So everytime I use 'push' it works, because I set the pathname
  // However when I use history.goBack, it gets the pathname from the history stack
  // So it does not find the path because of the prefix
  // Besides that, when electron loads initially it needs to load index.html from the filesystem
  // So the first load from electron get from '/C:/' in windows. That's why we need the second 'if'
  const pathname = rest.location.pathname;
  if (pathname.length > 3 && pathname.slice(0,4).toLowerCase() === '/c:/') {
    if (pathname.length > 11 && pathname.slice(-11).toLowerCase() !== '/index.html') {
      return <Redirect to={{pathname: pathname.slice(3)}} />;
    }
  }

  if (hathorLib.wallet.started()) {
    if (hathorLib.wallet.loaded()) {
      if (hathorLib.wallet.isLocked()) {
        return <Redirect to={{pathname: '/locked/'}} />;
      } else if (rest.loaded) {
        return returnLoadedWalletComponent(Component, props, rest);
      } else {
        return <Redirect to={{pathname: '/wallet/'}} />;
      }
    } else {
      if (rest.loaded) {
        // When the wallet is opened, the path that is called is '/', which currenctly redirects to the Wallet component
        // in that case, if the wallet is not loaded but it's started, it should redirect to the signin/wallet type screen
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
  if (version.checkWalletVersion()) {
    if (props.location.pathname === '/locked/' && hathorLib.wallet.isHardwareWallet()) {
      // This will redirect the page to Wallet Type screen
      wallet.cleanWallet();
      hathorLib.wallet.unlock();
      return <Redirect to={{ pathname: '/wallet_type/' }} />;
    } else {
      return (
        <div className="component-div">
          <Navigation {...props}/>
          <Component {...props} />
          <RequestErrorModal {...props} />
           {/* At first I added this ModalAlert in the Version component (where I think it should be)
             * however this component is inside the Navigation component, that has position fixed.
             * The bootstrap modal does not work fine inside a wrapper with position fixed
             * so the backdrop was being rendered above the modal.
             * That's why the best solution was to add this modal here (so I can use in all screens that have the Navigation)
             */}
          <ModalAlert title='Software wallet warning' body={<SoftwareWalletWarningMessage />} buttonName='Ok' id='softwareWalletWarningModal' />
        </div>
      );
    }
  } else {
    return <WalletVersionError {...props} />;
  }
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
