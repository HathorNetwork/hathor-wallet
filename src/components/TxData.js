/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React from 'react';
import { t } from 'ttag';
import $ from 'jquery';
import { CopyToClipboard } from 'react-copy-to-clipboard';
import { Link } from 'react-router-dom'
import HathorAlert from './HathorAlert';
import SpanFmt from './SpanFmt';
import { selectToken } from '../actions/index';
import { connect } from "react-redux";
import { get } from 'lodash';
import Viz from 'viz.js';
import { Module, render } from 'viz.js/full.render.js';
import hathorLib from '@hathor/wallet-lib';
import { MAX_GRAPH_LEVEL } from '../constants';
import helpers from '../utils/helpers';
import { GlobalModalContext, MODAL_TYPES } from '../components/GlobalModal';
import Loading from '../components/Loading';


const mapStateToProps = (state) => {
  return {
    tokens: state.tokens,
    tokenMetadata: state.tokenMetadata || {},
    wallet: state.wallet,
  };
};

const mapDispatchToProps = dispatch => {
  return {
    selectToken: data => dispatch(selectToken(data)),
  };
};


/**
 * Component that renders data of a transaction (used in TransactionDetail and DecodeTx screens)
 *
 * @memberof Components
 */
class TxData extends React.Component {
  static contextType = GlobalModalContext;

  constructor(props) {
    super(props);

    this.alertCopiedRef = React.createRef();
  }

  /**
   * raw {boolean} if should show raw transaction
   * children {boolean} if should show children (default is hidden but user can show with a click)
   * tokens {Array} tokens contained in this transaction
   * tokenClicked {Object} token clicked to be sent as props to the modal of unregistered token info
   */
  state = {
    raw: false,
    children: false,
    unregisteredLoading: false,
    tokens: [],
    balance: {},
    tokenClicked: null,
    walletAddressesMap: {},
    graphvizFundsRequestLoading: false,
    graphvizFundsRequestFailed: false,
    graphvizVerificationRequestFailed: false,
    graphvizVerificationRequestLoading: false,
  };

  // Array of token uid that was already found to show the symbol
  tokensFound = [];

  componentDidMount = () => {
    this.calculateBalance();
    this.calculateTokens();
    this.fetchWalletAddressesMap();
    this.queryVerificationData();
    this.queryFundsData();
  }

  /**
   * Receives an Viz instance, a documentId and data and renders a
   * graphviz graph
   */
  renderGraph(viz, documentId, data) {
    viz.renderSVGElement(data)
      .then((element) => {
        const domElement = document.getElementById(documentId);

        // If the user click "back" before the request is complete,
        // the component will be killed and this will be undefined,
        // causing an error on the wallet.
        if (!domElement) {
          return;
        }

        domElement.appendChild(element);
      });
  }

  queryFundsData = async () => {
    const viz = new Viz({
      Module,
      render,
    });

    this.setState({
      graphvizFundsRequestFailed: false,
      graphvizFundsRequestLoading: true,
    });

    try {
      const fundsData = await this.props.wallet.graphvizNeighborsQuery(
        this.props.transaction.hash,
        'funds',
        MAX_GRAPH_LEVEL,
      );

      this.renderGraph(viz, 'graph-funds', fundsData);
      this.setState({
        graphvizFundsRequestLoading: false,
      });
    } catch(e) {
      this.setState({
        graphvizFundsRequestFailed: true,
        graphvizFundsRequestLoading: false,
      });
    }
  }

  queryVerificationData = async () => {
    const viz = new Viz({
      Module,
      render,
    });

    this.setState({
      graphvizVerificationRequestFailed: false,
      graphvizVerificationRequestLoading: true,
    });

    try {
      const verificationData = await this.props.wallet.graphvizNeighborsQuery(
        this.props.transaction.hash,
        'verification',
        MAX_GRAPH_LEVEL,
      );

      this.renderGraph(viz, 'graph-verification', verificationData);
      this.setState({
        graphvizVerificationRequestLoading: false,
      });
    } catch(e) {
      this.setState({
        graphvizVerificationRequestFailed: true,
        graphvizVerificationRequestLoading: false,
      });
    }
  }

  fetchWalletAddressesMap = async () => {
    const inputs = this.props.transaction.inputs;
    const outputs = this.props.transaction.outputs;

    const getDecodedAddresses = (acc, io) => {
      const address = get(io, 'decoded.address');

      if (!address) {
        return acc;
      }

      return [...acc, address];
    };

    const addresses = [
      ...inputs.reduce(getDecodedAddresses, []),
      ...outputs.reduce(getDecodedAddresses, []),
    ];

    try {
      const walletAddressesMap = await this.props.wallet.checkAddressesMine(addresses);
      this.setState({
        walletAddressesMap,
      });
    } catch(_e) {
      // If the request fails for some reason, the only side effect is that we won't display the badge
      // indicating that the address belongs to the user wallet. I think it is safe to ignore it.
    }
  }

  /**
   * Add all tokens of this transaction (inputs and outputs) to the state
   */
  calculateTokens = () => {
    // Adding transactions tokens to state

    const tokens = [];

    for (const output of this.props.transaction.outputs) {
      const tokenData = this.checkToken(hathorLib.tokensUtils.getTokenIndexFromData(output.decoded.token_data));

      if (tokenData) {
        tokens.push(tokenData);
      }
    }

    for (const input of this.props.transaction.inputs) {
      const tokenData = this.checkToken(hathorLib.tokensUtils.getTokenIndexFromData(input.decoded.token_data));

      if (tokenData) {
        tokens.push(tokenData);
      }
    }

    this.setState({ tokens });
  }

  /**
   * Checks if token was already added and if it's a known token, then add it
   *
   * @param {number} tokenData Represents the index of the token in this transaction
   * @return {Object} Token config object with {uid, name, symbol, tokenUnknown}
   */
  checkToken = (tokenData) => {
    if (tokenData === hathorLib.constants.HATHOR_TOKEN_INDEX) {
      return null;
    }

    const tokenConfig = this.props.transaction.tokens[tokenData - 1];

    if (this.tokensFound.find((uid) => uid === tokenConfig.uid) !== undefined) {
      // Already found this token
      return null;
    }

    const tokenUnknown = this.props.tokens.find((token) => token.uid === tokenConfig.uid) === undefined;
    this.tokensFound.push(tokenConfig.uid);
    const configToAdd = Object.assign({ unknown: tokenUnknown }, tokenConfig);
    return configToAdd;
  }

  calculateBalance = async () => {
    const fullBalance = await hathorLib.transactionUtils.getTxBalance(this.props.transaction, this.props.wallet.storage);
    const balance = {};
    for (const token of Object.keys(fullBalance)) {
      const tokenBalance = fullBalance[token];
      // The UI balance does not distinguish between locked and unlocked balance
      // Also, it does not care for authority balance, so we skip it
      balance[token] = tokenBalance.tokens.locked + tokenBalance.tokens.unlocked;
    }
    this.setState({ balance });
  }

  /**
   * Show/hide raw transaction in hexadecimal
   *
   * @param {Object} e Event emitted when clicking link
   */
  toggleRaw = (e) => {
    e.preventDefault();
    this.setState({ raw: !this.state.raw }, () => {
      if (this.state.raw) {
        $(this.refs.rawTx).show(300);
      } else {
        $(this.refs.rawTx).hide(300);
      }
    });
  }

  /**
   * Show/hide children of the transaction
   *
   * @param {Object} e Event emitted when clicking link
   */
  toggleChildren = (e) => {
    e.preventDefault();
    this.setState({ children: !this.state.children });
  }

  /**
   * Method called on copy to clipboard success
   * Show alert success message
   *
   * @param {string} text Text copied to clipboard
   * @param {*} result Null in case of error
   */
  copied = (text, result) => {
    if (result) {
      // If copied with success
      this.alertCopiedRef.current.show(1000);
    }
  }

  /**
   * Get token config of token from an output gettings its UID from tokenData
   *
   * @param {number} tokenData
   *
   * @return {Object} Token config data {name, symbol, uid}
   */
  getOutputToken = (tokenData) => {
    if (tokenData === hathorLib.constants.HATHOR_TOKEN_INDEX) {
      return hathorLib.constants.HATHOR_TOKEN_CONFIG;
    }
    const tokenConfig = this.props.transaction.tokens[tokenData - 1];
    return tokenConfig;
  }

  /**
   * Get symbol of token from UID iterating through possible tokens in the transaction
   *
   * @param {string} uid UID of token to get the symbol
   *
   * @return {string} Token symbol
   */
  getSymbol = (uid) => {
    if (uid === hathorLib.constants.HATHOR_TOKEN_CONFIG.uid) {
      return hathorLib.constants.HATHOR_TOKEN_CONFIG.symbol;
    }
    const tokenConfig = this.props.transaction.tokens.find((token) => token.uid === uid);
    if (tokenConfig === undefined) return '';
    return tokenConfig.symbol;
  }

  /**
   * Get uid of token from an output token data
   *
   * @param {number} tokenData
   *
   * @return {string} Token uid
   */
  getUIDFromTokenData = (tokenData) => {
    if (tokenData === hathorLib.constants.HATHOR_TOKEN_INDEX) {
      return hathorLib.constants.HATHOR_TOKEN_CONFIG.uid;
    }
    const tokenConfig = this.props.transaction.tokens[tokenData - 1];
    return tokenConfig.uid;
  }

  /**
   * Returns if the token from uid in parameter is not registered in the wallet
   *
   * @param {string} uid UID of the token to check
   *
   * @return {boolean} If token is unknown (not registered)
   */
  isTokenUnknown = (uid) => {
    const tokenConfig = this.state.tokens.find((token) => token.uid === uid);
    if (tokenConfig === undefined) return false;
    return tokenConfig.unknown;
  }

  /**
   * Open modal to show unregistered token info
   *
   * @param {Object} e Event emitted when clicking link
   * @param {Object} token Data of token to show info {name, symbol, uid}
   */
  showUnregisteredTokenInfo = (e, token) => {
    e.preventDefault();

    this.setState({
      tokenClicked: token,
      unregisteredLoading: true,
    }, async () => {
      const tokenDetails = await this.props.wallet.getTokenDetails(token.uid);

      const { totalSupply, totalTransactions, authorities } = tokenDetails;

      this.context.showModal(MODAL_TYPES.UNREGISTERED_TOKEN_INFO, {
        token: this.state.tokenClicked,
        tokenRegistered: this.tokenRegistered,
        totalSupply,
        canMint: authorities.mint,
        canMelt: authorities.melt,
        transactionsCount: totalTransactions,
        tokenMetadata: this.props.tokenMetadata,
      });

      this.setState({ unregisteredLoading: false });
    });
  }

  /*
   * Method executed when uid of registered token is clicked
   *
   * @param {Object} e Event emitted when clicking link
   * @param {Object} token Data of token to show info {name, symbol, uid}
   */
  registeredTokenClicked = (e, token) => {
    e.preventDefault();
    this.tokenRegistered(token);
  }

  /*
   * Set token as selected in redux and redirect to /wallet/
   *
   * @param {Object} token Data of token to show info {name, symbol, uid}
   */
  tokenRegistered = (token) => {
    this.props.selectToken(token.uid);
    this.props.history.push('/wallet/');
  }

  isAddressMine = (address) => {
    return (
      address in this.state.walletAddressesMap
      && this.state.walletAddressesMap[address]
    );
  }

  render() {
    const renderBlockOrTransaction = () => {
      if (hathorLib.transactionUtils.isBlock(this.props.transaction)) {
        return 'block';
      } else {
        return 'transaction';
      }
    }

    const typeStr = renderBlockOrTransaction();

    const renderInputs = (inputs) => {
      return inputs.map((input, idx) => {
        return (
          <div key={`${input.tx_id}${input.index}`}>
            <Link to={`/transaction/${input.tx_id}`}>{hathorLib.helpersUtils.getShortHash(input.tx_id)}</Link> ({input.index}) {input.decoded && this.isAddressMine(input.decoded.address) && renderAddressBadge()}
            {renderOutput(input, 0, false)}
          </div>
        );
      });
    }

    const outputValue = (output) => {
      if (hathorLib.transactionUtils.isAuthorityOutput(output)) {
        if (hathorLib.transactionUtils.isMint(output)) {
          return t`Mint authority`;
        } else if (hathorLib.transactionUtils.isMelt(output)) {
          return t`Melt authority`;
        } else {
          // Should never come here
          return t`Unknown authority`;
        }
      } else {
        // if it's an NFT token we should show integer value
        const uid = this.getUIDFromTokenData(hathorLib.tokensUtils.getTokenIndexFromData(output.token_data));
        return helpers.renderValue(output.value, isNFT(uid));
      }
    }

    const renderUnregisteredIcon = () => {
      return <i title={t`This token is not registered in your wallet.`} className='fa text-warning fa-warning'></i>;
    }

    const renderOutputToken = (output) => {
      const tokenOutput = this.getOutputToken(hathorLib.tokensUtils.getTokenIndexFromData(output.decoded.token_data));
      return (
        <strong>{tokenOutput.symbol} {this.isTokenUnknown(tokenOutput.uid) && renderUnregisteredIcon()}</strong>
      );
    }

    const renderOutput = (output, idx, addBadge) => {
      return (
        <div key={idx}>
          <div>{outputValue(output)} {renderOutputToken(output)} {output.decoded && addBadge && this.isAddressMine(output.decoded.address) && renderAddressBadge()}</div>
          <div>
            {renderDecodedScript(output)}
            {idx in this.props.spentOutputs ? <span> (<Link to={`/transaction/${this.props.spentOutputs[idx]}`}>{t`Spent`}</Link>)</span> : ''}
          </div>
        </div>
      );
    }

    const renderOutputs = (outputs) => {
      return outputs.map((output, idx) => {
        return renderOutput(output, idx, true);
      });
    }

    const renderDecodedScript = (output) => {
      // When there is a decoded object
      switch (output.decoded.type) {
        case 'P2PKH':
        case 'MultiSig':
          return renderP2PKHorMultiSig(output.decoded);
        case 'NanoContractMatchValues':
          return renderNanoContractMatchValues(output.decoded);
      }

      // There is no decoded object. Try to parse output script data
      let script = output.script;
      try {
        // The output script is decoded to base64 in the full node
        // before returning as response to the explorer in the API
        // and the lib expects a buffer (bytes)
        // In the future we must receive from the full node
        // the decoded.type as script data but this still needs
        // some refactor there that won't happen soon
        const buff = new Buffer.from(script, 'base64');
        const parsedData = hathorLib.scriptsUtils.parseScriptData(buff);
        return renderDataScript(parsedData.data);
      } catch (e) {
        if (!(e instanceof hathorLib.errors.ParseScriptError)) {
          // Parse script error is the expected error in case the output script
          // is not a script data. If we get another error here, we should at least log it
          console.log('Unexpected error', e);
        }
      }

      // Unable to decode it as a script: render it as a warning on screen.
      try {
        script = atob(output.script);
      } catch {}

      return `Unable to decode script: ${script.trim()}`;
    }

    const renderDataScript = (data) => {
      return `${data} [Data]`;
    }

    const renderP2PKHorMultiSig = (decoded) => {
      var ret = decoded.address;
      if (decoded.timelock) {
        const parsedTimestamp = hathorLib.dateFormatter.parseTimestamp(decoded.timelock);
        ret = t`${ret} | Locked until ${parsedTimestamp}`
      }
      ret = `${ret} [${decoded.type}]`;
      return ret;
    }

    const renderNanoContractMatchValues = (decoded) => {
      const ret = t`Match values (nano contract), oracle id: ${decoded.oracle_data_id} hash: ${decoded.oracle_pubkey_hash}`;
      return ret;
    }

    const renderListWithLinks = (hashes, textDark) => {
      if (hashes.length === 0) {
        return;
      }
      if (hashes.length === 1) {
        const h = hashes[0];
        return <Link className={textDark ? "text-dark" : ""} to={`/transaction/${h}`}> {h} {h === this.props.transaction.hash && ' (Current transaction)'}</Link>;
      }
      const v = hashes.map((h) => <li key={h}><Link className={textDark ? "text-dark" : ""} to={`/transaction/${h}`}>{h} {h === this.props.transaction.hash && ' (Current transaction)'}</Link></li>)
      return (<ul>
        {v}
      </ul>)
    }

    const renderDivList = (hashes) => {
      return hashes.map((h) => <div key={h}><Link to={`/transaction/${h}`}>{hathorLib.helpersUtils.getShortHash(h)}</Link></div>)
    }

    const renderTwins = () => {
      if (!this.props.meta.twins.length) {
        return;
      } else {
        return <div>This transaction has twin {helpers.plural(this.props.meta.twins.length, 'transaction', 'transactions')}: {renderListWithLinks(this.props.meta.twins, true)}</div>
      }
    }

    const renderConflicts = () => {
      let twins = this.props.meta.twins;
      let conflictNotTwin = this.props.meta.conflict_with.length ?
                            this.props.meta.conflict_with.filter(hash => twins.indexOf(hash) < 0) :
                            []
      if (!this.props.meta.voided_by.length) {
        if (!this.props.meta.conflict_with.length) {
          // there are conflicts, but it is not voided
          return (
            <div className="alert alert-success">
              <h4 className="alert-heading mb-0">{t`This ${typeStr} is valid.`}</h4>
            </div>
          )
        }

        if (this.props.meta.conflict_with.length) {
          // there are conflicts, but it is not voided
          return (
            <div className="alert alert-success">
              <h4 className="alert-heading">{t`This ${typeStr} is valid.`}</h4>
              <p>
                {t`Although there is a double-spending transaction, this transaction has the highest accumulated weight and is valid.`}
              </p>
              <hr />
              {conflictNotTwin.length > 0 &&
                <div className="mb-0">
                  <span>{t`Transactions double spending the same outputs as this transaction:`} </span>
                  {renderListWithLinks(conflictNotTwin, true)}
                </div>}
              {renderTwins()}
            </div>
          );
        }
        return;
      }

      if (!this.props.meta.conflict_with.length) {
        // it is voided, but there is no conflict
        return (
          <div className="alert alert-danger">
            <h4 className="alert-heading"><SpanFmt>{t`This ${typeStr} is voided and **NOT** valid.`}</SpanFmt></h4>
            <p>
              {t`This ${typeStr} is verifying (directly or indirectly) a voided double-spending transaction, hence it is voided as well.`}
            </p>
            <div className="mb-0">
              <span>{t`This ${typeStr} is voided because of these transactions: `}</span>
              {renderListWithLinks(this.props.meta.voided_by, true)}
            </div>
          </div>
        )
      }

      // it is voided, and there is a conflict
      return (
        <div className="alert alert-danger">
          <h4 className="alert-heading"><SpanFmt>{t`This ${typeStr} is **NOT** valid.`}</SpanFmt></h4>
          <div>
            <span>{t`It is voided by: `}</span>
            {renderListWithLinks(this.props.meta.voided_by, true)}
          </div>
          <hr />
          {conflictNotTwin.length > 0 &&
            <div className="mb-0">
              <span>{t`Conflicts with: `}</span>
              {renderListWithLinks(conflictNotTwin, true)}
            </div>}
          {renderTwins()}
        </div>
      )
    }

    const renderGraph = (
      label,
      type,
      failed,
      loading,
      retryCallback,
    ) => {
      if (!this.props.showGraphs) {
        return;
      }

      return (
        <div className="mt-3 graph-div" id={`graph-${type}`} key={`graph-${type}-${this.props.transaction.hash}`}>
          <label className="graph-label">{label}:</label>
          { loading && (
            <Loading
              type='spin'
              width={16}
              height={16}
              delay={200} />
          )}
          { !loading && failed && (
            <div>{t`Download failed`}, <a href="true" onClick={(e) => {
              e.preventDefault();
              retryCallback();
            }}>{t`try again`}</a></div>
          )}
        </div>
      );
    };

    const renderAccumulatedWeight = () => {
      if (this.props.confirmationDataError) {
        const onRetryClick = (e) => {
          e.preventDefault();
          this.props.confirmationDataRetry();
        };
        return (
          <>
            {t`Error retrieving accumulated weight data...`}&nbsp;
            <a href="true" onClick={onRetryClick}>{t`try again`}</a>
          </>
        )
      }

      if (this.props.confirmationData) {
        let acc = hathorLib.helpersUtils.roundFloat(this.props.confirmationData.accumulated_weight);
        if (this.props.confirmationData.accumulated_bigger) {
          return t`Over ${acc}`;
        } else {
          return acc;
        }
      } else {
        return t`Retrieving accumulated weight data...`;
      }
    }

    const renderScore = () => {
      return (
        <div>
          <label>{`Score:`}</label> {hathorLib.helpersUtils.roundFloat(this.props.meta.score)}
        </div>
      );
    }

    const renderHeight = () => {
      return (
        <div>
          <label>Height:</label> {this.props.transaction.height}
        </div>
      );
    }

    const renderTokenList = () => {
      const renderTokenUID = (token) => {
        if (token.uid === hathorLib.constants.HATHOR_TOKEN_CONFIG.uid) {
          return <span>token.uid</span>;
        } else if (token.unknown) {
          return (
            <div className="unregistered-token-loading-wrapper">
              <a href="true" onClick={(e) => this.showUnregisteredTokenInfo(e, token)}>
                {token.uid}
              </a>
              {this.state.unregisteredLoading && (
                <Loading
                  type='spin'
                  width={16}
                  height={16}
                  delay={200} />
              )}
            </div>
          )
        } else {
          return <a href="true" onClick={(e) => this.registeredTokenClicked(e, token)}>{token.uid}</a>
        }
      }
      const tokens = this.state.tokens.map((token) => {
        return (
          <div key={token.uid}>
            <span>{token.name} <strong>({token.symbol})</strong> {token.unknown && renderUnregisteredIcon()} | {renderTokenUID(token)}</span>
          </div>
        );
      });
      return (
        <div className="d-flex flex-column align-items-start mb-3 common-div bordered-wrapper">
          <div><label>{t`Tokens:`}</label></div>
          {tokens}
        </div>
      );
    }

    const renderFirstBlock = () => {
      return (
         <Link to={`/transaction/${this.props.meta.first_block}`}> {hathorLib.helpersUtils.getShortHash(this.props.meta.first_block)}</Link>
      );
    }

    const renderAddressBadge = () => {
      return (
        <span className='address-badge'> {t`Your address`} </span>
      )
    }

    const isNFT = (uid) => {
      return helpers.isTokenNFT(uid, this.props.tokenMetadata);
    }

    const renderBalanceData = (balance) => {
      return Object.keys(balance).map((token) => {
        const tokenSymbol = this.getSymbol(token);
        if (balance[token] > 0) {
          return (
            <div key={token}>
              <span className='received-value'><SpanFmt>{t`**${tokenSymbol}:** Received`}</SpanFmt> <i className='fa ml-2 mr-2 fa-long-arrow-down'></i> {helpers.renderValue(balance[token], isNFT(token))}</span>
            </div>
          )
        } else {
          return (
            <div key={token}>
              <span className='sent-value'><SpanFmt>{t`**${tokenSymbol}:** Sent`}</SpanFmt> <i className='fa ml-2 mr-2 fa-long-arrow-up'></i> {helpers.renderValue(balance[token], isNFT(token))}</span>
            </div>
          );
        }
      });
    }

    const renderBalance = () => {
      if (Object.keys(this.state.balance).length === 0) return null;

      // If all balances are 0, we return null
      let only0 = true;
      for (const key in this.state.balance) {
        if (this.state.balance[key] !== 0) {
          only0 = false;
          break;
        }
      }

      if (only0) return null;

      return (
        <div className="d-flex flex-column common-div bordered-wrapper mt-3">
          <div><label>{t`Balance:`}</label></div>
          {renderBalanceData(this.state.balance)}
        </div>
      );
    }

    const renderFirstBlockDiv = () => {
      return (
        <div>
          <label>{t`First block:`}</label>
          {this.props.meta.first_block && renderFirstBlock()}
        </div>
      );
    }

    const renderAccWeightDiv = () => {
      return (
        <div>
          <label>{t`Accumulated weight:`}</label>
          {renderAccumulatedWeight()}
        </div>
      );
    }

    const renderConfirmationLevel = () => {
      const renderConfirmationLevelMessage = () => {
        if (this.props.confirmationDataError) {
          const onRetryClick = (e) => {
            e.preventDefault();
            this.props.confirmationDataRetry();
          };
          return (
            <>
              {t`Error retrieving confirmation level...`}&nbsp;
              <a href="true" onClick={onRetryClick}>{t`try again`}</a>
            </>
          )
        }

        if (this.props.confirmationData) {
          return `${hathorLib.helpersUtils.roundFloat(this.props.confirmationData.confirmation_level * 100)}%`;
        }

        return t`Retrieving confirmation level data...`;
      };

      return (
        <div>
          <label>{t`Confirmation level:`}</label>
          {renderConfirmationLevelMessage()}
        </div>
      );
    };

    const isNFTCreation = () => {
      if (this.props.transaction.version !== hathorLib.constants.CREATE_TOKEN_TX_VERSION) {
        return false;
      }

      const createdToken = this.props.transaction.tokens[0];
      return helpers.isTokenNFT(createdToken.uid, this.props.tokenMetadata);
    }

    const loadTxData = () => {
      return (
        <div className="tx-data-wrapper">
          {this.props.showConflicts ? renderConflicts() : ''}
          <div><label>{hathorLib.transactionUtils.isBlock(this.props.transaction) ? t`Block` : t`Transaction`} ID:</label> {this.props.transaction.hash}</div>
          {renderBalance()}
          <div className="d-flex flex-row align-items-start mt-3 mb-3">
            <div className="d-flex flex-column align-items-start common-div bordered-wrapper mr-3">
              <div><label>{t`Type:`}</label> {hathorLib.transactionUtils.getTxType(this.props.transaction)} {isNFTCreation() && '(NFT)'}</div>
              <div><label>{t`Time:`}</label> {hathorLib.dateFormatter.parseTimestamp(this.props.transaction.timestamp)}</div>
              <div><label>{t`Nonce:`}</label> {this.props.transaction.nonce}</div>
              <div><label>{t`Weight:`}</label> {hathorLib.helpersUtils.roundFloat(this.props.transaction.weight)}</div>
              {!hathorLib.transactionUtils.isBlock(this.props.transaction) && renderFirstBlockDiv()}
            </div>
            <div className="d-flex flex-column align-items-center important-div bordered-wrapper">
              {hathorLib.transactionUtils.isBlock(this.props.transaction) && renderHeight()}
              {hathorLib.transactionUtils.isBlock(this.props.transaction) && renderScore()}
              {!hathorLib.transactionUtils.isBlock(this.props.transaction) && renderAccWeightDiv()}
              {!hathorLib.transactionUtils.isBlock(this.props.transaction) && renderConfirmationLevel()}
            </div>
          </div>
          <div className="d-flex flex-row align-items-start mb-3">
            <div className="f-flex flex-column align-items-start common-div bordered-wrapper mr-3">
              <div><label>{t`Inputs:`}</label></div>
              {renderInputs(this.props.transaction.inputs)}
            </div>
            <div className="d-flex flex-column align-items-center common-div bordered-wrapper">
              <div><label>{t`Outputs:`}</label></div>
              {renderOutputs(this.props.transaction.outputs)}
            </div>
          </div>
          {this.state.tokens.length > 0 && renderTokenList()}
          <div className="d-flex flex-row align-items-start mb-3">
            <div className="f-flex flex-column align-items-start common-div bordered-wrapper mr-3">
              <div><label>{t`Parents:`}</label></div>
              {renderDivList(this.props.transaction.parents)}
            </div>
            <div className="f-flex flex-column align-items-start common-div bordered-wrapper mr-3">
              <div><label>{t`Children:`} </label>{this.props.meta.children.length > 0 && <a href="true" className="ml-1" onClick={(e) => this.toggleChildren(e)}>{this.state.children ? t`Click to hide` : t`Click to show`}</a>}</div>
              {this.state.children && renderDivList(this.props.meta.children)}
            </div>
          </div>
          <div className="d-flex flex-row align-items-start mb-3 common-div bordered-wrapper">
            {renderGraph(
              t`Verification neighbors`,
              'verification',
              this.state.graphvizVerificationRequestFailed,
              this.state.graphvizVerificationRequestLoading,
              this.queryVerificationData,
            )}
          </div>
          <div className="d-flex flex-row align-items-start mb-3 common-div bordered-wrapper">
            {renderGraph(
              t`Funds neighbors`,
              'funds',
              this.state.graphvizFundsRequestFailed,
              this.state.graphvizFundsRequestLoading,
              this.queryFundsData,
            )}
          </div>
          <div className="d-flex flex-row align-items-start mb-3 common-div bordered-wrapper">
            {this.props.showRaw ? showRawWrapper() : null}
          </div>
        </div>
      );
    }

    const showRawWrapper = () => {
      return (
        <div className="mt-3 mb-3">
          <a href="true" onClick={(e) => this.toggleRaw(e)}>{this.state.raw ? t`Hide raw transaction` : t`Show raw transaction`}</a>
          {this.state.raw ?
            <CopyToClipboard text={this.props.transaction.raw} onCopy={this.copied}>
              <i className="fa fa-clone pointer ml-1" title={t`Copy raw tx to clipboard`}></i>
            </CopyToClipboard>
          : null}
          <p className="mt-3" ref="rawTx" style={{display: 'none'}}>{this.props.transaction.raw}</p>
        </div>
      );
    }

    return (
      <div>
        {loadTxData()}
        <HathorAlert ref={this.alertCopiedRef} text={t`Copied to clipboard!`} type="success" />
      </div>
    );
  }
}

export default connect(mapStateToProps, mapDispatchToProps)(TxData);
