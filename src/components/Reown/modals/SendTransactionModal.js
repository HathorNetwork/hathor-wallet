/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React from 'react';
import { t } from 'ttag';
import { useSelector } from 'react-redux';

export function SendTransactionModal({ data, firstAddress, onAccept, onReject }) {
  console.log('DATA: ', data);
  const { tokenMetadata } = useSelector((state) => ({
    tokenMetadata: state.tokenMetadata,
  }));

  const renderInputs = () => {
    if (!data?.data?.inputs || data.data.inputs.length === 0) {
      return null;
    }

    return (
      <div className="mb-4">
        <h6 className="mb-3">{t`Inputs`}</h6>
        {data.data.inputs.map((input, index) => (
          <div key={index} className="p-3 bg-light rounded mb-2">
            <div>
              <div className="d-flex justify-content-between align-items-start mb-2">
                <div>
                  <strong>{t`Input ${index + 1}`}</strong>
                </div>
                <div>
                  {input.value.toString()} {input.token || 'HTR'}
                </div>
              </div>
              <div className="mb-2">
                <code style={{ color: '#8C48F6' }}>{input.tx_id}</code>
                <code className="text-muted"> ({input.index})</code>
              </div>
              <div className="d-flex align-items-center">
                <code className="text-muted flex-grow-1">{input.address}</code>
                <button 
                  className="btn btn-link btn-sm p-0 ml-2" 
                  onClick={() => navigator.clipboard.writeText(input.address)}
                >
                  <i className="fa fa-copy"></i>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderOutputs = () => {
    if (!data?.data?.outputs || data.data.outputs.length === 0) {
      return null;
    }

    return (
      <div className="mb-4">
        <h6 className="mb-3">{t`Outputs`}</h6>
        {data.data.outputs.map((output, index) => (
          <div key={index} className="p-3 bg-light rounded mb-2">
            <div className="d-flex justify-content-between align-items-start">
              <div>
                <strong>{t`Output ${index + 1}`}</strong>
              </div>
              <div>
                {output.value} {output.token || 'HTR'}
              </div>
            </div>
            <div className="d-flex align-items-center mt-2">
              <code className="text-muted flex-grow-1">{output.address}</code>
              <button 
                className="btn btn-link btn-sm p-0 ml-2" 
                onClick={() => navigator.clipboard.writeText(output.address)}
              >
                <i className="fa fa-copy"></i>
              </button>
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <>
      <div className="modal-header border-0">
        <h5 className="modal-title">{t`NEW TRANSACTION`}</h5>
        <button type="button" className="close" data-dismiss="modal" aria-label="Close">
          <span aria-hidden="true">&times;</span>
        </button>
      </div>
      <div className="modal-body">
        <div className="mb-4">
          <h6 className="mb-1">{data.dapp.proposer}</h6>
          <small className="text-muted">{data.dapp.url}</small>
        </div>

        {renderInputs()}
        {renderOutputs()}

        {data.data.changeAddress && (
          <div>
            <h6 className="mb-3">{t`Change Address`}</h6>
            <div className="p-3 bg-light rounded">
              <div className="d-flex align-items-center">
                <code className="text-muted flex-grow-1">{data.data.changeAddress}</code>
                <button 
                  className="btn btn-link btn-sm p-0 ml-2" 
                  onClick={() => navigator.clipboard.writeText(data.data.changeAddress)}
                >
                  <i className="fa fa-copy"></i>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
      <div className="modal-footer border-0">
        <button type="button" className="btn btn-lg btn-secondary" onClick={onReject} data-dismiss="modal">{t`Reject`}</button>
        <button type="button" className="btn btn-lg btn-hathor" onClick={onAccept}>{t`Accept Transaction`}</button>
      </div>
    </>
  );
} 
