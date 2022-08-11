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
import CreateNFT from './screens/CreateNFT';
import Navigation from './components/Navigation';
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
import ChooseWallet from './screens/ChooseWallet';
import NewWallet from './screens/NewWallet';
import WalletType from './screens/WalletType';
import SoftwareWalletWarning from './screens/SoftwareWalletWarning';
import StartHardwareWallet from './screens/StartHardwareWallet';
import Settings from './screens/Settings';
import LoadWallet from './screens/LoadWallet';
import Page404 from './screens/Page404';
import VersionError from './screens/VersionError';
import WalletVersionError from './screens/WalletVersionError';
import version from './utils/version';
import wallet from './utils/wallet';
import tokens from './utils/tokens';
import { connect } from "react-redux";
import RequestErrorModal from './components/RequestError';
import store from './store/index';
import createRequestInstance from './api/axiosInstance';
import hathorLib from '@hathor/wallet-lib';
import { IPC_RENDERER, LEDGER_ENABLED } from './constants';
import STORE from './storageInstance';
import ModalAlert from './components/ModalAlert';
import SoftwareWalletWarningMessage from './components/SoftwareWalletWarningMessage';
import AddressList from './screens/AddressList';
import NFTList from './screens/NFTList';
import { updateLedgerClosed } from './actions/index';


hathorLib.storage.setStore(STORE);

const mapStateToProps = (state) => {
  return {
    isVersionAllowed: state.isVersionAllowed,
    loadingAddresses: state.loadingAddresses,
    ledgerClosed: state.ledgerWasClosed,
  };
};

const mapDispatchToProps = dispatch => {
  return {
    updateLedgerClosed: data => dispatch(updateLedgerClosed(data)),
  };
};

class Root extends React.Component {
  componentDidUpdate(prevProps) {
    // When Ledger device loses connection or the app is closed
    if (this.props.ledgerClosed && !prevProps.ledgerClosed) {
      wallet.removeHardwareWalletFromStorage();

      // If there are other wallets, go to screen to choose wallet
      const firstWallet = wallet.getFirstWalletPrefix();
      if (firstWallet) {
        wallet.setWalletPrefix(firstWallet);
        this.props.history.push('/choose_wallet');
      } else {
        wallet.setWalletPrefix(null);
        this.props.history.push('/wallet_type/');
      }
    }
  }

  componentDidMount() {
    hathorLib.axios.registerNewCreateRequestInstance(createRequestInstance);

    if (IPC_RENDERER) {
      // Event called when user quits hathor app
      IPC_RENDERER.on("ledger:closed", () => {
        if (hathorLib.wallet.loaded() && hathorLib.wallet.isHardwareWallet()) {
          this.props.updateLedgerClosed(true);
        }
      });

      IPC_RENDERER.on('ledger:manyTokenSignatureValid', (event, arg) => {
        if (hathorLib.wallet.isHardwareWallet()) {
          // remove all invalid signatures
          // arg.data is a list of uids with invalid signatures
          arg.data.forEach(uid => {
            tokens.removeTokenSignature(uid.toString('hex'));
          });
        }
      });
    }
  }

  componentWillUnmount() {
    if (IPC_RENDERER) {
      IPC_RENDERER.removeAllListeners("ledger:closed");
      IPC_RENDERER.removeAllListeners("ledger:manyTokenSignatureValid");
    }
  }

  render() {
    return (
      <Switch>
        <StartedRoute exact path="/nft" component={NFTList} loaded={true} />
        <StartedRoute exact path="/create_token" component={CreateToken} loaded={true} />
        <StartedRoute exact path="/create_nft" component={CreateNFT} loaded={true} />
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
        <StartedRoute exact path="/hardware_wallet" component={StartHardwareWallet} loaded={false} />
        <NavigationRoute exact path="/locked" component={LockedWallet} />
        <Route exact path="/choose_wallet" component={ChooseWallet} />
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
  // If was closed and is loaded we need to redirect to choose wallet screen
  if (hathorLib.wallet.wasClosed()) {
    return <Redirect to={{ pathname: '/choose_wallet/' }} />;
  }

  // For server screen we don't need to check version
  const isServerScreen = props.match.path === '/server';
  const reduxState = store.getState();

  // Check version
  if (reduxState.isVersionAllowed === undefined && !isServerScreen) {
    // We already handle all js errors in general and open an error modal to the user
    // so there is no need to catch the promise error below
    version.checkApiVersion(reduxState.wallet);
    return <Redirect to={{
      pathname: '/loading_addresses/',
      state: {path: props.match.url},
      waitVersionCheck: true
    }} />;
  } else if (reduxState.isVersionAllowed === false && !isServerScreen) {
    return <VersionError {...props} />;
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

/**
 * Build the selected route component, validating the wallet state and the route security parameters needed for it.
 * In case any criteria wasn't met, redirect to the relevant route.
 *
 * @param Component
 * @param props
 * @param rest
 * @returns {JSX.Element|*}
 */
const returnStartedRoute = (Component, props, rest) => {
  // On Windows the pathname that is being pushed into history has a prefix of '/C:'
  // So every time I use 'push' it works, because I set the pathname
  // However when I use history.goBack, it gets the pathname from the history stack
  // So it does not find the path because of the prefix
  // Besides that, when electron loads initially it needs to load index.html from the filesystem
  // So the first load from electron get from '/C:/' in windows. That's why we need the second 'if'
  const pathname = rest.location.pathname;
  if (pathname.length > 3 && pathname.slice(0, 4).toLowerCase() === '/c:/') {
    if (pathname.length > 11 && pathname.slice(-11).toLowerCase() !== '/index.html') {
      return <Redirect to={{pathname: pathname.slice(3)}} />;
    }
  }

  // The wallet was not yet started, go to Welcome
  if (!hathorLib.wallet.started()) {
    return <Redirect to={{pathname: '/welcome/'}}/>;
  }

  // The wallet is already loaded
  const routeRequiresWalletToBeLoaded = rest.loaded;
  if (hathorLib.wallet.loaded()) {
    // Wallet is locked, go to choose_wallet screen
    if (hathorLib.wallet.isLocked()) {
      return <Redirect to={{pathname: '/choose_wallet/'}}/>;
    }

    // Route requires the wallet to be loaded, render it
    if (routeRequiresWalletToBeLoaded) {
      return returnLoadedWalletComponent(Component, props, rest);
    }

    // Route does not require wallet to be loaded. Redirect to wallet "home" screen
    return <Redirect to={{pathname: '/wallet/'}}/>;
  }

  const firstWallet = wallet.getFirstWalletPrefix();
  if (firstWallet && hathorLib.storage.store.prefix === '') {
    return <Redirect to={{pathname: '/choose_wallet/'}}/>;
  }

  // Wallet is not loaded, but it is still loading addresses. Go to the loading screen
  const reduxState = store.getState();
  if (reduxState.loadingAddresses) {
    return <Redirect to={{
      pathname: '/loading_addresses/',
      state: {path: props.match.url}
    }}/>;
  }

  // Wallet is not loaded nor loading, but it's started. Go to the first screen after "welcome"
  if (routeRequiresWalletToBeLoaded) {
    return LEDGER_ENABLED
        ? <Redirect to={{pathname: '/wallet_type/'}}/>
        : <Redirect to={{pathname: '/signin/'}}/>;
  }

  // Wallet is not loaded nor loading, and the route does not require it.
  // Do not redirect anywhere, just render the component.
  return <Component {...props} />;
};

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
    if (props.location.pathname === '/choose_wallet/' && hathorLib.wallet.isHardwareWallet()) {
      wallet.cleanWallet();
      wallet.removeHardwareWalletFromStorage();
      hathorLib.wallet.unlock();
      const firstWallet = wallet.getFirstWalletPrefix();
      if (firstWallet) {
        return <Redirect to={{ pathname: '/choose_wallet/' }} />;
      } else {
        return <Redirect to={{ pathname: '/wallet_type/' }} />;
      }
    } else {
      return (
        <div className="component-div h-100">
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
