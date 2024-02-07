/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React, { useEffect, useState } from 'react';
import { Redirect, Route, Switch, useHistory, useRouteMatch } from 'react-router-dom';
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
import NewWallet from './screens/NewWallet';
import WalletType from './screens/WalletType';
import SoftwareWalletWarning from './screens/SoftwareWalletWarning';
import StartHardwareWallet from './screens/StartHardwareWallet';
import Settings from './screens/Settings';
import LoadWallet from './screens/LoadWallet';
import Page404 from './screens/Page404';
import VersionError from './screens/VersionError';
import WalletVersionError from './screens/WalletVersionError';
import LoadWalletFailed from './screens/LoadWalletFailed';
import versionUtils from './utils/version';
import helpersUtils from './utils/helpers';
import tokensUtils from './utils/tokens';
import storageUtils from './utils/storage';
import { useDispatch, useSelector } from 'react-redux';
import RequestErrorModal from './components/RequestError';
import createRequestInstance from './api/axiosInstance';
import hathorLib from '@hathor/wallet-lib';
import { IPC_RENDERER } from './constants';
import AddressList from './screens/AddressList';
import NFTList from './screens/NFTList';
import { setNavigateTo, updateLedgerClosed } from './actions/index';
import { WALLET_STATUS } from './sagas/wallet';
import ProposalList from './screens/atomic-swap/ProposalList';
import EditSwap from './screens/atomic-swap/EditSwap';
import NewSwap from './screens/atomic-swap/NewSwap';
import ImportExisting from './screens/atomic-swap/ImportExisting';
import LOCAL_STORE from './storage';
import { getGlobalWallet } from "./services/wallet.service";

function Root() {
  const {
    ledgerClosed,
    walletStartState,
    isVersionAllowed,
    navigateTo,
  } = useSelector((state) => {
    return {
      ledgerClosed: state.ledgerWasClosed,
      walletStartState: state.walletStartState,
      isVersionAllowed: state.isVersionAllowed,
      navigateTo: state.navigateTo,
    };
  });
  const wallet = getGlobalWallet();
  const dispatch = useDispatch();
  const history = useHistory();

  // Monitors when Ledger device loses connection or the app is closed
  useEffect(() => {
    if (ledgerClosed) {
      LOCAL_STORE.lock();
      history.push('/locked/');
    }
  }, [ledgerClosed]);

  /**
   * Initializes the application, including:
   * - LocalStorage migration
   * - Ensures the network is set
   * - Ledger event handlers
   */
  useEffect(() => {
    // Detect a previous instalation and migrate
    storageUtils.migratePreviousLocalStorage();

    hathorLib.axios.registerNewCreateRequestInstance(createRequestInstance);
    // Start the wallet as locked
    LOCAL_STORE.lock();

    // Ensure we have the network set even before the first ever load.
    const localNetwork = LOCAL_STORE.getNetwork();
    if (!localNetwork) {
      LOCAL_STORE.setNetwork('mainnet');
    }

    // If there is no ledger connected, finish execution here
    if (!IPC_RENDERER) {
      return;
    }

    // Registers the event handlers for the ledger
    // Event called when user quits hathor app
    IPC_RENDERER.on('ledger:closed', async () => {
      const storage = LOCAL_STORE.getStorage();
      if (
        storage &&
        await LOCAL_STORE.isLoaded() &&
        await storage.isHardwareWallet()
      ) {
        dispatch(updateLedgerClosed(true));
      }
    });

    IPC_RENDERER.on('ledger:manyTokenSignatureValid', async (_, arg) => {
      const storage = LOCAL_STORE.getStorage();
      if (
        storage &&
        await storage.isHardwareWallet()
      ) {
        // remove all invalid signatures
        // arg.data is a list of uids with invalid signatures
        arg.data.forEach(uid => {
          tokensUtils.removeTokenSignature(uid.toString('hex'));
        });
      }
    });

    // Removes the ledger event listeners on unmount, if necessary
    return () => {
      if (IPC_RENDERER) {
        IPC_RENDERER.removeAllListeners('ledger:closed');
        IPC_RENDERER.removeAllListeners('ledger:manyTokenSignatureValid');
      }
    };
  }, []);

  useEffect(() => {
    // Fetch the version information before rendering any screens, if possible
    if (isVersionAllowed === undefined && wallet) {
      helpersUtils.loadStorageState();

      // We already handle all js errors in general and open an error modal to the user
      // so there is no need to catch the promise error below
      versionUtils.checkApiVersion(wallet);
    }
  }, [isVersionAllowed, wallet]);

  /**
   * This effect allows navigation to be triggered from background tasks such as sagas.
   */
  useEffect(() => {
    // Ignore this effect if there is no route to navigateTo
    if (!navigateTo.route) {
      return;
    }

    // Navigate to the informed route and reset the navigateTo state property
    const newRoute = navigateTo;
    if (newRoute.replace) {
      history.replace(newRoute.route);
    } else {
      history.push(newRoute.route);
    }
    dispatch(setNavigateTo(''));
  }, [navigateTo])

  // Handles failed wallet states
  if (walletStartState === WALLET_STATUS.FAILED) {
    return <LoadWalletFailed />;
  }

  // Application rendering
  return (
    <Switch>
      <Route exact path="/nft" children={<StartedComponent children={ <NFTList />} loaded={true} />} />
      <Route exact path="/create_token" children={<StartedComponent children={ <CreateToken /> } loaded={true} />} />
      <Route exact path="/create_nft" children={<StartedComponent children={ <CreateNFT />} loaded={true} />} />
      <Route exact path="/custom_tokens" children={<StartedComponent children={ <CustomTokens /> } loaded={true} />} />
      <Route exact path="/unknown_tokens" children={<StartedComponent children={ <UnknownTokens />} loaded={true} />} />
      <Route exact path="/wallet/send_tokens" children={<StartedComponent children={ <SendTokens /> } loaded={true} />} />
      <Route exact path="/wallet/atomic_swap" children={<StartedComponent children={ <ProposalList />} loaded={true} />} />
      <Route exact path="/wallet/atomic_swap/proposal/create" children={<StartedComponent children={ <NewSwap /> } loaded={true} />} />
      <Route exact path="/wallet/atomic_swap/proposal/import" children={<StartedComponent children={ <ImportExisting />} loaded={true} />} />
      <Route exact path="/wallet/atomic_swap/proposal/:proposalId" children={<StartedComponent children={ <EditSwap /> } loaded={true} />} />
      <Route exact path="/wallet" children={<StartedComponent children={ <Wallet />} loaded={true} />} />
      <Route exact path="/settings" children={<StartedComponent children={ <Settings /> } loaded={true} />} />
      <Route exact path="/wallet/passphrase" children={<StartedComponent children={ <ChoosePassphrase />} loaded={true} />} />
      <Route exact path="/server" children={<StartedComponent children={ <Server /> } loaded={true} />} />
      <Route exact path="/transaction/:id" children={<StartedComponent children={ <TransactionDetail />} loaded={true} />} />
      <Route exact path="/addresses" children={<StartedComponent children={ <AddressList /> } /> } loaded={true} />
      <Route exact path="/new_wallet" children={<StartedComponent children={ <NewWallet />} loaded={false} />} />
      <Route exact path="/load_wallet" children={<StartedComponent children={ <LoadWallet /> } loaded={false} /> } />
      <Route exact path="/wallet_type" children={<StartedComponent children={<WalletType loaded={false} />} />} />
      <Route exact path="/software_warning" children={<StartedComponent children={ <SoftwareWalletWarning /> } loaded={false} />} />
      <Route exact path="/signin" children={<StartedComponent children={ <Signin />} loaded={false} />} />
      <Route exact path="/hardware_wallet" children={<StartedComponent children={ <StartHardwareWallet /> } loaded={false} />} />
      <Route exact path="/locked" children={<DefaultComponent children={<LockedWallet />} />} />
      <Route exact path="/welcome" children={<Welcome />} />
      <Route exact path="/loading_addresses" children={<LoadingAddresses />} />
      <Route exact path="/permission" children={<SentryPermission />} />
      <Route exact path="" children={<StartedComponent children={ <Wallet />} loaded={true} />} />
      <Route path="" children={<Page404 />} />
    </Switch>
  );
}

function LoadedWalletComponent({ children }) {
  const match = useRouteMatch();
  // For server screen we don't need to check version
  // We also allow the server screen to be reached from the locked screen
  // In the case of an unresponsive fullnode, which would block the wallet start
  const isServerScreen = match.path === '/server';

  // If was closed and is loaded we need to redirect to locked screen
  if ((!isServerScreen) && (LOCAL_STORE.wasClosed() || LOCAL_STORE.isLocked()) && (!LOCAL_STORE.isHardwareWallet())) {
    return <Redirect to={{ pathname: '/locked/' }} />;
  }

  // We allow server screen to be shown from locked screen to allow the user to
  // change the server before from a locked wallet.
  if (isServerScreen) {
    return <DefaultComponent children={children} />;
  }

  const { isVersionAllowed, loadingAddresses } = useSelector(state => ({
    isVersionAllowed: state.isVersionAllowed,
    loadingAddresses: state.loadingAddresses,
  }));

  // Check version
  if (isVersionAllowed === undefined) {
    throw new Error('[LoadedWalletComponent] isVersionAllowed is undefined');
    // return <Redirect to={{
    //   pathname: '/loading_addresses/',
    //   state: {path: match.url},
    //   waitVersionCheck: true
    // }} />;
  }
  if (isVersionAllowed === false) {
    return <VersionError />;
  }

  // The version has been checked and allowed
  if (loadingAddresses) {
    // If wallet is still loading addresses we redirect to the loading screen
    return <Redirect to={{
      pathname: '/loading_addresses/',
      state: {path: match.url}
    }} />;
  }

  return (
    <DefaultComponent children={children} />
  );
}

function StartedComponent({children, loaded: routeRequiresWalletToBeLoaded}) {
  const history = useHistory();
  const { loadingAddresses } = useSelector(state => ({
    loadingAddresses: state.loadingAddresses
  }));

  // Handling Windows pathname issues
  const pathname = history.location.pathname;
  if (pathname.length > 3 && pathname.slice(0, 4).toLowerCase() === '/c:/') {
    // On Windows the pathname that is being pushed into history has a prefix of '/C:'
    // So everytime I use 'push' it works, because I set the pathname
    // However when I use history.goBack, it gets the pathname from the history stack
    // So it does not find the path because of the prefix
    // Besides that, when electron loads initially it needs to load index.html from the filesystem
    // So the first load from electron get from '/C:/' in windows. That's why we need the second 'if'
    if (pathname.length > 11 && pathname.slice(-11).toLowerCase() !== '/index.html') {
      return <Redirect to={{pathname: pathname.slice(3)}} />;
    }
  }

  // The wallet was not yet started, go to Welcome
  if (!LOCAL_STORE.wasStarted()) {
    return <Redirect to={{pathname: '/welcome/'}}/>;
  }

  // The wallet is already loaded
  if (LOCAL_STORE.isLoadedSync()) {
    // The server screen is a special case since we allow the user to change the
    // connected server in case of unresponsiveness, this should be allowed from
    // the locked screen since the wallet would not be able to be started otherwise
    const isServerScreen = history.location.pathname === '/server';
    // Wallet is locked, go to locked screen
    if (LOCAL_STORE.isLocked() && !isServerScreen && !LOCAL_STORE.isHardwareWallet()) {
      return <Redirect to={{pathname: '/locked/'}}/>;
    }

    // Route requires the wallet to be loaded, render it
    if (routeRequiresWalletToBeLoaded || isServerScreen) {
      return <LoadedWalletComponent children={children} />;
    }

    // Route does not require wallet to be loaded. Redirect to wallet "home" screen
    return <Redirect to={{pathname: '/wallet/'}}/>;
  }

  // Wallet is not loaded, but it is still loading addresses. Go to the loading screen
  if (loadingAddresses) {
    const match = useRouteMatch();
    return <Redirect to={{
      pathname: '/loading_addresses/',
      state: {path: match.url}
    }}/>;
  }

  // Wallet is not loaded or loading, but it is started
  // Since the route requires the wallet to be loaded, redirect to the wallet_type screen
  if (routeRequiresWalletToBeLoaded) {
    return <Redirect to={{pathname: '/wallet_type/'}}/>;
  }

  // Wallet is not loaded nor loading, and the route does not require it to be loaded.
  // Do not redirect anywhere: just render the component.
  return children;
}

/**
 * Renders the selected children component, wrapping it with the navigation bar on top and the error modal.
 * It also handles the version checking, redirecting to an error screen if the wallet version is obsolete.
 * @param children
 * @returns {JSX.Element}
 * @constructor
 */
function DefaultComponent({ children }) {
  const { isVersionAllowed } = useSelector(state => ({
    isVersionAllowed: state.isVersionAllowed,
  }));
  const history = useHistory();

  const [versionIsKnown, setVersionIsKnown] = useState(false);

  // Monitors the version data from state and allows the rendering of the screen accordingly
  useEffect(() => {
    if (isVersionAllowed === undefined) {
      // The version information is not yet available, no op
      return;
    }
    setVersionIsKnown(true);
  }, [isVersionAllowed]);

  /*
   * Prevents rendering commmon app usage screens while the wallet version is still unknown.
   * An exception is made to the 'locked' screen, because the version request is not yet done while the user is in it.
   * Note: `DefaultComponent` is not used on the screens that initialize new wallets, or the "Welcome" screens
   */
  const isLockedScreen = history.location.pathname === '/locked/';
  if (!versionIsKnown) {
    if (!isLockedScreen) {
      return null;
    }
  } else {
    // Wallets with an obsolete version should be redirected to an informative screen, blocking its use of the app
    if (!versionUtils.checkWalletVersion()) {
      return <WalletVersionError />;
    }
  }

  // If this is a hardware wallet that has been locked, navigate to the "Wallet Type" screen
  if (isLockedScreen &&
    LOCAL_STORE.isHardwareWallet()) {
    // This will redirect the page to Wallet Type screen
    LOCAL_STORE.cleanWallet();
    return <Redirect to={ { pathname: '/wallet_type/' } } />;
  }

  // Render the navigation top bar, the component and the error handling modal
  return (
    <div className='component-div h-100'>
      <Navigation />
      { children }
      <RequestErrorModal />
    </div>
  );
}

export default Root;
