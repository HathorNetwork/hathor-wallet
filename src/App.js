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
import store from './store/index';
import createRequestInstance from './api/axiosInstance';
import hathorLib from '@hathor/wallet-lib';
import { IPC_RENDERER } from './constants';
import AddressList from './screens/AddressList';
import NFTList from './screens/NFTList';
import { updateLedgerClosed } from './actions/index';
import { WALLET_STATUS } from './sagas/wallet';
import ProposalList from './screens/atomic-swap/ProposalList';
import EditSwap from './screens/atomic-swap/EditSwap';
import NewSwap from './screens/atomic-swap/NewSwap';
import ImportExisting from './screens/atomic-swap/ImportExisting';
import LOCAL_STORE from './storage';

function Root() {
  const {
    ledgerClosed,
    walletStartState,
    isVersionAllowed,
    wallet,
  } = useSelector((state) => {
    return {
      ledgerClosed: state.ledgerWasClosed,
      walletStartState: state.walletStartState,
      isVersionAllowed: state.isVersionAllowed,
      wallet: state.wallet,
    };
  });
  console.log(`[Root] Initialized with walletStartState: ${walletStartState}`);
  const dispatch = useDispatch();
  const history = useHistory();

  // Monitors when Ledger device loses connection or the app is closed
  useEffect(() => {
    console.log(`[Root] effect: ledgerClosed: ${ledgerClosed}`);
    if (ledgerClosed) {
      console.log(`[Root] effect: ledgerClosed called, redirecting to /wallet_type`);
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
    console.log(`[Root] mount effect with ledger: ${!!IPC_RENDERER}`);
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
      console.log(`[Root] unmount effect with ledger: ${!!IPC_RENDERER}`);
      if (IPC_RENDERER) {
        IPC_RENDERER.removeAllListeners('ledger:closed');
        IPC_RENDERER.removeAllListeners('ledger:manyTokenSignatureValid');
      }
    }
  }, []);

  useEffect(() => {
    console.log(`[Root] effect: isVersionAllowed: ${isVersionAllowed} and ${wallet ? 'has wallet' : 'no wallet'}`);
    // Fetch the version information before rendering any screens, if possible
    if (isVersionAllowed === undefined && wallet) {
      helpersUtils.loadStorageState();

      // We already handle all js errors in general and open an error modal to the user
      // so there is no need to catch the promise error below
      versionUtils.checkApiVersion(wallet);
    }
  }, [isVersionAllowed, wallet]);

  // Handles failed wallet states
  if (walletStartState === WALLET_STATUS.FAILED) {
    console.log(`[Root] rendering LoadWalletFailed`)
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
  )
}

function LoadedWalletComponent({ children }) {
  const match = useRouteMatch();
  console.log(`[LoadedWalletComponent] Initialized on path: ${match.path}`);
  // For server screen we don't need to check version
  // We also allow the server screen to be reached from the locked screen
  // In the case of an unresponsive fullnode, which would block the wallet start
  const isServerScreen = match.path === '/server';

  // If was closed and is loaded we need to redirect to locked screen
  console.log(`[LoadedWalletComponent] wasClosed: ${LOCAL_STORE.wasClosed()}, isLocked: ${LOCAL_STORE.isLocked()}, isHardwareWallet: ${LOCAL_STORE.isHardwareWallet()}`);
  if ((!isServerScreen) && (LOCAL_STORE.wasClosed() || LOCAL_STORE.isLocked()) && (!LOCAL_STORE.isHardwareWallet())) {
    console.log(`[LoadedWalletComponent] Redirecting to /locked`);
    return <Redirect to={{ pathname: '/locked/' }} />;
  }

  // We allow server screen to be shown from locked screen to allow the user to
  // change the server before from a locked wallet.
  if (isServerScreen) {
    console.log(`[LoadedWalletComponent] Rendering the server screen`);
    return <DefaultComponent children={children} />
  }

  const { isVersionAllowed, loadingAddresses } = useSelector(state => ({
    isVersionAllowed: state.isVersionAllowed,
    loadingAddresses: state.loadingAddresses,
  }))
  console.log(`[LoadedWalletComponent] isVersionAllowed: ${isVersionAllowed}, loadingAddresses: ${loadingAddresses}`);

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
    console.log(`[LoadedWalletComponent] Rendering VersionError screen`);
    return <VersionError />;
  }

  // The version has been checked and allowed
  if (loadingAddresses) {
    console.log(`[LoadedWalletComponent] Redirecting to /loading_addresses`);
    // If wallet is still loading addresses we redirect to the loading screen
    return <Redirect to={{
      pathname: '/loading_addresses/',
      state: {path: match.url}
    }} />;
  }

  console.log(`[LoadedWalletComponent] Rendering the default component`);
  return (
    <DefaultComponent children={children} />
  )
}

function StartedComponent({children, loaded: routeRequiresWalletToBeLoaded}) {
  const history = useHistory();
  const { loadingAddresses } = useSelector(state => ({
    loadingAddresses: state.loadingAddresses
  }))

  // Handling Windows pathname issues
  const pathname = history.location.pathname; // TODO: Investigate if this logic can be moved to root
  console.log(`[StartedComponent] Initialized on path: ${pathname}`);
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
    // TODO: Refactor this logic, so that this validation is made before calling the route wrapper
    console.log(`[StartedComponent] LocalStore was NOT started, redirecting to /welcome`)
    return <Redirect to={{pathname: '/welcome/'}}/>;
  }

  // The wallet is already loaded
  if (LOCAL_STORE.isLoadedSync()) {
    console.log(`[StartedComponent] LocalStore isLoadedSync`)
    // The server screen is a special case since we allow the user to change the
    // connected server in case of unresponsiveness, this should be allowed from
    // the locked screen since the wallet would not be able to be started otherwise
    const isServerScreen = history.location.pathname === '/server';
    // Wallet is locked, go to locked screen
    console.log(`[StartedComponent] isLocked: ${ LOCAL_STORE.isLocked() }, isServerScreen: ${ isServerScreen }, isHardwareWallet: ${ LOCAL_STORE.isHardwareWallet() }`);
    if (LOCAL_STORE.isLocked() && !isServerScreen && !LOCAL_STORE.isHardwareWallet()) {
      console.log(`[StartedComponent] Redirected to /locked`)
      return <Redirect to={{pathname: '/locked/'}}/>;
    }

    // Route requires the wallet to be loaded, render it
    console.log(`[StartedComponent] Route requires wallet to be loaded? ${routeRequiresWalletToBeLoaded}`);
    if (routeRequiresWalletToBeLoaded || isServerScreen) {
      console.log(`[StartedComponent] Rendering with LoadedWalletComponent`)
      return <LoadedWalletComponent children={children} />;
    }

    // Route does not require wallet to be loaded. Redirect to wallet "home" screen
    console.log(`[StartedComponent] Redirected to /wallet`)
    return <Redirect to={{pathname: '/wallet/'}}/>;
  }

  // Wallet is not loaded, but it is still loading addresses. Go to the loading screen
  console.log(`[StartedComponent] loadingAddresses? ${loadingAddresses}`);
  if (loadingAddresses) {
    const match = useRouteMatch();
    return <Redirect to={{
      pathname: '/loading_addresses/',
      state: {path: match.url}
    }}/>;
  }

  // Wallet is not loaded or loading, but it is started
  // Since the route requires the wallet to be loaded, redirect to the wallet_type screen
  console.log(`[StartedComponent] routeRequiresWalletToBeLoaded? ${routeRequiresWalletToBeLoaded}`);
  if (routeRequiresWalletToBeLoaded) {
    console.log(`[StartedComponent] Redirecting to wallet_type`)
    return <Redirect to={{pathname: '/wallet_type/'}}/>;
  }

  // Wallet is not loaded nor loading, and the route does not require it to be loaded.
  // Do not redirect anywhere: just render the component.
  console.log(`[StartedComponent] Just rendering the children`)
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
  console.log(`[DefaultComponent] Initialized on path ${history.location.pathname}, with isVersionAllowed: ${isVersionAllowed}`);

  const [versionIsKnown, setVersionIsKnown] = useState(false);

  // Monitors the version data from state and allows the rendering of the screen accordingly
  useEffect(() => {
    if (isVersionAllowed === undefined) {
      console.log(`[DefaultComponent] effect: isVersionAllowed is undefined, no op`);
      // The version information is not yet available, no op
      return;
    }
    console.log(`[DefaultComponent] effect: isVersionAllowed: ${isVersionAllowed}, setting versionIsKnown to true`);
    setVersionIsKnown(true);
  }, [isVersionAllowed]);

  // Do not any wallet screens if the wallet version is still unknown. Only the Locked Sreen is allowed
  const isLockedScreen = history.location.pathname === '/locked/';
  if (!versionIsKnown) {
    if (!isLockedScreen) {
      console.log(`[DefaultComponent] version is not known, don't render anything`);
      return null;
    }
  } else {
    // Redirect a use with an obsolete wallet version to an informative screen, blocking its use of the application
    if (!versionUtils.checkWalletVersion()) {
      console.log(`[DefaultComponent] Invalid wallet version: rendering WalletVersionError`);
      return <WalletVersionError />;
    }
  }

  // If this is a hardware wallet that has been locked, navigate to the "Wallet Type" screen
  console.log(`[DefaultComponent] Pathname ${history.location.pathname}, isHardwareWallet: ${LOCAL_STORE.isHardwareWallet()}`);
  if (isLockedScreen &&
    LOCAL_STORE.isHardwareWallet()) {
    console.log(`[DefaultComponent] Redirecting back to /wallet_type/`);
    // This will redirect the page to Wallet Type screen
    LOCAL_STORE.cleanWallet();
    return <Redirect to={ { pathname: '/wallet_type/' } } />; // TODO: Refactor this to a navigate command
  }

  // Render the navigation top bar, the component and the error handling modal
  console.log(`[DefaultComponent] Rendering children wrapped in the navigation bar`);
  return (
    <div className='component-div h-100'>
      <Navigation />
      { children }
      <RequestErrorModal />
    </div>
  );
}

export default Root;
