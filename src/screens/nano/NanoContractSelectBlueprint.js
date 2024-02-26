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
import { useHistory } from 'react-router-dom';

/**
 * Select blueprint, fetch information and show it
 *
 * @memberof Screens
 */
function NanoContractSelectBlueprint() {

  const blueprintIdRef = useRef(null);
  const formSelectBlueprintRef = useRef(null);

  const history = useHistory();

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
      // TODO Error handling not working well
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
    history.push({
      pathname: '/nano_contract/execute_method/',
      state: {
        blueprintInformation,
        method: 'initialize'
      },
    });
  }

  const renderButtons = () => {
    if (!blueprintInformation) {
      return (
        <button type="button" className="mt-3 btn btn-hathor" onClick={onSelectBlueprint}>Confirm</button>
      );
    } else {
      return (
        <div>
          <button type="button" className="mt-3 mr-3 btn btn-secondary" onClick={onSelectNewBlueprint}>Select New Blueprint</button>
          <button type="button" className="mt-3 btn btn-hathor" onClick={onConfirmBlueprintSelection}>Confirm</button>
        </div>
      );
    }
  }

  const renderList = (elements) => {
    return elements.map(el => 
      <li key={el}>{el}</li>
    );
  }

  const renderBlueprintInformation = () => {
    return (
      <div>
        <div>
          <label className="mr-2">Blueprint ID:</label><span>{blueprintInformation.id}</span>
        </div>
        <div>
          <label className="mr-2">Name: </label><span>{blueprintInformation.name}</span>
        </div>
        <div>
          <label>Attributes:</label>
          <ul>
            {renderList(Object.keys(blueprintInformation.attributes))}
          </ul>
        </div>
        <div>
          <label>Methods:</label>
          <ul>
            {renderList(Object.keys(blueprintInformation.public_methods))}
          </ul>
        </div>
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
            <div className="form-group col-6">
              <label>{t`Blueprint ID`}</label>
              <input required autoFocus ref={blueprintIdRef} type="text" className="form-control" />
            </div>
          </div>
          {blueprintInformation && renderBlueprintInformation()}
          {fetching && <div className="d-flex flex-row align-items-center"><span className="mr-2"> Loading blueprint information... </span> <ReactLoading type='spin' color={colors.purpleHathor} width={32} height={32} /></div>}
          {renderButtons()}
          <p className="text-danger mt-3">{errorMessage}</p>
        </form>
      </div>
    </div>
  );
}

export default NanoContractSelectBlueprint;
