/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React, { useEffect, useState, useContext } from 'react';
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import Wallet from './screens/Wallet';
import SendTokens from './screens/SendTokens';
import CreateToken from './screens/CreateToken';
import NanoContractDetail from './screens/nano-contract/NanoContractDetail';
import NanoContractList from './screens/nano-contract/NanoContractList';
import NanoContractSelectBlueprint from './screens/nano-contract/NanoContractSelectBlueprint';
import NanoContractExecuteMethod from './screens/nano-contract/NanoContractExecuteMethod';
import CreateNFT from './screens/CreateNFT';
import Navigation from './components/Navigation';
import TransactionDetail from './screens/TransactionDetail';
import LoadingAddresses from './screens/LoadingAddresses';
import NetworkSettings from './screens/NetworkSettings';
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
import { GlobalModalContext, MODAL_TYPES } from './components/GlobalModal';
import createRequestInstance from './api/axiosInstance';
import hathorLib from '@hathor/wallet-lib';
import { IPC_RENDERER, NETWORK_SETTINGS, WALLET_STATUS } from './constants';
import AllAddresses from './screens/AllAddresses';
import NFTList from './screens/NFTList';
import { resetNavigateTo, updateLedgerClosed } from './actions/index';
import ProposalList from './screens/atomic-swap/ProposalList';
import EditSwap from './screens/atomic-swap/EditSwap';
import NewSwap from './screens/atomic-swap/NewSwap';
import ImportExisting from './screens/atomic-swap/ImportExisting';
import LOCAL_STORE from './storage';
import { getGlobalWallet } from "./modules/wallet";
import ReownConnect from './screens/ReownConnect';
import NetworkSettingsRecovery from './screens/NetworkSettingsRecovery';

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
  const navigate = useNavigate();
  const modalContext = useContext(GlobalModalContext);

  // Monitors when Ledger device loses connection or the app is closed
  useEffect(() => {
    if (ledgerClosed) {
      LOCAL_STORE.lock();
      navigate('/locked/');
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
    const networkSettings = LOCAL_STORE.getNetworkSettings();
    if (!networkSettings) {
      // Set mainnet as default
      LOCAL_STORE.setNetworkSettings(NETWORK_SETTINGS['mainnet']);
    }

    // If there is an `Inter Process Communication` channel available, initialize Ledger logic
    if (IPC_RENDERER) {
      // Event called when the user wants to reset all data
      IPC_RENDERER.on('app:clear_storage', async () => {
        modalContext.showModal(MODAL_TYPES.CONFIRM_CLEAR_STORAGE, {
          success: () => {
            localStorage.clear();
            IPC_RENDERER.send('app:clear_storage_success');
          },
        });
      });

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
    }

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
    navigate(navigateTo.route, { replace: navigateTo.replace });
    dispatch(resetNavigateTo());
  }, [navigateTo])

  // Handles failed wallet states
  if (walletStartState === WALLET_STATUS.FAILED) {
    return <LoadWalletFailed />;
  }

  // Application rendering
  return (
    <Routes>
      <Route path="/nano_contract" element={<StartedComponent children={<NanoContractList />} loaded={true} />} />
      <Route path="/nano_contract/select_blueprint/" element={<StartedComponent children={<NanoContractSelectBlueprint />} loaded={true} />} />
      <Route path="/nano_contract/detail/:nc_id" element={<StartedComponent children={<NanoContractDetail />} loaded={true} />} />
      <Route path="/nano_contract/execute_method/" element={<StartedComponent children={<NanoContractExecuteMethod />} loaded={true} />} />
      <Route path="/nft" element={<StartedComponent children={<NFTList />} loaded={true} />} />
      <Route path="/create_token" element={<StartedComponent children={<CreateToken />} loaded={true} />} />
      <Route path="/create_nft" element={<StartedComponent children={<CreateNFT />} loaded={true} />} />
      <Route path="/custom_tokens" element={<StartedComponent children={<CustomTokens />} loaded={true} />} />
      <Route path="/unknown_tokens" element={<StartedComponent children={<UnknownTokens />} loaded={true} />} />
      <Route path="/wallet/send_tokens" element={<StartedComponent children={<SendTokens />} loaded={true} />} />
      <Route path="/wallet/atomic_swap" element={<StartedComponent children={<ProposalList />} loaded={true} />} />
      <Route path="/wallet/atomic_swap/proposal/create" element={<StartedComponent children={<NewSwap />} loaded={true} />} />
      <Route path="/wallet/atomic_swap/proposal/import" element={<StartedComponent children={<ImportExisting />} loaded={true} />} />
      <Route path="/wallet/atomic_swap/proposal/:proposalId" element={<StartedComponent children={<EditSwap />} loaded={true} />} />
      <Route path="/wallet" element={<StartedComponent children={<Wallet />} loaded={true} />} />
      <Route path="/settings" element={<StartedComponent children={<Settings />} loaded={true} />} />
      <Route path="/wallet/passphrase" element={<StartedComponent children={<ChoosePassphrase />} loaded={true} />} />
      <Route path="/network_settings" element={<StartedComponent children={<NetworkSettings />} loaded={true} />} />
      <Route path="/transaction/:id" element={<StartedComponent children={<TransactionDetail />} loaded={true} />} />
      <Route path="/addresses" element={<StartedComponent children={<AllAddresses />} loaded={true} />} />
      <Route path="/new_wallet" element={<StartedComponent children={<NewWallet />} loaded={false} />} />
      <Route path="/load_wallet" element={<StartedComponent children={<LoadWallet />} loaded={false} />} />
      <Route path="/wallet_type" element={<StartedComponent children={<WalletType loaded={false} />} />} />
      <Route path="/software_warning" element={<StartedComponent children={<SoftwareWalletWarning />} loaded={false} />} />
      <Route path="/signin" element={<StartedComponent children={<Signin />} loaded={false} />} />
      <Route path="/hardware_wallet" element={<StartedComponent children={<StartHardwareWallet />} loaded={false} />} />
      <Route path="/locked" element={<DefaultComponent children={<LockedWallet />} />} />
      <Route path="/welcome" element={<Welcome />} />
      <Route path="/loading_addresses" element={<LoadingAddresses />} />
      <Route path="/permission" element={<SentryPermission />} />
      <Route path="/" element={<StartedComponent children={<Wallet />} loaded={true} />} />
      <Route path="/reown/connect" element={<ReownConnect />} />
      <Route path="/network_settings_recovery" element={<NetworkSettingsRecovery />} />
      <Route path="*" element={<Page404 />} />
    </Routes>
  );
}

function LoadedWalletComponent({ children }) {
  const location = useLocation();
  // For server screen we don't need to check version
  // We also allow the server screen to be reached from the locked screen
  // In the case of an unresponsive fullnode, which would block the wallet start
  const isRecoveryNetworkSettingsScreen = location.pathname === '/network_settings_recovery';

  // Always allow /network_settings_recovery to be shown, even if locked
  if (isRecoveryNetworkSettingsScreen) {
    return <DefaultComponent children={children} />;
  }

  // If was closed and is loaded we need to redirect to locked screen
  if ((LOCAL_STORE.wasClosed() || LOCAL_STORE.isLocked()) && (!LOCAL_STORE.isHardwareWallet())) {
    return <Navigate to={'/locked/'} />;
  }

  const { isVersionAllowed, loadingAddresses } = useSelector(state => ({
    isVersionAllowed: state.isVersionAllowed,
    loadingAddresses: state.loadingAddresses,
  }));

  // The addresses are being loaded, redirect user
  if (loadingAddresses) {
    // If wallet is still loading addresses we redirect to the loading screen
    return <Navigate
      to={'/loading_addresses/'}
      state={{ path: location.pathname }}
    />;
  }

  // The wallet has fully loaded: check version
  if (isVersionAllowed === undefined) {
    // The version information is not yet available, no op
    return;
  }
  if (isVersionAllowed === false) {
    return <VersionError />;
  }

  return (
    <DefaultComponent children={children} />
  );
}

function StartedComponent({ children, loaded: routeRequiresWalletToBeLoaded }) {
  const { loadingAddresses } = useSelector(state => ({
    loadingAddresses: state.loadingAddresses
  }));

  // Handling Windows pathname issues
  const location = useLocation();
  const pathname = location.pathname;
  if (pathname.length > 3 && pathname.slice(0, 4).toLowerCase() === '/c:/') {
    // On Windows the pathname that is being pushed into history has a prefix of '/C:'
    // So everytime I use 'push' it works, because I set the pathname
    // However when I use history.goBack, it gets the pathname from the history stack
    // So it does not find the path because of the prefix
    // Besides that, when electron loads initially it needs to load index.html from the filesystem
    // So the first load from electron get from '/C:/' in windows. That's why we need the second 'if'
    if (pathname.length > 11 && pathname.slice(-11).toLowerCase() !== '/index.html') {
      return <Navigate to={pathname.slice(3)} replace />;
    }
  }

  // The wallet was not yet started, go to Welcome
  if (!LOCAL_STORE.wasStarted()) {
    return <Navigate to={'/welcome/'} replace />;
  }

  // The wallet is already loaded
  if (LOCAL_STORE.isLoadedSync()) {
    // Wallet is locked, go to locked screen
    if (LOCAL_STORE.isLocked() && !LOCAL_STORE.isHardwareWallet()) {
      return <Navigate to={'/locked/'} replace />;
    }

    // Route requires the wallet to be loaded, render it
    if (routeRequiresWalletToBeLoaded) {
      return <LoadedWalletComponent children={children} />;
    }

    // Route does not require wallet to be loaded. Redirect to wallet "home" screen
    return <Navigate to="/wallet/" replace />;
  }

  // Wallet is not loaded, but it is still loading addresses. Go to the loading screen
  if (loadingAddresses) {
    const location = useLocation();
    return <Navigate to={'/loading_addresses/'} state={{ path: location.pathname }} />;
  }

  // Wallet is not loaded or loading, but it is started
  // Since the route requires the wallet to be loaded, redirect to the wallet_type screen
  if (routeRequiresWalletToBeLoaded) {
    return <Navigate to={'/wallet_type/'} />;
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
  const location = useLocation();
  const isLockedScreen = location.pathname === '/locked/';
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
    return <Navigate to={'/wallet_type/'} />;
  }

  // Render the navigation top bar, the component and the error handling modal
  return (
    <div className='component-div h-100'>
      <Navigation />
      {children}
    </div>
  );
}

export default Root;
