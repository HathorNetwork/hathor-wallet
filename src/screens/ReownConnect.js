/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React, { useState } from 'react';
import { t } from 'ttag';
import { useDispatch, useSelector } from 'react-redux';
import { types } from '../actions';
import BackButton from '../components/BackButton';

function ReownConnect() {
  const [uri, setUri] = useState('');
  const [showNewConnectionForm, setShowNewConnectionForm] = useState(false);
  const dispatch = useDispatch();
  const { connectionFailed, sessions } = useSelector(state => ({
    connectionFailed: state.reown.connectionFailed,
    sessions: state.reown.sessions || {},
  }));

  const handleSubmit = (e) => {
    e.preventDefault();
    dispatch({ type: types.REOWN_URI_INPUTTED, payload: uri });
  };

  const handleDisconnect = (sessionId) => {
    dispatch({ type: types.REOWN_CANCEL_SESSION, payload: { id: sessionId } });
  };

  const renderSession = (session, sessionId) => {
    const metadata = session.peer.metadata;
    return (
      <div key={sessionId} className="card mb-3">
        <div className="card-body d-flex justify-content-between align-items-center">
          <div>
            {metadata.icons && metadata.icons[0] && (
              <img 
                src={metadata.icons[0]} 
                alt={metadata.name} 
                className="mr-3" 
                style={{ width: 32, height: 32, borderRadius: '50%' }}
              />
            )}
            <strong className="mr-2">{metadata.name}</strong>
            <small className="text-muted">{metadata.url}</small>
          </div>
          <button 
            className="btn btn-outline-danger" 
            onClick={() => handleDisconnect(sessionId)}
          >
            {t`Disconnect`}
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="content-wrapper">
      <BackButton />
      <div className="content">
        <h3 className="mb-4">{t`Connected dApps`}</h3>

        <div className="card mb-4">
          <div className="card-body">
            {!showNewConnectionForm ? (
              <div className="d-flex justify-content-between align-items-center">
                <h4 className="mb-0">{t`New Connection`}</h4>
                <button 
                  className="btn btn-hathor" 
                  onClick={() => setShowNewConnectionForm(true)}
                >
                  {t`Add New Connection`}
                </button>
              </div>
            ) : (
              <>
                <h4>{t`New Connection`}</h4>
                <form onSubmit={handleSubmit}>
                  <div className="form-group">
                    <label htmlFor="uri">{t`Enter dApp URI`}</label>
                    <input
                      type="text"
                      className="form-control"
                      id="uri"
                      value={uri}
                      onChange={(e) => setUri(e.target.value)}
                      placeholder={t`wc:...`}
                    />
                  </div>
                  {connectionFailed && (
                    <div className="alert alert-danger" role="alert">
                      {t`Failed to connect. Please check the URI and try again.`}
                    </div>
                  )}
                  <div className="d-flex justify-content-end">
                    <button 
                      type="button" 
                      className="btn btn-light mr-2"
                      onClick={() => {
                        setShowNewConnectionForm(false);
                        setUri('');
                      }}
                    >
                      {t`Cancel`}
                    </button>
                    <button type="submit" className="btn btn-hathor">
                      {t`Connect`}
                    </button>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>

        {Object.keys(sessions).length === 0 ? (
          <div className="alert alert-info">
            {t`No dApps connected. Click "Add New Connection" to connect to a dApp.`}
          </div>
        ) : (
          Object.entries(sessions).map(([sessionId, session]) => 
            renderSession(session, sessionId)
          )
        )}
      </div>
    </div>
  );
}

export default ReownConnect; 
