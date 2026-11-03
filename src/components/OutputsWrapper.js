/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React from 'react';
import { t } from 'ttag';
import $ from 'jquery';
import _ from 'lodash';
import InputNumber from './InputNumber';
import LOCAL_STORE from '../storage';
import { connect } from 'react-redux';
import { THOTH_ID_RESOLUTION_DEBOUNCE } from '../constants';
import {
  THOTH_ID_ERROR,
  isThothIdEnabled,
  isThothIdName,
  normalizeThothName,
  resolveThothName,
} from '../utils/thothId';


const mapStateToProps = (state) => ({
  decimalPlaces: state.serverInfo.decimalPlaces,
  network: state.serverInfo.network,
});

/** Status of the thoth.id name typed in the address field. */
export const NAME_RESOLUTION_STATUS = {
  /** The field holds an address, or nothing that looks like a name. */
  NONE: 'none',
  LOADING: 'loading',
  RESOLVED: 'resolved',
  ERROR: 'error',
};


/**
 * Component that wraps the outputs of a token in the Send Tokens screen
 *
 * The address field also accepts a thoth.id name (`alice.htr`), which is
 * resolved to an address against the naming service's nano contracts. Only the
 * resolved address is ever sent: the typed name is shown next to it so the user
 * can check where the tokens are actually going.
 *
 * @memberof Components
 */
class OutputsWrapper extends React.Component {
  constructor(props) {
    super(props);

    this.address = React.createRef();
    this.value = null;
    this.timelock = React.createRef();
    this.timelockCheckbox = React.createRef();
    this.uniqueID = _.uniqueId()

    props.setRef(this);

    /**
     * Resolutions are answered out of order when the user keeps typing, so each
     * one carries a sequence number and only the newest is allowed to land.
     */
    this.resolutionSeq = 0;

    /**
     * status {string} One of NAME_RESOLUTION_STATUS
     * name {string} The name the current status refers to
     * address {string|null} Address the name resolved to
     * error {string|null} Message to show when the resolution failed
     */
    this.state = {
      status: NAME_RESOLUTION_STATUS.NONE,
      name: '',
      address: null,
      error: null,
    };
  }

  componentDidMount = () => {
    this.debouncedResolveName = _.debounce(this.resolveName, THOTH_ID_RESOLUTION_DEBOUNCE);
  }

  componentWillUnmount = () => {
    // Nothing typed after unmount should land on a dead component
    this.resolutionSeq += 1;
    if (this.debouncedResolveName) {
      this.debouncedResolveName.cancel();
    }
  }

  /**
   * The address to send to: what was typed when it is an address, and what the
   * name resolved to when it is a thoth.id name.
   *
   * @returns {string|null} `null` when a name is typed but not resolved yet,
   *                        which means the output is not ready to be sent
   */
  getAddress = () => {
    const typed = this.getTypedValue();
    if (!typed || !this.isNameField(typed)) {
      return typed;
    }

    const { status, name, address } = this.state;
    if (status === NAME_RESOLUTION_STATUS.RESOLVED && name === normalizeThothName(typed)) {
      return address;
    }
    return null;
  }

  /**
   * The raw text typed in the address field, without spaces.
   *
   * @returns {string}
   */
  getTypedValue = () => {
    return (this.address.current?.value || '').replace(/\s/g, '');
  }

  /**
   * The thoth.id name typed in this output, when there is one resolved.
   *
   * @returns {string|null}
   */
  getResolvedName = () => {
    const typed = this.getTypedValue();
    if (!typed || !this.isNameField(typed)) {
      return null;
    }
    const { status, name } = this.state;
    return status === NAME_RESOLUTION_STATUS.RESOLVED && name === normalizeThothName(typed)
      ? name
      : null;
  }

  /**
   * Whether the typed text should be treated as a name instead of an address.
   * Off the supported networks nothing is a name, so the text goes through as
   * an address and fails the usual address validation.
   */
  isNameField = (value) => {
    return isThothIdEnabled(this.props.network) && isThothIdName(value);
  }

  /**
   * Called on every keystroke in the address field: schedules the resolution of
   * a name, or clears any previous resolution when it is not one.
   */
  handleAddressChange = () => {
    const typed = this.getTypedValue();

    if (this.isNameField(typed)) {
      const name = normalizeThothName(typed);
      // An address already found for this exact name stays on screen, so
      // retyping the same text does not flash the spinner over it
      const alreadyResolved = this.state.status === NAME_RESOLUTION_STATUS.RESOLVED
        && this.state.name === name;
      if (!alreadyResolved) {
        this.setState({ status: NAME_RESOLUTION_STATUS.LOADING, name, address: null, error: null });
      }
      this.debouncedResolveName(name);
    } else {
      // Invalidates any resolution still in flight for a previous name
      this.resolutionSeq += 1;
      this.debouncedResolveName?.cancel();
      if (this.state.status !== NAME_RESOLUTION_STATUS.NONE) {
        this.setState({ status: NAME_RESOLUTION_STATUS.NONE, name: '', address: null, error: null });
      }
    }

    this.notifyChange();
  }

  /**
   * Resolves a name and stores the outcome, unless the user typed something
   * else in the meantime.
   *
   * @param {string} name Normalized thoth.id name
   */
  resolveName = async (name) => {
    const seq = ++this.resolutionSeq;

    try {
      const { address } = await resolveThothName(name, { network: this.props.network });
      if (seq !== this.resolutionSeq) return;
      this.setState({ status: NAME_RESOLUTION_STATUS.RESOLVED, name, address, error: null });
    } catch (e) {
      if (seq !== this.resolutionSeq) return;
      this.setState({
        status: NAME_RESOLUTION_STATUS.ERROR,
        name,
        address: null,
        error: this.getErrorMessage(e, name),
      });
    }

    // The resolved address changes the outputs, so the fee has to be recalculated
    this.notifyChange();
  }

  /**
   * User facing message for a failed resolution.
   *
   * @param {Error} e Error thrown by the resolution
   * @param {string} name Name being resolved
   */
  getErrorMessage = (e, name) => {
    switch (e.code) {
      case THOTH_ID_ERROR.NAME_NOT_FOUND:
        return t`${name} is not registered.`;
      case THOTH_ID_ERROR.UNKNOWN_DOMAIN:
        return t`There is no thoth.id registry for this domain on the connected network.`;
      case THOTH_ID_ERROR.UNSUPPORTED_NETWORK:
        return t`thoth.id names can only be used on testnet.`;
      case THOTH_ID_ERROR.INVALID_ADDRESS:
        return t`${name} resolved to an invalid address.`;
      default:
        return t`Could not resolve ${name}. Please check your connection and try again.`;
    }
  }

  notifyChange = () => {
    if (this.props.onValueChange) {
      this.props.onValueChange();
    }
  }

  /**
   * Handles the click on the timelock checkbox of each output to show/hide the timelock field
   *
   * @param {Object} event Event emitted when user clicks on the checkbox
   */
  handleCheckboxTimelockChange = (e) => {
    const value = e.target.checked;
    if (value) {
      $(this.timelock.current).show(400);
    } else {
      $(this.timelock.current).hide(400);
    }
  }

  render = () => {
    const nameResolutionEnabled = isThothIdEnabled(this.props.network);

    const renderInputNumber = () => {
      const classNames = "form-control output-value col-2";
      return <InputNumber
        key={this.props.isNFT ? "nft-value" : "value"}
        onValueChange={(value) => {
          this.value = value;
          if (this.props.onValueChange) {
            this.props.onValueChange();
          }
        }}
        className={classNames}
        isNFT={this.props.isNFT}
      />;
    }

    /**
     * Feedback line below the address field, shown only while a thoth.id name
     * is typed there.
     */
    const renderNameResolution = () => {
      const { status, name, address, error } = this.state;

      if (status === NAME_RESOLUTION_STATUS.LOADING) {
        return (
          <div className="thoth-name-resolution text-muted">
            <i className="fa fa-spinner fa-spin mr-2" />
            {t`Resolving ${name}...`}
          </div>
        );
      }

      if (status === NAME_RESOLUTION_STATUS.RESOLVED) {
        return (
          <div className="thoth-name-resolution text-success">
            <i className="fa fa-check-circle mr-2" />
            <span>{name}</span>
            <i className="fa fa-long-arrow-right mx-2" />
            <span className="text-monospace">{address}</span>
          </div>
        );
      }

      if (status === NAME_RESOLUTION_STATUS.ERROR) {
        return (
          <div className="thoth-name-resolution text-danger">
            <i className="fa fa-exclamation-circle mr-2" />
            {error}
          </div>
        );
      }

      return null;
    }

    return (
      <div className="mb-3">
        <div className="input-group">
          <input
            type="text"
            ref={this.address}
            placeholder={nameResolutionEnabled ? t`Address or name (e.g. alice.htr)` : t`Address`}
            className="form-control output-address col-5"
            onChange={this.handleAddressChange}
          />
          {renderInputNumber()}
          <div className="form-check mr-2 d-flex flex-column justify-content-center">
            <input className="form-check-input mt-0 has-timelock" type="checkbox"
              ref={this.timelockCheckbox} onChange={this.handleCheckboxTimelockChange} id={this.uniqueID}
              title={LOCAL_STORE.isHardwareWallet() ? t`This feature is disabled for hardware wallet` : t`Timelock`}
              disabled={LOCAL_STORE.isHardwareWallet() ? true : null}/>
            <label className="form-check-label" htmlFor={this.uniqueID}>
              {t`Time lock`}
            </label>
          </div>
          <input type="datetime-local" placeholder={t`Date and time in GMT`} step="1"
            className="form-control output-timelock col-3" style={{display: 'none'}} ref={this.timelock}
            disabled={LOCAL_STORE.isHardwareWallet() ? true : null}/>
          {this.props.outputsCount > 1 && (
            <button
              type="button"
              className="btn btn-link text-muted p-0 ml-2"
              style={{ fontSize: '18px', lineHeight: 1 }}
              onClick={() => this.props.removeOutput(this.props.index)}
              title={t`Remove output`}
            >
              <i className="fa fa-times" />
            </button>
          )}
        </div>
        {renderNameResolution()}
      </div>
    );
  }
}

export default connect(mapStateToProps)(OutputsWrapper);
