/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React, { useRef, useState } from 'react';
import { t } from 'ttag'
import BackButton from '../../components/BackButton';
import colors from '../../index.module.scss';
import hathorLib from '@hathor/wallet-lib';
import ReactLoading from 'react-loading';
import { useNavigate } from 'react-router-dom';

/**
 * Select blueprint, fetch information and show it
 *
 * @memberof Screens
 */
function NanoContractSelectBlueprint() {

  const blueprintIdRef = useRef(null);
  const formSelectBlueprintRef = useRef(null);

  const navigate = useNavigate();

  // fetching {boolean} If it's fetching blueprint information data, to show loading
  const [fetching, setFetching] = useState(false);
  // blueprintInformation {Object} Blueprint information data from full node API
  const [blueprintInformation, setBlueprintInformation] = useState(null);
  // errorMessage {string} Message to show when error happens on the form
  const [errorMessage, setErrorMessage] = useState('');

  const onSelectBlueprint = async () => {
    setErrorMessage('');
    const isValid = formSelectBlueprintRef.current.checkValidity();
    
    if (!isValid) {
      formSelectBlueprintRef.current.classList.add('was-validated')
      return;
    }

    const blueprintId = blueprintIdRef.current.value;
    try {
      setFetching(true);
      const data = await hathorLib.ncApi.getBlueprintInformation(blueprintId);
      setBlueprintInformation(data);
    } catch (e) {
      setErrorMessage(e.message);
    } finally {
      setFetching(false);
    }
  }

  const onSelectNewBlueprint = () => {
    blueprintIdRef.current.value = '';
    setBlueprintInformation(null);
  }

  const onConfirmBlueprintSelection = () => {
    navigate('/nano_contract/execute_method/', {
      state: {
        blueprintInformation,
        method: hathorLib.constants.NANO_CONTRACTS_INITIALIZE_METHOD
      },
    });
  }

  const renderButtons = () => {
    if (!blueprintInformation) {
      return (
        <button type="button" className="btn btn-hathor mr-3" onClick={onSelectBlueprint}>{t`Fetch Blueprint Information`}</button>
      );
    } else {
      return (
        <div className="mb-3">
          <button type="button" className="mt-3 mr-3 btn btn-secondary" onClick={onSelectNewBlueprint}>{t`Select New Blueprint`}</button>
          <button type="button" className="mt-3 btn btn-hathor" onClick={onConfirmBlueprintSelection}>{t`Confirm`}</button>
        </div>
      );
    }
  }

  const renderBlueprintAttributes = () => {
    return (
      <div className="table-responsive">
        <table className="table table-striped table-bordered" id="attributes-table">
          <thead>
            <tr>
              <th className="d-lg-table-cell">{t`Name`}</th>
              <th className="d-lg-table-cell">{t`Type`}</th>
            </tr>
          </thead>
          <tbody>
            {renderAttributes()}
          </tbody>
        </table>
      </div>
    );
  }

  const renderAttributes = () => {
    return Object.entries(blueprintInformation.attributes).map(([name, type]) => {
      return (
        <tr key={name}>
          <td>{name}</td>
          <td>{type}</td>
        </tr>
      );
    });
  }

  const renderBlueprintMethods = (key, header) => {
    return (
      <div className="table-responsive mt-5">
        <table className="table table-striped table-bordered" id={`methods-table-${key}`}>
          <thead>
            <tr>
              <th className="d-lg-table-cell">{header}</th>
            </tr>
          </thead>
          <tbody>
            {renderMethods(key)}
          </tbody>
        </table>
      </div>
    );
  }

  const renderMethods = (key) => {
    return Object.entries(blueprintInformation[key]).map(([name, detail]) => {
      return (
        <tr key={name}>
          <td>{renderMethodDetails(name, detail.args, detail.return_type)}</td>
        </tr>
      );
    });
  }

  const renderMethodDetails = (name, args, returnType) => {
    const parameters = args.map(arg =>
      `${arg.name}: ${arg.type}`
    );
    return `${name}(${parameters.join(', ')}): ${returnType === 'null' ? 'None' : returnType}`;
  }

  const renderBlueprintInformation = () => {
    const blueprintId = blueprintIdRef.current.value;
    return (
      <div>
        <p><strong>{t`ID: `}</strong>{blueprintId}</p>
        <p><strong>{t`Name: `}</strong>{blueprintInformation.name}</p>
        <h4 className="mt-5 mb-4">{t`Attributes`}</h4>
        { renderBlueprintAttributes() }
        { renderBlueprintMethods('public_methods', t`Public Methods`) }
        { renderBlueprintMethods('view_methods', t`View Methods`) }
      </div>
    );
  }

  return (
    <div className="content-wrapper">
      <BackButton />
      <h4 className="my-4">{t`Select Blueprint`}</h4>
      <div>
        <form ref={formSelectBlueprintRef} id="formSelectBlueprint">
          <div className="row">
            <div className="form-group col-8">
              <label>{t`Blueprint ID`}</label>
              <input required autoFocus ref={blueprintIdRef} type="text" className="form-control" disabled={blueprintInformation !== null} />
            </div>
          </div>
          <div className="d-flex">
            {renderButtons()}
            {fetching && <ReactLoading type='spin' color={colors.purpleHathor} width={32} height={32} />}
          </div>
          {blueprintInformation && renderBlueprintInformation()}
          <p className="text-danger mt-3">{errorMessage}</p>
        </form>
      </div>
    </div>
  );
}

export default NanoContractSelectBlueprint;
